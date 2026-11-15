import { LlmError } from '@/lib/llm/errors';

/**
 * 제공자를 감싸 장애에 버티게 한다. 감싼 결과도 같은 stream() 을 가진 제공자다 (데코레이터).
 *
 *  1. 제한 시간   — timeoutMs 안에 끝나지 않으면 끊는다. 응답 없는 요청이 서버 자원을 잡고 있지 않게.
 *  2. 재시도      — 일시적 오류(429, 5xx, 연결 실패, 시간 초과)는 간격을 늘려가며 다시 시도한다.
 *  3. 대체 제공자 — 그래도 안 되면 fallback 제공자로 넘어간다.
 *
 * 재시도·대체는 "첫 글자가 나가기 전"에만 한다. 이미 일부를 사용자에게 보여준 뒤 다시 시작하면
 * 같은 내용이 두 번 나오기 때문이다. 그 뒤의 실패는 그대로 실패로 알린다.
 */
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 재시도 간격: 300ms, 600ms, 1200ms ... 에 무작위 값을 더한다 (여러 요청이 동시에 재시도해 다시 몰리는 것을 막는다). */
export function backoffDelay(attempt, { baseMs = 300, maxMs = 5000, random = Math.random } = {}) {
  const exponential = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.round(exponential / 2 + (exponential / 2) * random());
}

async function* streamWithTimeout(provider, request, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;

  const onCallerAbort = () => controller.abort();
  if (request.signal?.aborted) controller.abort();
  request.signal?.addEventListener('abort', onCallerAbort, { once: true });

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    yield* provider.stream({ ...request, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new LlmError(`${provider.name} 응답이 ${timeoutMs}ms 안에 끝나지 않았습니다.`, {
        code: 'TIMEOUT',
        provider: provider.name,
        retryable: true,
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
    request.signal?.removeEventListener('abort', onCallerAbort);
  }
}

export function withResilience(
  provider,
  { timeoutMs = 30000, maxRetries = 2, fallback = null, sleep = defaultSleep, onEvent = () => {} } = {}
) {
  return {
    name: provider.name,
    model: provider.model,

    async *stream(request) {
      const candidates = fallback ? [provider, fallback] : [provider];
      let lastError;

      for (const candidate of candidates) {
        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
          let started = false;
          try {
            for await (const chunk of streamWithTimeout(candidate, request, timeoutMs)) {
              started = true;
              yield chunk;
            }
            return;
          } catch (error) {
            lastError = error;
            // 이미 글자가 나갔거나, 사용자가 취소했거나, 우리 요청이 잘못된 경우는 다시 해도 소용없다.
            if (started || error?.code === 'ABORTED' || error?.code === 'BAD_REQUEST') throw error;
            if (!error?.retryable || attempt === maxRetries) break; // 이 제공자는 포기 → 대체 제공자로
            const delay = backoffDelay(attempt);
            onEvent({ type: 'retry', provider: candidate.name, attempt: attempt + 1, code: error.code, delay });
            await sleep(delay);
          }
        }
        if (candidate !== candidates[candidates.length - 1]) {
          onEvent({ type: 'fallback', from: candidate.name, to: fallback.name, code: lastError?.code });
        }
      }

      throw lastError;
    },
  };
}
