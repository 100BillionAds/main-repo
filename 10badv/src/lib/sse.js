/**
 * Server-Sent Events(SSE) 읽기/쓰기.
 *
 * SSE 는 응답 하나를 끊지 않고 "이벤트"를 여러 번 흘려보내는 HTTP 형식이다.
 *   event: delta
 *   data: {"text":"안녕"}
 *   (빈 줄)
 * LLM 이 글자를 만들어내는 대로 화면에 보여줄 때 쓴다.
 * 서버(LLM 제공자 응답 읽기)와 브라우저(우리 API 응답 읽기) 양쪽에서 같은 파서를 쓴다.
 */

/** 이벤트 하나를 SSE 형식 문자열로 만든다. */
export function formatSseEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function parseBlock(block) {
  let event = 'message';
  const dataLines = [];
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue; // 빈 줄, 주석(keep-alive)
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    else if (field === 'data') dataLines.push(value);
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

/**
 * fetch 응답 본문을 SSE 이벤트 단위로 읽는다.
 * 네트워크는 이벤트 중간에서도 끊어 보내므로, 빈 줄(이벤트 끝)이 올 때까지 버퍼에 모은다.
 * @returns {AsyncGenerator<{ event: string, data: string }>}
 */
export async function* readSse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const parsed = parseBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (parsed) yield parsed;
        boundary = buffer.indexOf('\n\n');
      }
    }
    const rest = parseBlock(buffer.trim());
    if (rest) yield rest;
  } finally {
    reader.releaseLock?.();
  }
}
