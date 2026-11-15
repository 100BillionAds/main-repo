import { LlmError } from '@/lib/llm/errors';

/**
 * 가짜 제공자. 실제 API 를 부르지 않고 정해진 글을 조각내어 흘려보낸다.
 *  - API 키 없이 개발·테스트·데모를 할 수 있다 (비용 0).
 *  - 테스트에서 결과가 매번 같다.
 * 응답에는 예시임을 밝히는 문구가 들어간다. 사용자가 진짜 AI 답으로 오해하지 않게 하기 위해서다.
 */
export const MOCK_NOTICE = '(예시 응답입니다. AI 가 연결되지 않은 상태에서 만들어진 고정 문구입니다.)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function defaultReply(messages) {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  const brief = String(lastUser?.content || '').match(/<brief>([\s\S]*?)<\/brief>/)?.[1]?.trim() || '간판 디자인';
  const summary = brief.replace(/\s+/g, ' ').slice(0, 30);
  return [
    `제목: ${summary} 디자인 의뢰`,
    '---',
    `${MOCK_NOTICE}`,
    '',
    '1. 의뢰 내용',
    `- ${brief.replace(/\s+/g, ' ')}`,
    '',
    '2. 원하는 분위기',
    '- (원하는 색상, 글씨체, 참고할 가게를 적어주세요)',
    '',
    '3. 크기와 설치 위치',
    '- (가로·세로 크기, 건물 외벽/실내 여부를 적어주세요)',
    '',
    '4. 일정',
    '- (희망 완료일을 적어주세요)',
  ].join('\n');
}

export function createMockProvider({ reply, chunkSize = 12, delayMs = 15 } = {}) {
  return {
    name: 'mock',
    model: 'mock-1',

    async *stream({ messages, signal }) {
      const text = typeof reply === 'function' ? reply(messages) : reply ?? defaultReply(messages);
      const inputChars = messages.reduce((sum, message) => sum + String(message.content).length, 0);

      for (let index = 0; index < text.length; index += chunkSize) {
        if (signal?.aborted) {
          throw new LlmError('mock 호출이 취소됐습니다.', { code: 'ABORTED', provider: 'mock' });
        }
        if (delayMs > 0) await sleep(delayMs);
        yield { type: 'text', text: text.slice(index, index + chunkSize) };
      }

      yield {
        type: 'done',
        // 실제 토큰 수가 아니라 글자 수로 어림한 값이다.
        usage: { inputTokens: Math.ceil(inputChars / 2), outputTokens: Math.ceil(text.length / 2) },
        model: 'mock-1',
        provider: 'mock',
      };
    },
  };
}
