import { readStoredFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// 브라우저가 화면에 바로 그려도 안전한 형식. 그 밖의 파일은 내려받기로만 내보낸다.
const INLINE_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

/**
 * GET /api/files/<id> — DB 에 보관한 업로드 파일을 내보낸다 (STORAGE_PROVIDER=db).
 *
 * 보안
 *  - 주소의 id 는 무작위 UUID 라 추측할 수 없다 (외부 저장소의 공개 주소와 같은 수준).
 *  - 우리 도메인에서 나가는 파일이므로, 누가 올린 HTML·SVG 가 페이지처럼 실행되면 안 된다.
 *    안전한 이미지 형식만 그대로 보여주고, 나머지는 형식을 감추고(application/octet-stream) 내려받기로 보낸다.
 *    nosniff 로 브라우저가 내용을 보고 형식을 추측하지 못하게 한다.
 *
 * 캐시: id 가 같으면 내용이 바뀌지 않으므로 브라우저가 1년간 다시 요청하지 않게 한다.
 */
export async function GET(_request, { params }) {
  const { id } = await params;

  let file;
  try {
    file = await readStoredFile(id);
  } catch (error) {
    console.error('파일 조회 실패:', error.message);
    return new Response('파일을 불러오지 못했습니다.', { status: 500 });
  }
  if (!file) {
    return new Response('파일을 찾을 수 없습니다.', { status: 404 });
  }

  const inline = INLINE_IMAGE_TYPES.has(file.contentType);
  const headers = {
    'Content-Type': inline ? file.contentType : 'application/octet-stream',
    'Content-Length': String(file.data.length),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  };
  if (!inline) {
    headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`;
  }

  return new Response(file.data, { headers });
}
