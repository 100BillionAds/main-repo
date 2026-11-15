import { createAnthropicProvider } from '@/lib/llm/anthropic';
import { createOpenAiProvider } from '@/lib/llm/openai';
import { createMockProvider } from '@/lib/llm/mock';
import { withResilience } from '@/lib/llm/resilient';
import { LlmError } from '@/lib/llm/errors';

/**
 * LLM 클라이언트 (제공자 추상화)
 *
 * 모든 제공자는 같은 모양이다:
 *
 *   provider.stream({ system, messages, maxTokens, temperature, signal })
 *     → 비동기 반복자. { type: 'text', text } 를 여러 번,
 *       마지막에 { type: 'done', usage: { inputTokens, outputTokens }, model, provider } 를 한 번 내보낸다.
 *
 * 기능 코드(domain/ai)는 이 모양만 안다. 어느 회사 모델을 쓰는지는 환경변수로 바꾼다.
 *
 *   LLM_PROVIDER            mock(기본) | anthropic | openai
 *   LLM_MODEL               모델 이름 (anthropic 기본값: claude-haiku-5-5, openai 는 필수)
 *   ANTHROPIC_API_KEY / OPENAI_API_KEY
 *   LLM_FALLBACK_PROVIDER   주 제공자가 실패했을 때 넘어갈 제공자 (선택)
 *   LLM_FALLBACK_MODEL
 *   LLM_TIMEOUT_MS          기본 30000
 *   LLM_MAX_RETRIES         기본 2
 */
const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-5-5';

function readInt(name, fallback, { min, max }) {
  const value = Number(process.env[name]);
  if (!Number.isInteger(value) || value < min || value > max) return fallback;
  return value;
}

export function createProvider(name, { model } = {}) {
  switch (name) {
    case 'anthropic':
      return createAnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: model || DEFAULT_ANTHROPIC_MODEL,
      });
    case 'openai':
      return createOpenAiProvider({ apiKey: process.env.OPENAI_API_KEY, model });
    case 'mock':
      return createMockProvider();
    default:
      throw new LlmError(`알 수 없는 LLM_PROVIDER 입니다: ${name}`, { code: 'CONFIG' });
  }
}

/** 환경변수를 읽어 제한 시간·재시도·대체 제공자가 적용된 클라이언트를 만든다. */
export function createLlmClientFromEnv() {
  const primaryName = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
  const primary = createProvider(primaryName, { model: process.env.LLM_MODEL });

  const fallbackName = (process.env.LLM_FALLBACK_PROVIDER || '').toLowerCase();
  const fallback =
    fallbackName && fallbackName !== primaryName
      ? createProvider(fallbackName, { model: process.env.LLM_FALLBACK_MODEL })
      : null;

  return withResilience(primary, {
    timeoutMs: readInt('LLM_TIMEOUT_MS', 30000, { min: 1000, max: 120000 }),
    maxRetries: readInt('LLM_MAX_RETRIES', 2, { min: 0, max: 5 }),
    fallback,
    onEvent: (event) => console.warn('LLM', event),
  });
}

let cached = null;

export function getLlmClient() {
  if (!cached) cached = createLlmClientFromEnv();
  return cached;
}

/** 스트림을 끝까지 읽어 한 덩어리로 돌려준다 (스트리밍이 필요 없는 곳에서 사용). */
export async function collect(stream) {
  let text = '';
  let done = null;
  for await (const chunk of stream) {
    if (chunk.type === 'text') text += chunk.text;
    else if (chunk.type === 'done') done = chunk;
  }
  return { text, usage: done?.usage ?? { inputTokens: 0, outputTokens: 0 }, model: done?.model, provider: done?.provider };
}
