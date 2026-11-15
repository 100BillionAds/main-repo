import { DomainError } from '@/domain/errors';
import { getLlmClient } from '@/lib/llm';
import prompt from '@/domain/ai/prompts/requestDraft.v1';
import { normalizeDraftInput, parseDraft } from '@/domain/ai/requestDraft';
import * as defaultUsage from '@/domain/ai/aiUsageRepository';

/**
 * 의뢰서 초안 작성 (응용 서비스)
 *
 *   1. 입력 검증           — LLM 을 부르기 전에 걸러낸다 (돈이 드는 호출이다)
 *   2. 하루 한도 확인      — 사용자별 최근 24시간 호출 수
 *   3. LLM 스트리밍 호출   — 글자가 나오는 대로 흘려보낸다
 *   4. 사용 기록           — 성공/실패, 토큰 수, 걸린 시간
 */
const DEFAULT_DAILY_LIMIT = 20;

export function getDailyLimit() {
  const value = Number(process.env.LLM_DAILY_LIMIT_PER_USER);
  return Number.isInteger(value) && value >= 0 && value <= 10000 ? value : DEFAULT_DAILY_LIMIT;
}

/**
 * 검증·한도 확인까지 마치고 스트림을 돌려준다.
 * 여기서 던지는 오류(입력 오류, 한도 초과)는 스트림이 시작되기 전이므로 일반 JSON 오류 응답으로 보낼 수 있다.
 *
 * @returns {Promise<{ stream: AsyncGenerator<{type:'delta',text:string}|{type:'done',title:string,description:string}> }>}
 */
export async function startRequestDraft({ userId, input, signal, llm = getLlmClient(), usage = defaultUsage, now = Date.now }) {
  const normalized = normalizeDraftInput(input);

  // 먼저 기록하고 나서 센다. "세고 나서 기록"하면 동시에 온 요청들이 모두 한도 안이라고 판단해 통과한다.
  // 이 순서에서는 동시 요청이 서로의 기록을 보게 되어, 한도를 넘겨 통과하는 일이 없다.
  const usageId = await usage.start({
    userId,
    feature: prompt.feature,
    promptVersion: prompt.version,
    inputChars: normalized.brief.length,
  });

  const limit = getDailyLimit();
  if ((await usage.countRecent(userId)) > limit) {
    await usage.markRejected(usageId);
    throw new DomainError(`AI 초안 작성은 하루 ${limit}회까지 쓸 수 있습니다. 내일 다시 시도해주세요.`, {
      status: 429,
      code: 'AI_QUOTA_EXCEEDED',
    });
  }

  async function* stream() {
    const startedAt = now();
    let text = '';
    let finished = false;

    try {
      const chunks = llm.stream({
        system: prompt.system,
        messages: prompt.buildMessages(normalized),
        maxTokens: prompt.maxTokens,
        temperature: prompt.temperature,
        signal,
      });

      for await (const chunk of chunks) {
        if (chunk.type === 'text') {
          text += chunk.text;
          yield { type: 'delta', text: chunk.text };
        } else if (chunk.type === 'done') {
          await usage.markSuccess(usageId, {
            provider: chunk.provider,
            model: chunk.model,
            inputTokens: chunk.usage?.inputTokens,
            outputTokens: chunk.usage?.outputTokens,
            latencyMs: now() - startedAt,
          });
          finished = true;
        }
      }

      yield { type: 'done', ...parseDraft(text) };
    } catch (error) {
      if (!finished) {
        await usage
          .markError(usageId, { errorCode: error?.code || error?.name, latencyMs: now() - startedAt })
          .catch(() => {});
        finished = true;
      }
      throw error;
    } finally {
      // 사용자가 중간에 페이지를 떠나면 반복이 끊기고 여기로 온다. pending 으로 남기지 않는다.
      if (!finished) {
        await usage.markError(usageId, { errorCode: 'ABORTED', latencyMs: now() - startedAt }).catch(() => {});
      }
    }
  }

  return { stream: stream() };
}
