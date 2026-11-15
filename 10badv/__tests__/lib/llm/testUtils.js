/** SSE 본문을 가진 가짜 fetch 응답을 만든다. chunks 는 네트워크가 끊어 보내는 조각들. */
export function sseResponse(chunks, status = 200) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
      }
      controller.close();
    },
  });
  return new Response(body, { status });
}

export function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), { status });
}
