/** @jest-environment node */

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    execute: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth';
import pool from '@/lib/db';
import { GET } from '@/app/api/dashboard/stats/route';

describe('GET /api/dashboard/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('관리자 통계 조회에서 현재 스키마 컬럼명을 사용한다', async () => {
    getServerSession.mockResolvedValue({ user: { id: '1', role: 'admin' } });

    pool.execute
      .mockResolvedValueOnce([[{ count: 5 }]])
      .mockResolvedValueOnce([[{ count: 2 }]])
      .mockResolvedValueOnce([[{ count: 10 }]])
      .mockResolvedValueOnce([[{ count: 7 }]])
      .mockResolvedValueOnce([[{ count: 1 }]])
      .mockResolvedValueOnce([[{ count: 4 }]])
      .mockResolvedValueOnce([[{ total: 1200 }]])
      .mockResolvedValueOnce([[{ count: 9 }]])
      .mockResolvedValueOnce([[{ id: 11, amount: 3000, status: 'completed', created_at: '2026-04-25T00:00:00.000Z', buyer_name: 'buyer', seller_name: 'designer' }]])
      .mockResolvedValueOnce([[{ id: 99, name: '홍길동', username: 'hong', email: 'hong@example.com', role: 'user', created_at: '2026-04-25T00:00:00.000Z' }]]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.stats.totalRevenue).toBe(1200);
    expect(body.stats.recentUsers[0].name).toBe('홍길동');

    const executedSql = pool.execute.mock.calls.map(([sql]) => sql).join('\n');
    expect(executedSql).toContain('SUM(commission)');
    expect(executedSql).toContain('t.designer_id = seller.id');
    expect(executedSql).not.toContain('commission_amount');
  });

  it('디자이너 개인 통계 조회에서 designer_id/commission 컬럼을 사용한다', async () => {
    getServerSession.mockResolvedValue({ user: { id: '7', role: 'designer' } });

    pool.execute
      .mockResolvedValueOnce([[{ count: 6 }]])
      .mockResolvedValueOnce([[{ count: 3 }]])
      .mockResolvedValueOnce([[{ points: 15000 }]])
      .mockResolvedValueOnce([[{ count: 2 }]])
      .mockResolvedValueOnce([[{ count: 4 }]])
      .mockResolvedValueOnce([[{ count: 8 }]])
      .mockResolvedValueOnce([[{ total: 21000 }]]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.stats.totalTransactions).toBe(6);
    expect(body.stats.totalEarnings).toBe(21000);

    const executedSql = pool.execute.mock.calls.map(([sql]) => sql).join('\n');
    expect(executedSql).toContain('buyer_id = ? OR designer_id = ?');
    expect(executedSql).toContain('amount - commission');
    expect(executedSql).toContain('designer_id = ? AND status = \'completed\'');
    expect(executedSql).not.toContain('seller_id');
    expect(executedSql).not.toContain('commission_amount');
  });
});
