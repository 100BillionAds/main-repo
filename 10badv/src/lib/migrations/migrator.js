/**
 * 스키마 마이그레이션 러너.
 *
 * 하는 일
 *  1. DB 잠금(GET_LOCK)을 잡는다 — 서버 여러 대가 동시에 떠도 한 대만 스키마를 바꾼다.
 *  2. schema_migrations 테이블에서 "이미 적용한 목록"을 읽는다.
 *  3. 코드의 목록과 대조해 검증한다 — 적용된 마이그레이션이 바뀌었거나(체크섬),
 *     사라졌거나, 순서가 뒤집혔으면 아무것도 실행하지 않고 멈춘다.
 *  4. 아직 적용하지 않은 것만 순서대로 실행하고, 하나 끝날 때마다 기록한다.
 *
 * 마이그레이션은 "데이터"다 (함수가 아니다). steps 배열의 각 항목은 아래 셋 중 하나.
 *  - 'SQL 문자열'                                        그대로 실행
 *  - { addColumn: [table, column, definition], onAdded } 컬럼이 없을 때만 추가. 추가했을 때만 onAdded SQL 실행
 *  - { addIndex: [table, name, columns], unique }        인덱스가 없을 때만 생성
 *
 * 데이터로 두는 이유: 내용 전체로 체크섬을 계산할 수 있어서, 적용된 마이그레이션을
 * 누가 고치면 바로 드러난다. (함수는 빌드 때 압축되면서 소스가 달라져 체크섬을 쓸 수 없다)
 *
 * MySQL/TiDB 의 DDL 은 트랜잭션으로 되돌릴 수 없다. 그래서 중간에 실패하면 "반쯤 적용된"
 * 상태가 남고, 기록은 남지 않으므로 다음 실행 때 그 마이그레이션을 처음부터 다시 시도한다.
 * addColumn/addIndex 가 "없을 때만" 동작하는 것은 이 재시도가 안전하도록 하기 위해서다.
 */
import { createHash } from 'node:crypto';

export const MIGRATIONS_TABLE = 'schema_migrations';
const ID_PATTERN = /^\d{4}_[a-z0-9_]+$/;
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const DEFAULT_LOCK_TIMEOUT_SECONDS = 60;

export class MigrationError extends Error {
  constructor(message, { code, migrationId, cause } = {}) {
    super(message);
    this.name = 'MigrationError';
    this.code = code;
    this.migrationId = migrationId;
    if (cause) this.cause = cause;
  }
}

/** 마이그레이션 내용(id + steps)의 SHA-256. 줄 끝 공백·개행 차이는 무시한다. */
export function computeChecksum(migration) {
  const normalize = (sql) =>
    String(sql)
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');

  const canonical = migration.steps.map((step) => {
    if (typeof step === 'string') return { sql: normalize(step) };
    if (step.addColumn) {
      return {
        addColumn: step.addColumn.map(normalize),
        onAdded: (step.onAdded || []).map(normalize),
      };
    }
    return { addIndex: step.addIndex.map(normalize), unique: Boolean(step.unique) };
  });

  return createHash('sha256')
    .update(JSON.stringify({ id: migration.id, steps: canonical }))
    .digest('hex');
}

function assertIdentifier(value, label, migrationId) {
  if (!IDENTIFIER_PATTERN.test(String(value))) {
    throw new MigrationError(`${migrationId}: ${label} 이름이 올바르지 않습니다: ${value}`, {
      code: 'INVALID_DEFINITION',
      migrationId,
    });
  }
}

/** 코드에 정의된 마이그레이션 목록 자체가 올바른지 확인한다 (DB 와 무관). */
export function validateDefinitions(migrations) {
  let previousId = '';
  for (const migration of migrations) {
    const id = migration?.id;
    if (!ID_PATTERN.test(String(id))) {
      throw new MigrationError(
        `마이그레이션 id 형식이 올바르지 않습니다: ${id} (예: 0002_add_ai_requests)`,
        { code: 'INVALID_DEFINITION', migrationId: id }
      );
    }
    if (id <= previousId) {
      throw new MigrationError(
        `마이그레이션 순서가 잘못됐습니다: ${id} 가 ${previousId} 뒤에 있습니다. 번호 오름차순, 중복 없이 나열하세요.`,
        { code: 'INVALID_DEFINITION', migrationId: id }
      );
    }
    if (!Array.isArray(migration.steps) || migration.steps.length === 0) {
      throw new MigrationError(`${id}: steps 가 비어 있습니다.`, {
        code: 'INVALID_DEFINITION',
        migrationId: id,
      });
    }
    for (const step of migration.steps) {
      if (typeof step === 'string') {
        if (!step.trim()) {
          throw new MigrationError(`${id}: 빈 SQL 이 있습니다.`, { code: 'INVALID_DEFINITION', migrationId: id });
        }
      } else if (step?.addColumn) {
        const [table, column, definition] = step.addColumn;
        assertIdentifier(table, '테이블', id);
        assertIdentifier(column, '컬럼', id);
        if (!definition) {
          throw new MigrationError(`${id}: ${table}.${column} 의 컬럼 정의가 없습니다.`, {
            code: 'INVALID_DEFINITION',
            migrationId: id,
          });
        }
      } else if (step?.addIndex) {
        const [table, name, columns] = step.addIndex;
        assertIdentifier(table, '테이블', id);
        assertIdentifier(name, '인덱스', id);
        if (!columns) {
          throw new MigrationError(`${id}: 인덱스 ${name} 의 컬럼이 없습니다.`, {
            code: 'INVALID_DEFINITION',
            migrationId: id,
          });
        }
      } else {
        throw new MigrationError(`${id}: 알 수 없는 step 형식입니다.`, {
          code: 'INVALID_DEFINITION',
          migrationId: id,
        });
      }
    }
    previousId = id;
  }
}

/**
 * 적용 기록(appliedRows)과 코드(migrations)를 대조해 실행할 목록을 돌려준다.
 * 어긋난 점이 있으면 MigrationError 를 던진다 — 이 경우 아무것도 실행하면 안 된다.
 *
 * @param {{id: string, checksum: string}[]} appliedRows
 * @returns {object[]} 아직 적용되지 않은 마이그레이션 (순서대로)
 */
export function planMigrations(appliedRows, migrations) {
  validateDefinitions(migrations);

  const byId = new Map(migrations.map((migration) => [migration.id, migration]));
  let lastAppliedId = '';

  for (const row of appliedRows) {
    const migration = byId.get(row.id);
    if (!migration) {
      throw new MigrationError(
        `DB 에는 ${row.id} 가 적용돼 있는데 코드에 없습니다. DB 보다 오래된 코드를 배포했거나 마이그레이션 파일이 삭제됐습니다.`,
        { code: 'MISSING_MIGRATION', migrationId: row.id }
      );
    }
    if (computeChecksum(migration) !== row.checksum) {
      throw new MigrationError(
        `${row.id} 의 내용이 적용 당시와 다릅니다. 이미 적용된 마이그레이션은 수정하지 말고, 변경은 새 마이그레이션으로 추가하세요.`,
        { code: 'CHECKSUM_MISMATCH', migrationId: row.id }
      );
    }
    if (row.id > lastAppliedId) lastAppliedId = row.id;
  }

  const appliedIds = new Set(appliedRows.map((row) => row.id));
  const pending = migrations.filter((migration) => !appliedIds.has(migration.id));

  for (const migration of pending) {
    if (migration.id < lastAppliedId) {
      throw new MigrationError(
        `${migration.id} 는 이미 적용된 ${lastAppliedId} 보다 번호가 앞섭니다. 새 마이그레이션은 항상 가장 큰 번호로 추가하세요.`,
        { code: 'OUT_OF_ORDER', migrationId: migration.id }
      );
    }
  }

  return pending;
}

async function columnExists(connection, table, column) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS cnt
       FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

async function indexExists(connection, table, name) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS cnt
       FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, name]
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

async function runStep(connection, step) {
  if (typeof step === 'string') {
    await connection.query(step);
    return;
  }

  if (step.addColumn) {
    const [table, column, definition] = step.addColumn;
    if (await columnExists(connection, table, column)) return;
    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    for (const sql of step.onAdded || []) {
      await connection.query(sql);
    }
    return;
  }

  // MySQL 은 CREATE INDEX IF NOT EXISTS 를 지원하지 않아 직접 확인한다.
  const [table, name, columns] = step.addIndex;
  if (await indexExists(connection, table, name)) return;
  await connection.query(`CREATE ${step.unique ? 'UNIQUE ' : ''}INDEX ${name} ON ${table}(${columns})`);
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id VARCHAR(100) NOT NULL PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      description VARCHAR(255) NULL,
      execution_ms INT NOT NULL DEFAULT 0,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function readApplied(connection) {
  const [rows] = await connection.query(
    `SELECT id, checksum, applied_at, execution_ms FROM ${MIGRATIONS_TABLE} ORDER BY id`
  );
  return rows;
}

async function lockNameFor(connection) {
  const [rows] = await connection.query('SELECT DATABASE() AS db');
  // 잠금 이름은 DB 서버 전체에서 공유되므로 데이터베이스 이름을 붙인다 (최대 64자).
  return `migrate:${rows?.[0]?.db || 'default'}`.slice(0, 64);
}

/**
 * 대기 중인 마이그레이션을 모두 적용한다.
 *
 * @param pool        mysql2 풀 (getConnection 을 제공)
 * @param migrations  코드에 정의된 전체 목록 (오름차순)
 * @returns {{ applied: string[], skipped: number }}
 */
export async function runMigrations(pool, migrations, { lockTimeoutSeconds = DEFAULT_LOCK_TIMEOUT_SECONDS } = {}) {
  validateDefinitions(migrations);

  // GET_LOCK 은 "커넥션"에 묶인다. 잠금을 잡은 커넥션 하나로 끝까지 실행해야 한다.
  const connection = await pool.getConnection();
  let lockName = null;

  try {
    const name = await lockNameFor(connection);
    const [lockRows] = await connection.query('SELECT GET_LOCK(?, ?) AS acquired', [name, lockTimeoutSeconds]);
    if (Number(lockRows?.[0]?.acquired) !== 1) {
      throw new MigrationError(
        `마이그레이션 잠금을 ${lockTimeoutSeconds}초 안에 얻지 못했습니다. 다른 서버가 마이그레이션 중일 수 있습니다.`,
        { code: 'LOCK_TIMEOUT' }
      );
    }
    lockName = name;

    await ensureMigrationsTable(connection);
    // 잠금을 잡은 "뒤에" 읽어야 한다. 기다리는 동안 다른 서버가 적용을 끝냈을 수 있다.
    const appliedRows = await readApplied(connection);
    const pending = planMigrations(appliedRows, migrations);

    const applied = [];
    for (const migration of pending) {
      const startedAt = Date.now();
      for (let index = 0; index < migration.steps.length; index += 1) {
        try {
          await runStep(connection, migration.steps[index]);
        } catch (error) {
          throw new MigrationError(
            `${migration.id} 의 ${index + 1}번째 단계에서 실패했습니다: ${error.message}`,
            { code: 'STEP_FAILED', migrationId: migration.id, cause: error }
          );
        }
      }
      await connection.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (id, checksum, description, execution_ms) VALUES (?, ?, ?, ?)`,
        [migration.id, computeChecksum(migration), migration.description || null, Date.now() - startedAt]
      );
      applied.push(migration.id);
    }

    return { applied, skipped: migrations.length - applied.length };
  } finally {
    if (lockName) {
      await connection.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => {});
    }
    connection.release();
  }
}

/** 현재 상태 조회 (아무것도 바꾸지 않는다). 기록 테이블이 아직 없으면 전부 대기 중으로 본다. */
export async function readMigrationStatus(pool, migrations) {
  const connection = await pool.getConnection();
  try {
    let appliedRows = [];
    try {
      appliedRows = await readApplied(connection);
    } catch (error) {
      if (error?.code !== 'ER_NO_SUCH_TABLE') throw error;
    }
    const appliedById = new Map(appliedRows.map((row) => [row.id, row]));
    return migrations.map((migration) => {
      const row = appliedById.get(migration.id);
      return {
        id: migration.id,
        description: migration.description || '',
        applied: Boolean(row),
        appliedAt: row?.applied_at || null,
        checksumMatches: row ? row.checksum === computeChecksum(migration) : null,
      };
    });
  } finally {
    connection.release();
  }
}
