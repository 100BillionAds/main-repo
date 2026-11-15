import { timingSafeEqual } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/** 요청이 `Authorization: Bearer $CRON_SECRET` 을 갖고 있는가. 비교 시간으로 값이 새지 않게 한다. */
export function hasValidCronSecret(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get('authorization') || '';
  const provided = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/** 예약 작업 API 의 인증: CRON_SECRET 또는 관리자 세션 */
export async function isCronAuthorized(request) {
  if (hasValidCronSecret(request)) return true;
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin';
}
