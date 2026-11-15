import { readSse } from '@/lib/sse';
import { LlmError, errorFromFetch, errorFromStatus } from '@/lib/llm/errors';

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

/**
 * OpenAI 제공자. Chat Completions API 를 스트리밍으로 호출한다.
 * Anthropic 과 요청·응답 모양이 다르지만(시스템 프롬프트 위치, 토큰 수 필드, 이벤트 형식),
 * 밖에서 보면 같은 stream() 하나다.
 */
export function createOpenAiProvider({ apiKey, model, fetchImpl = fetch }) {
  if (!apiKey) {
    throw new LlmError('OPENAI_API_KEY 가 설정되지 않았습니다.', { code: 'CONFIG', provider: 'openai' });
  }
  if (!model) {
    throw new LlmError('OpenAI 를 쓰려면 모델 이름(LLM_MODEL 또는 LLM_FALLBACK_MODEL)을 지정해야 합니다.', {
      code: 'CONFIG',
      provider: 'openai',
    });
  }

  return {
    name: 'openai',
    model,

    async *stream({ system, messages, maxTokens = 1024, temperature, signal }) {
      let response;
      try {
        response = await fetchImpl(ENDPOINT, {
          method: 'POST',
          signal,
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            max_completion_tokens: maxTokens,
            stream: true,
            stream_options: { include_usage: true },
            ...(temperature !== undefined ? { temperature } : {}),
            messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages],
          }),
        });
      } catch (error) {
        throw errorFromFetch('openai', error);
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw errorFromStatus('openai', response.status, body?.error?.code || body?.error?.type);
      }

      const usage = { inputTokens: 0, outputTokens: 0 };
      try {
        for await (const { data } of readSse(response)) {
          if (data === '[DONE]') break;
          const payload = JSON.parse(data);
          const text = payload.choices?.[0]?.delta?.content;
          if (text) yield { type: 'text', text };
          if (payload.usage) {
            usage.inputTokens = payload.usage.prompt_tokens ?? 0;
            usage.outputTokens = payload.usage.completion_tokens ?? 0;
          }
        }
      } catch (error) {
        throw errorFromFetch('openai', error);
      }

      yield { type: 'done', usage, model, provider: 'openai' };
    },
  };
}
