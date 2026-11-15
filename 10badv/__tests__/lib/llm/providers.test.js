/** @jest-environment node */

import { readSse, formatSseEvent } from '@/lib/sse';
import { collect, createLlmClientFromEnv } from '@/lib/llm';
import { createAnthropicProvider } from '@/lib/llm/anthropic';
import { createOpenAiProvider } from '@/lib/llm/openai';
import { MOCK_NOTICE } from '@/lib/llm/mock';
import { sseResponse, jsonResponse } from './testUtils';

const request = { system: '시스템 지시', messages: [{ role: 'user', content: '안녕' }], maxTokens: 100 };

describe('SSE 파서', () => {
  it('이벤트 중간·한글 글자 중간에서 끊겨 와도 온전히 읽는다', async () => {
    const bytes = new TextEncoder().encode(
      formatSseEvent('delta', { text: '안녕하세요' }) + formatSseEvent('done', { ok: true })
    );
    const response = sseResponse([bytes.slice(0, 25), bytes.slice(25, 31), bytes.slice(31)]);

    const events = [];
    for await (const event of readSse(response)) events.push([event.event, JSON.parse(event.data)]);

    expect(events).toEqual([
      ['delta', { text: '안녕하세요' }],
      ['done', { ok: true }],
    ]);
  });
});

describe('Anthropic 제공자', () => {
  const stream = [
    'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":25,"output_tokens":1}}}\n\n',
    'event: ping\ndata: {"type":"ping"}\n\nevent: content_block_start\ndata: {"type":"content_block_start","index":0}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"제목: 카"}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"페"}}\n\n',
    'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":15}}\n\n',
    'event: message_stop\ndata: {"type":"message_stop"}\n\n',
  ];

  it('스트림을 글자 조각과 토큰 사용량으로 바꾼다', async () => {
    const fetchImpl = jest.fn(async () => sseResponse(stream));
    const provider = createAnthropicProvider({ apiKey: 'test-key', model: 'test-model', fetchImpl });

    const result = await collect(provider.stream(request));

    expect(result).toEqual({
      text: '제목: 카페',
      usage: { inputTokens: 25, outputTokens: 15 },
      model: 'test-model',
      provider: 'anthropic',
    });
    const [, options] = fetchImpl.mock.calls[0];
    expect(options.headers['x-api-key']).toBe('test-key');
    expect(JSON.parse(options.body)).toMatchObject({ model: 'test-model', system: '시스템 지시', stream: true, max_tokens: 100 });
  });

  it.each([
    [429, 'RATE_LIMITED', true],
    [529, 'UNAVAILABLE', true],
    [500, 'UNAVAILABLE', true],
    [401, 'AUTH', false],
    [400, 'BAD_REQUEST', false],
  ])('HTTP %i → %s (재시도 가능: %s)', async (status, code, retryable) => {
    const provider = createAnthropicProvider({
      apiKey: 'k',
      model: 'm',
      fetchImpl: async () => jsonResponse({ error: { type: 'some_error' } }, status),
    });
    await expect(collect(provider.stream(request))).rejects.toMatchObject({ code, retryable });
  });

  it('연결 실패는 재시도 가능한 NETWORK 오류다', async () => {
    const provider = createAnthropicProvider({
      apiKey: 'k',
      model: 'm',
      fetchImpl: async () => {
        throw new TypeError('fetch failed');
      },
    });
    await expect(collect(provider.stream(request))).rejects.toMatchObject({ code: 'NETWORK', retryable: true });
  });

  it('스트림 도중의 과부하 오류 이벤트를 UNAVAILABLE 로 바꾼다', async () => {
    const provider = createAnthropicProvider({
      apiKey: 'k',
      model: 'm',
      fetchImpl: async () =>
        sseResponse(['event: error\ndata: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}\n\n']),
    });
    await expect(collect(provider.stream(request))).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });

  it('API 키가 없으면 만들 때 바로 알린다', () => {
    expect(() => createAnthropicProvider({ model: 'm' })).toThrow(expect.objectContaining({ code: 'CONFIG' }));
  });
});

describe('OpenAI 제공자', () => {
  it('요청·응답 모양이 달라도 같은 결과 모양으로 바꾼다', async () => {
    const fetchImpl = jest.fn(async () =>
      sseResponse([
        'data: {"choices":[{"delta":{"content":"안"}}]}\n\ndata: {"choices":[{"delta":{"content":"녕"}}]}\n\n',
        'data: {"choices":[],"usage":{"prompt_tokens":7,"completion_tokens":3}}\n\ndata: [DONE]\n\n',
      ])
    );
    const provider = createOpenAiProvider({ apiKey: 'k', model: 'test-model', fetchImpl });

    const result = await collect(provider.stream(request));

    expect(result).toEqual({
      text: '안녕',
      usage: { inputTokens: 7, outputTokens: 3 },
      model: 'test-model',
      provider: 'openai',
    });
    // Anthropic 은 system 이 최상위 필드, OpenAI 는 첫 번째 메시지다.
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).messages[0]).toEqual({ role: 'system', content: '시스템 지시' });
  });

  it('모델 이름이 없으면 거부한다', () => {
    expect(() => createOpenAiProvider({ apiKey: 'k' })).toThrow(expect.objectContaining({ code: 'CONFIG' }));
  });
});

describe('환경변수로 만든 클라이언트', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('아무 설정이 없으면 가짜 제공자를 쓰고, 응답에 예시임을 밝힌다', async () => {
    delete process.env.LLM_PROVIDER;
    const client = createLlmClientFromEnv();

    const result = await collect(client.stream({ messages: [{ role: 'user', content: '<brief>동네 카페 간판</brief>' }] }));

    expect(result.provider).toBe('mock');
    expect(result.text).toContain(MOCK_NOTICE);
    expect(result.text.startsWith('제목: 동네 카페 간판')).toBe(true);
  });

  it('알 수 없는 제공자 이름은 거부한다', () => {
    process.env.LLM_PROVIDER = 'unknown-ai';
    expect(() => createLlmClientFromEnv()).toThrow(expect.objectContaining({ code: 'CONFIG' }));
  });
});
