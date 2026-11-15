/** @jest-environment node */

/**
 * 스키마 마이그레이션 통합 테스트 (실제 MySQL / TiDB 필요)
 *
 * GET_LOCK, information_schema 조회처럼 가짜 DB 로는 확인할 수 없는 부분을 검증한다.
 */

const defaults = {
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: '3306',
  DATABASE_USER: 'root',
  DATABASE_PASSWORD: 'root',
  DATABASE_NAME: '10badv_test',
};
for (const [key, value] of Object.entries(defaults)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const db = require('@/lib/db');
const migrations = require('@/lib/migrations').default;
const { runMigrations, computeChecksum, MIGRATIONS_TABLE } = require('@/lib/migrations/migrator');

jest.setTimeout(120000);

async function appliedRows() {
  return db.query(`SELECT id, checksum FROM ${MIGRATIONS_TABLE} ORDER BY id`);
}

describe('스키마 마이그레이션', () => {
  beforeAll(async () => {
    const ok = await db.initializeDatabase();
    expect(ok).toBe(true);
  });

  afterAll(async () => {
    await db.closeDatabasePool();
  });

  it('적용 기록이 코드의 목록·체크섬과 일치한다', async () => {
    const rows = await appliedRows();

    expect(rows.map((row) => row.id)).toEqual(migrations.map((migration) => migration.id));
    for (const migration of migrations) {
      const row = rows.find((candidate) => candidate.id === migration.id);
      expect(row.checksum).toBe(computeChecksum(migration));
    }

    const status = await db.getMigrationStatus();
    expect(status.every((entry) => entry.applied && entry.checksumMatches)).toBe(true);
  });

  it('다시 실행해도 아무것도 적용하지 않는다', async () => {
    const result = await runMigrations(db.default, migrations);
    expect(result.applied).toEqual([]);
  });

  it('동시에 여러 번 실행해도 새 마이그레이션은 한 번만 적용된다', async () => {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const table = `migration_probe_${suffix}`;
    const last = migrations[migrations.length - 1].id;
    const nextNumber = String(Number(last.slice(0, 4)) + 1).padStart(4, '0');
    const probe = {
      id: `${nextNumber}_probe_${suffix}`,
      description: '통합 테스트용 임시 마이그레이션',
      steps: [
        // IF NOT EXISTS 가 없으므로, 두 번 실행되면 두 번째가 "이미 존재" 오류로 실패한다.
        `CREATE TABLE ${table} (id INT PRIMARY KEY, note VARCHAR(20))`,
        { addColumn: [table, 'extra', 'INT NULL'] },
        { addIndex: [table, `idx_${table}`, 'note'] },
      ],
    };
    const withProbe = [...migrations, probe];

    try {
      const results = await Promise.all([
        runMigrations(db.default, withProbe),
        runMigrations(db.default, withProbe),
        runMigrations(db.default, withProbe),
      ]);

      const appliedCounts = results.map((result) => result.applied.length).sort();
      expect(appliedCounts).toEqual([0, 0, 1]);

      const rows = await db.query(`SELECT COUNT(*) AS cnt FROM ${MIGRATIONS_TABLE} WHERE id = ?`, [probe.id]);
      expect(Number(rows[0].cnt)).toBe(1);

      const columns = await db.query(
        'SELECT column_name AS name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?',
        [table]
      );
      expect(columns.map((column) => column.name).sort()).toEqual(['extra', 'id', 'note']);
    } finally {
      // 다른 테스트와 실제 목록에 영향을 주지 않도록 흔적을 지운다.
      await db.query(`DELETE FROM ${MIGRATIONS_TABLE} WHERE id = ?`, [probe.id]);
      await db.default.query(`DROP TABLE IF EXISTS ${table}`);
    }
  });

  it('적용된 마이그레이션의 내용이 바뀌면 실행을 거부한다', async () => {
    const tampered = [{ ...migrations[0], steps: [...migrations[0].steps, 'SELECT 1'] }, ...migrations.slice(1)];

    await expect(runMigrations(db.default, tampered)).rejects.toMatchObject({ code: 'CHECKSUM_MISMATCH' });

    // 거부한 뒤에도 잠금이 풀려 있어 정상 실행은 계속 된다.
    const result = await runMigrations(db.default, migrations);
    expect(result.applied).toEqual([]);
  });
});
