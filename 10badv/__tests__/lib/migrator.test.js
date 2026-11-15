/** @jest-environment node */

import {
  computeChecksum,
  planMigrations,
  runMigrations,
  validateDefinitions,
} from '@/lib/migrations/migrator';
import migrations from '@/lib/migrations';

/** SQL 을 실행하지 않고 "무엇이 실행됐는지"만 기록하는 가짜 DB. */
function createFakePool({ lockAcquired = 1, existingColumns = [], failOn = null } = {}) {
  const state = {
    log: [],
    rows: [],
    columns: new Set(existingColumns),
    indexes: new Set(),
    released: 0,
    failOn,
  };

  const connection = {
    release() {
      state.released += 1;
    },
    async query(sql, params = []) {
      const text = sql.trim();
      state.log.push(text.split('\n')[0]);

      if (text.includes('GET_LOCK')) return [[{ acquired: lockAcquired }]];
      if (text.includes('SELECT DATABASE()')) return [[{ db: 'testdb' }]];
      if (text.includes('information_schema.columns')) {
        return [[{ cnt: state.columns.has(params.join('.')) ? 1 : 0 }]];
      }
      if (text.includes('information_schema.statistics')) {
        return [[{ cnt: state.indexes.has(params.join('.')) ? 1 : 0 }]];
      }
      if (text.startsWith('SELECT id, checksum')) return [state.rows.slice()];
      if (state.failOn && state.failOn.test(text)) throw new Error('boom');
      if (text.startsWith('INSERT INTO schema_migrations')) {
        state.rows.push({ id: params[0], checksum: params[1] });
        return [{}];
      }
      const column = text.match(/^ALTER TABLE (\w+) ADD COLUMN (\w+)/);
      if (column) state.columns.add(`${column[1]}.${column[2]}`);
      const index = text.match(/INDEX (\w+) ON (\w+)/);
      if (index) state.indexes.add(`${index[2]}.${index[1]}`);
      return [[]];
    },
  };

  return { state, pool: { getConnection: async () => connection } };
}

const second = { id: '0002_example', steps: ['SELECT 1'] };
// 러너 동작은 첫 마이그레이션 하나로 검증한다 (목록이 늘어도 테스트가 흔들리지 않게).
const baselineOnly = [migrations[0]];

describe('마이그레이션 정의 검증', () => {
  it('실제 마이그레이션 목록은 규칙을 지킨다', () => {
    expect(() => validateDefinitions(migrations)).not.toThrow();
    expect(migrations[0].id).toBe('0001_baseline');
  });

  it.each([
    ['id 형식이 틀림', [{ id: 'add-table', steps: ['SELECT 1'] }]],
    ['순서가 뒤집힘', [second, migrations[0]]],
    ['id 중복', [second, second]],
    ['steps 가 비어 있음', [{ id: '0001_a', steps: [] }]],
    ['알 수 없는 step', [{ id: '0001_a', steps: [{ dropTable: ['users'] }] }]],
    ['테이블 이름에 SQL 이 섞임', [{ id: '0001_a', steps: [{ addColumn: ['users; DROP TABLE users', 'c', 'INT'] }] }]],
  ])('%s → 거부', (_label, definitions) => {
    expect(() => validateDefinitions(definitions)).toThrow(
      expect.objectContaining({ code: 'INVALID_DEFINITION' })
    );
  });
});

describe('체크섬', () => {
  it('들여쓰기·개행 차이는 무시한다', () => {
    const a = { id: '0001_a', steps: ['SELECT 1\n    FROM users'] };
    const b = { id: '0001_a', steps: ['  SELECT 1\r\nFROM users  '] };
    expect(computeChecksum(a)).toBe(computeChecksum(b));
  });

  it('SQL 내용이 바뀌면 달라진다', () => {
    const a = { id: '0001_a', steps: [{ addColumn: ['users', 'nickname', 'VARCHAR(50)'] }] };
    const b = { id: '0001_a', steps: [{ addColumn: ['users', 'nickname', 'VARCHAR(100)'] }] };
    expect(computeChecksum(a)).not.toBe(computeChecksum(b));
  });
});

describe('실행 계획 (planMigrations)', () => {
  const baselineRow = { id: '0001_baseline', checksum: computeChecksum(migrations[0]) };

  it('아무것도 적용되지 않았으면 전부 대기 중', () => {
    expect(planMigrations([], [migrations[0], second]).map((m) => m.id)).toEqual([
      '0001_baseline',
      '0002_example',
    ]);
  });

  it('적용된 것은 건너뛰고 새 것만 돌려준다', () => {
    expect(planMigrations([baselineRow], [migrations[0], second]).map((m) => m.id)).toEqual(['0002_example']);
  });

  it('적용된 마이그레이션이 수정됐으면 거부한다', () => {
    const tampered = [{ ...migrations[0], steps: [...migrations[0].steps, 'SELECT 1'] }];
    expect(() => planMigrations([baselineRow], tampered)).toThrow(
      expect.objectContaining({ code: 'CHECKSUM_MISMATCH', migrationId: '0001_baseline' })
    );
  });

  it('DB 에 적용된 것이 코드에 없으면 거부한다 (오래된 코드 배포)', () => {
    expect(() => planMigrations([{ id: '0009_future', checksum: 'x' }], migrations)).toThrow(
      expect.objectContaining({ code: 'MISSING_MIGRATION' })
    );
  });

  it('이미 적용된 번호보다 앞선 새 마이그레이션은 거부한다', () => {
    const applied = [{ id: '0002_example', checksum: computeChecksum(second) }];
    expect(() => planMigrations(applied, [migrations[0], second])).toThrow(
      expect.objectContaining({ code: 'OUT_OF_ORDER', migrationId: '0001_baseline' })
    );
  });
});

describe('실행 (runMigrations)', () => {
  it('빈 DB: 전부 실행하고 기록한 뒤 잠금을 푼다', async () => {
    const { pool, state } = createFakePool();

    const result = await runMigrations(pool, baselineOnly);

    expect(result.applied).toEqual(['0001_baseline']);
    expect(state.rows).toEqual([{ id: '0001_baseline', checksum: computeChecksum(migrations[0]) }]);
    expect(state.log[state.log.length - 1]).toContain('RELEASE_LOCK');
    expect(state.released).toBe(1);
  });

  it('두 번째 실행은 아무것도 하지 않는다', async () => {
    const { pool, state } = createFakePool();
    await runMigrations(pool, baselineOnly);
    const before = state.log.length;

    const result = await runMigrations(pool, baselineOnly);

    expect(result.applied).toEqual([]);
    expect(state.log.slice(before).some((line) => line.startsWith('CREATE TABLE IF NOT EXISTS users'))).toBe(false);
  });

  it('컬럼을 새로 추가했을 때만 onAdded(백필)를 실행한다', async () => {
    const fresh = createFakePool();
    await runMigrations(fresh.pool, baselineOnly);
    expect(fresh.state.log.some((line) => line.startsWith('UPDATE transactions'))).toBe(true);

    const existing = createFakePool({ existingColumns: ['transactions.escrow_status'] });
    await runMigrations(existing.pool, baselineOnly);
    expect(existing.state.log.some((line) => line.startsWith('UPDATE transactions'))).toBe(false);
  });

  it('잠금을 얻지 못하면 스키마를 건드리지 않는다', async () => {
    const { pool, state } = createFakePool({ lockAcquired: 0 });

    await expect(runMigrations(pool, baselineOnly)).rejects.toMatchObject({ code: 'LOCK_TIMEOUT' });

    expect(state.log.some((line) => line.startsWith('CREATE TABLE'))).toBe(false);
    // 내가 잡지 않은 잠금을 풀면 안 된다
    expect(state.log.some((line) => line.includes('RELEASE_LOCK'))).toBe(false);
    expect(state.released).toBe(1);
  });

  it('중간에 실패하면 기록하지 않고 잠금을 풀며, 다시 실행하면 처음부터 재시도한다', async () => {
    const { pool, state } = createFakePool({ failOn: /^CREATE TABLE IF NOT EXISTS reviews/ });

    await expect(runMigrations(pool, baselineOnly)).rejects.toMatchObject({
      code: 'STEP_FAILED',
      migrationId: '0001_baseline',
    });
    expect(state.rows).toEqual([]);
    expect(state.log[state.log.length - 1]).toContain('RELEASE_LOCK');

    state.failOn = null;
    const retry = await runMigrations(pool, baselineOnly);
    expect(retry.applied).toEqual(['0001_baseline']);
  });
});
