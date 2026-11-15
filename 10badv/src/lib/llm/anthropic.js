import { readSse } from '@/lib/sse';
import { LlmError, errorFromFetch, errorFromStatus } from '@/lib/llm/errors';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

/**
 * Anthropic(Claude) 제공자. Messages API 를 스트리밍으로 호출한다.
 * SDK 없이 fetch 로 직접 호출한다 — 의존성을 늘리지 않고, 무엇이 오가는지 그대로 보인다.
 */
export function createAnthropicProvider({ apiKey, model, fetchImpl = fetch }) {
  if (!apiKey) {
    throw new LlmError('ANTHROPIC_API_KEY 가 설정되지 않았습니다.', { code: 'CONFIG', provider: 'anthropic' });
  }

  return {
    name: 'anthropic',
    model,

    async *stream({ system, messages, maxTokens = 1024, temperature, signal }) {
      let response;
      try {
        response = await fetchImpl(ENDPOINT, {
          method: 'POST',
          signal,
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': API_VERSION,
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            stream: true,
            ...(system ? { system } : {}),
            ...(temperature !== undefined ? { temperature } : {}),
            messages,
          }),
        });
      } catch (error) {
        throw errorFromFetch('anthropic', error);
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw errorFromStatus('anthropic', response.status, body?.error?.type);
      }

      const usage = { inputTokens: 0, outputTokens: 0 };
      try {
        for await (const { event, data } of readSse(response)) {
          if (event === 'ping') continue;
          const payload = JSON.parse(data);

          if (event === 'message_start') {
            usage.inputTokens = payload.message?.usage?.input_tokens ?? 0;
          } else if (event === 'content_block_delta' && payload.delta?.type === 'text_delta') {
            yield { type: 'text', text: payload.delta.text };
          } else if (event === 'message_delta') {
            // output_tokens 는 누적값으로 온다
            usage.outputTokens = payload.usage?.output_tokens ?? usage.outputTokens;
          } else if (event === 'error') {
            const overloaded = payload.error?.type === 'overloaded_error';
            throw new LlmError(`anthropic 스트림 오류: ${payload.error?.type}`, {
              code: overloaded ? 'UNAVAILABLE' : 'BAD_REQUEST',
              provider: 'anthropic',
              retryable: overloaded,
            });
          }
          // 모르는 이벤트는 무시한다 (제공자가 새 이벤트를 추가해도 깨지지 않게)
        }
      } catch (error) {
        throw errorFromFetch('anthropic', error);
      }

      yield { type: 'done', usage, model, provider: 'anthropic' };
    },
  };
}
