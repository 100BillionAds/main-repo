/** @jest-environment node */

import { collect } from '@/lib/llm';
import { LlmError } from '@/lib/llm/errors';
import { createMockProvider } from '@/lib/llm/mock';
import { backoffDelay, withResilience } from '@/lib/llm/resilient';

const noSleep = async () => {};
const request = { messages: [{ role: 'user', content: '안녕' }] };

/** 처음 failures 번은 makeError() 로 실패하고, 그 뒤에는 성공하는 제공자. */
function flakyProvider(failures, makeError) {
  let calls = 0;
  return {
    name: 'flaky',
    model: 'flaky-1',
    get calls() {
      return calls;
    },
    async *stream() {
      calls += 1;
      if (calls <= failures) throw makeError();
      yield { type: 'text', text: '성공' };
      yield { type: 'done', usage: { inputTokens: 1, outputTokens: 1 }, model: 'flaky-1', provider: 'flaky' };
    },
  };
}

const rateLimited = () => new LlmError('429', { code: 'RATE_LIMITED', retryable: true });
const fallback = createMockProvider({ reply: '대체 응답', delayMs: 0 });

describe('재시도', () => {
  it('일시적 오류는 다시 시도해 성공한다', async () => {
    const provider = flakyProvider(2, rateLimited);
    const events = [];

    const result = await collect(
      withResilience(provider, { sleep: noSleep, onEvent: (event) => events.push(event) }).stream(request)
    );

    expect(result.text).toBe('성공');
    expect(provider.calls).toBe(3);
    expect(events.filter((event) => event.type === 'retry')).toHaveLength(2);
  });

  it('최대 횟수를 넘으면 마지막 오류를 그대로 알린다', async () => {
    const provider = flakyProvider(99, rateLimited);

    await expect(
      collect(withResilience(provider, { sleep: noSleep, maxRetries: 2 }).stream(request))
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(provider.calls).toBe(3); // 첫 시도 + 재시도 2번
  });

  it('재시도해도 소용없는 오류(API 키 문제)는 다시 시도하지 않는다', async () => {
    const provider = flakyProvider(99, () => new LlmError('401', { code: 'AUTH' }));

    await expect(collect(withResilience(provider, { sleep: noSleep }).stream(request))).rejects.toMatchObject({ code: 'AUTH' });
    expect(provider.calls).toBe(1);
  });

  it('재시도 간격은 시도할수록 늘어나고 상한을 넘지 않는다', () => {
    const fixed = { random: () => 1 };
    expect(backoffDelay(0, fixed)).toBe(300);
    expect(backoffDelay(1, fixed)).toBe(600);
    expect(backoffDelay(2, fixed)).toBe(1200);
    expect(backoffDelay(10, fixed)).toBe(5000);
    expect(backoffDelay(1, { random: () => 0 })).toBe(300); // 무작위 폭: 절반 ~ 전체
  });
});

describe('대체 제공자', () => {
  it('주 제공자가 끝내 실패하면 대체 제공자로 넘어간다', async () => {
    const provider = flakyProvider(99, rateLimited);
    const events = [];

    const result = await collect(
      withResilience(provider, { sleep: noSleep, fallback, onEvent: (event) => events.push(event) }).stream(request)
    );

    expect(result.text).toBe('대체 응답');
    expect(result.provider).toBe('mock');
    expect(events).toContainEqual(expect.objectContaining({ type: 'fallback', from: 'flaky', to: 'mock' }));
  });

  it('API 키 문제도 대체 제공자로 넘어간다', async () => {
    const provider = flakyProvider(99, () => new LlmError('401', { code: 'AUTH' }));
    const result = await collect(withResilience(provider, { sleep: noSleep, fallback }).stream(request));
    expect(result.text).toBe('대체 응답');
  });

  it('우리 요청이 잘못된 경우(BAD_REQUEST)는 넘어가지 않는다 — 어디로 보내도 틀린 요청이다', async () => {
    const provider = flakyProvider(99, () => new LlmError('400', { code: 'BAD_REQUEST' }));
    await expect(
      collect(withResilience(provider, { sleep: noSleep, fallback }).stream(request))
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('이미 글자가 나간 뒤의 실패는 재시도도 대체도 하지 않는다 (같은 글이 두 번 나오지 않게)', async () => {
    let calls = 0;
    const provider = {
      name: 'mid',
      async *stream() {
        calls += 1;
        yield { type: 'text', text: '절반만' };
        throw new LlmError('503', { code: 'UNAVAILABLE', retryable: true });
      },
    };
    const received = [];

    await expect(
      (async () => {
        for await (const chunk of withResilience(provider, { sleep: noSleep, fallback }).stream(request)) {
          received.push(chunk);
        }
      })()
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });

    expect(calls).toBe(1);
    expect(received).toEqual([{ type: 'text', text: '절반만' }]);
  });
});

describe('제한 시간과 취소', () => {
  /** 취소 신호가 올 때까지 아무것도 하지 않는 제공자. */
  function hangingProvider(counter = { calls: 0 }) {
    return {
      name: 'slow',
      async *stream({ signal }) {
        counter.calls += 1;
        await new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new LlmError('취소', { code: 'ABORTED' })));
        });
      },
    };
  }

  it('제한 시간 안에 끝나지 않으면 TIMEOUT 으로 끊는다', async () => {
    await expect(
      collect(withResilience(hangingProvider(), { timeoutMs: 30, maxRetries: 0 }).stream(request))
    ).rejects.toMatchObject({ code: 'TIMEOUT', retryable: true });
  });

  it('호출한 쪽이 취소하면 재시도하지 않고 바로 멈춘다', async () => {
    const counter = { calls: 0 };
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);

    await expect(
      collect(
        withResilience(hangingProvider(counter), { timeoutMs: 5000, sleep: noSleep }).stream({
          ...request,
          signal: controller.signal,
        })
      )
    ).rejects.toMatchObject({ code: 'ABORTED' });
    expect(counter.calls).toBe(1);
  });
});
