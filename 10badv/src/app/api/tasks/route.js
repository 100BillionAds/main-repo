import { NextResponse } from 'next/server';

// 임시 데이터 (실제로는 데이터베이스에서 가져옴)
const mockTasks = [
  {
    id: 1,
    title: 'Project Alpha 기획서 작성',
    status: 'in-progress',
    priority: 'high',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 2,
    title: 'UI/UX 디자인 검토',
    status: 'completed',
    priority: 'medium',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 3,
    title: 'API 문서화',
    status: 'todo',
    priority: 'low',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

/**
 * GET /api/tasks - 모든 태스크 조회
 */
export async function GET() {
  try {
    // 실제로는 데이터베이스에서 조회
    return NextResponse.json({
      success: true,
      data: mockTasks,
      total: mockTasks.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tasks',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks - 새 태스크 생성
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { title, priority = 'medium' } = body;

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title is required',
        },
        { status: 400 }
      );
    }

    // 실제로는 데이터베이스에 저장
    const newTask = {
      id: mockTasks.length + 1,
      title,
      status: 'todo',
      priority,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: newTask,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create task',
      },
      { status: 500 }
    );
  }
}
