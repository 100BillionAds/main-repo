/** @jest-environment node */

import { summarizeHealth } from '@/lib/health';

const ok = { status: 'ok' };

describe('상태 요약', () => {
  it('모두 정상이면 ok', () => {
    expect(summarizeHealth({ database: ok, migrations: ok, redis: ok, outbox: ok })).toBe('ok');
  });

  it('Redis 를 쓰지 않는 구성(disabled)은 정상이다', () => {
    expect(summarizeHealth({ database: ok, migrations: ok, redis: { status: 'disabled' }, outbox: ok })).toBe('ok');
  });

  it('DB 가 죽으면 down — 서비스가 일할 수 없다', () => {
    expect(
      summarizeHealth({ database: { status: 'down' }, migrations: { status: 'skipped' }, redis: ok, outbox: { status: 'skipped' } })
    ).toBe('down');
  });

  it('Redis 가 죽어도 down 이 아니라 degraded — 메모리로 대신 동작한다', () => {
    expect(summarizeHealth({ database: ok, migrations: ok, redis: { status: 'down' }, outbox: ok })).toBe('degraded');
  });

  it('이벤트가 밀리거나 마이그레이션이 덜 됐으면 degraded', () => {
    expect(summarizeHealth({ database: ok, migrations: ok, redis: ok, outbox: { status: 'degraded', stale: 3 } })).toBe('degraded');
    expect(summarizeHealth({ database: ok, migrations: { status: 'degraded', pending: 1 }, redis: ok, outbox: ok })).toBe('degraded');
  });
});
