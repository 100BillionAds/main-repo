import { NextResponse } from 'next/server';
import { getAllUsers, updateUser, deleteUser } from '@/lib/db';

/**
 * GET /api/admin/users - 모든 사용자 조회
 */
export async function GET() {
  try {
    const users = await getAllUsers();
    
    // 비밀번호 제외하고 반환
    const safeUsers = users.map(({ password, ...user }) => user);
    
    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('❌ Get users error:', error);
    return NextResponse.json(
      { error: '사용자 목록 조회 실패' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users - 사용자 정보 수정
 */
export async function PATCH(request) {
  try {
    const { userId, updates } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const success = await updateUser(userId, updates);

    if (success) {
      return NextResponse.json({ success: true, message: '사용자 정보가 수정되었습니다' });
    } else {
      return NextResponse.json(
        { error: '사용자 정보 수정 실패' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Update user error:', error);
    return NextResponse.json(
      { error: '사용자 정보 수정 중 오류 발생' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users - 사용자 삭제
 */
export async function DELETE(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const success = await deleteUser(userId);

    if (success) {
      return NextResponse.json({ success: true, message: '사용자가 삭제되었습니다' });
    } else {
      return NextResponse.json(
        { error: '사용자 삭제 실패' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Delete user error:', error);
    return NextResponse.json(
      { error: '사용자 삭제 중 오류 발생' },
      { status: 500 }
    );
  }
}
