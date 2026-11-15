import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { errorResponse } from '@/lib/apiResponse';
import * as notifications from '@/domain/notifications/notificationRepository';

export const dynamic = 'force-dynamic';

/** GET /api/notifications — 내 알림 목록(최근 30개)과 안 읽은 개수 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const [items, unreadCount] = await Promise.all([
      notifications.listForUser(userId),
      notifications.countUnread(userId),
    ]);
    return NextResponse.json({ success: true, notifications: items, unreadCount });
  } catch (error) {
    return errorResponse(error, '알림을 불러오지 못했습니다.', '알림 조회 실패');
  }
}

/** PATCH /api/notifications — 내 알림을 모두 읽음으로 표시 */
export async function PATCH() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const updated = await notifications.markAllRead(Number(session.user.id));
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    return errorResponse(error, '알림을 읽음 처리하지 못했습니다.', '알림 읽음 처리 실패');
  }
}
