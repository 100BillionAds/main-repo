/** @jest-environment node */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    execute: jest.fn(),
  },
}));

import pool from '@/lib/db';
import { GET } from '@/app/api/requests/route';

describe('GET /api/requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('페이지네이션은 LIMIT/OFFSET 정수 리터럴을 사용한다', async () => {
    pool.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const request = new Request('http://localhost/api/requests?page=2&limit=10');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    const [sql, params] = pool.execute.mock.calls[0];
    expect(sql).toContain('LIMIT 10 OFFSET 10');
    expect(sql).not.toContain('LIMIT ? OFFSET ?');
    expect(params).toEqual([]);
  });

  it('필터 값만 쿼리 파라미터로 전달한다', async () => {
    pool.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    const request = new Request('http://localhost/api/requests?status=OPEN&clientId=5&page=1&limit=20');
    await GET(request);

    const [sql, params] = pool.execute.mock.calls[0];
    expect(sql).toContain('LIMIT 20 OFFSET 0');
    expect(params).toEqual(['OPEN', '5']);
  });
});
