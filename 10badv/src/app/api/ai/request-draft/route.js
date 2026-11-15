import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { errorResponse } from '@/lib/apiResponse';
import { formatSseEvent } from '@/lib/sse';
import { startRequestDraft } from '@/domain/ai/requestDraftService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/request-draft
 * 짧은 메모를 의뢰서 초안으로 다듬어 SSE 로 흘려보낸다.
 *
 * 요청: { brief: string, category?: string, budget?: number }
 * 응답(성공): text/event-stream
 *   event: delta  data: {"text":"..."}                       글자가 나올 때마다
 *   event: done   data: {"title":"...","description":"..."}  끝났을 때 한 번
 *   event: error  data: {"error":"..."}                      스트림 도중 실패
 * 응답(시작 전 실패): 일반 JSON { success: false, error } + 400/401/429
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { stream } = await startRequestDraft({
      userId: Number(session.user.id),
      input: body,
      signal: request.signal,
    });

    const encoder = new TextEncoder();
    const responseBody = new ReadableStream({
      async start(controller) {
        const send = (event, data) => controller.enqueue(encoder.encode(formatSseEvent(event, data)));
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'delta') send('delta', { text: chunk.text });
            else send('done', { title: chunk.title, description: chunk.description });
          }
        } catch (error) {
          if (error?.code !== 'ABORTED') {
            console.error('AI 초안 작성 실패:', { code: error?.code, provider: error?.provider, status: error?.status, message: error?.message });
            try {
              send('error', { error: 'AI 응답을 받지 못했습니다. 잠시 후 다시 시도해주세요.' });
            } catch {
              // 연결이 이미 끊겼다
            }
          }
        } finally {
          try {
            controller.close();
          } catch {
            // 이미 닫혔다
          }
        }
      },
      async cancel() {
        // 브라우저가 연결을 끊으면 LLM 호출도 멈춘다 (서비스의 finally 가 기록을 정리한다).
        await stream.return?.();
      },
    });

    return new Response(responseBody, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        // no-transform: 중간의 압축·프록시가 응답을 모았다가 한꺼번에 보내지 않게 한다.
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return errorResponse(error, 'AI 초안 작성에 실패했습니다.', 'AI 초안 작성 실패');
  }
}
