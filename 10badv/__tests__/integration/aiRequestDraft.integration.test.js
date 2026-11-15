/** @jest-environment node */

/**
 * AI 의뢰서 초안 통합 테스트 (실제 MySQL / TiDB 필요, LLM 은 가짜 제공자)
 *
 * 사용 기록 SQL 과 하루 한도가 실제 DB 에서 동작하는지 확인한다.
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

// AI 응답 캐시를 실제 Redis 로 검증한다 (없으면 메모리 저장소로 같은 테스트가 돈다).
if (process.env.TEST_REDIS_URL) process.env.REDIS_URL = process.env.TEST_REDIS_URL;

const db = require('@/lib/db');
const { closeRedis, redisReady } = require('@/lib/redis');
const { createMockProvider } = require('@/lib/llm/mock');
const { startRequestDraft } = require('@/domain/ai/requestDraftService');

jest.setTimeout(60000);

const SUFFIX = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const input = { brief: '동네 카페 간판, 따뜻한 느낌으로 부탁드려요', category: '커피숍' };
const llm = createMockProvider({ reply: '제목: 카페 간판\n---\n본문', delayMs: 0 });

async function createUser(label) {
  const username = `ai_${label}_${SUFFIX}`;
  const [result] = await db.default.execute(
    'INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)',
    [username, 'not-a-real-hash', username, `${username}@test.local`, 'user']
  );
  return result.insertId;
}

async function draft(userId, draftInput = input, draftLlm = llm) {
  const { stream } = await startRequestDraft({ userId, input: draftInput, llm: draftLlm });
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks[chunks.length - 1];
}

async function usageRows(userId) {
  return db.query('SELECT * FROM ai_requests WHERE user_id = ? ORDER BY id', [userId]);
}

describe('AI 의뢰서 초안', () => {
  const savedLimit = process.env.LLM_DAILY_LIMIT_PER_USER;
  const savedTtl = process.env.LLM_CACHE_TTL_SECONDS;

  beforeEach(() => {
    // 한도·기록 테스트는 같은 입력을 반복하므로 캐시를 끈다. 캐시 테스트에서만 켠다.
    process.env.LLM_CACHE_TTL_SECONDS = '0';
  });

  beforeAll(async () => {
    expect(await db.initializeDatabase()).toBe(true);
    await redisReady();
  });

  afterEach(() => {
    if (savedLimit === undefined) delete process.env.LLM_DAILY_LIMIT_PER_USER;
    else process.env.LLM_DAILY_LIMIT_PER_USER = savedLimit;
    if (savedTtl === undefined) delete process.env.LLM_CACHE_TTL_SECONDS;
    else process.env.LLM_CACHE_TTL_SECONDS = savedTtl;
  });

  afterAll(async () => {
    await db.closeDatabasePool();
    await closeRedis();
  });

  it('초안을 만들고 사용 기록을 남긴다 (원문은 저장하지 않는다)', async () => {
    const userId = await createUser('ok');

    const done = await draft(userId);

    expect(done).toEqual({ type: 'done', title: '카페 간판', description: '본문' });
    const rows = await usageRows(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      feature: 'request_draft',
      prompt_version: 'v1',
      provider: 'mock',
      model: 'mock-1',
      status: 'success',
      input_chars: input.brief.length,
    });
    expect(rows[0].output_tokens).toBeGreaterThan(0);
    expect(JSON.stringify(rows[0])).not.toContain('따뜻한 느낌');
  });

  it('하루 한도를 넘으면 거부하고, 다른 사용자에게는 영향이 없다', async () => {
    process.env.LLM_DAILY_LIMIT_PER_USER = '2';
    const userId = await createUser('limit');
    const otherId = await createUser('other');

    await draft(userId);
    await draft(userId);
    await expect(draft(userId)).rejects.toMatchObject({ status: 429, code: 'AI_QUOTA_EXCEEDED' });
    // 거절된 요청은 횟수에 들어가지 않으므로, 계속 눌러도 한도가 더 줄지 않는다.
    await expect(draft(userId)).rejects.toMatchObject({ code: 'AI_QUOTA_EXCEEDED' });

    const rows = await usageRows(userId);
    expect(rows.map((row) => row.status)).toEqual(['success', 'success', 'rejected', 'rejected']);
    await expect(draft(otherId)).resolves.toMatchObject({ type: 'done' });
  });

  it('같은 입력은 캐시에서 답하고, 캐시 응답은 하루 한도를 쓰지 않는다', async () => {
    process.env.LLM_CACHE_TTL_SECONDS = '60';
    process.env.LLM_DAILY_LIMIT_PER_USER = '1';
    const userId = await createUser('cache');
    const uniqueInput = { brief: `캐시 테스트용 간판 의뢰 ${SUFFIX} 따뜻한 느낌` };
    let calls = 0;
    const countingLlm = {
      name: 'mock',
      model: 'mock-1',
      stream(request) {
        calls += 1;
        return llm.stream(request);
      },
    };

    const first = await draft(userId, uniqueInput, countingLlm);
    const second = await draft(userId, uniqueInput, countingLlm);
    const third = await draft(userId, uniqueInput, countingLlm);

    expect(calls).toBe(1);
    expect(first.cached).toBeUndefined();
    expect(second).toMatchObject({ title: '카페 간판', description: '본문', cached: true });
    expect(third.cached).toBe(true);

    // 한도가 1회인데도 세 번 모두 성공했다: 캐시 응답은 LLM 호출이 아니기 때문이다.
    const rows = await usageRows(userId);
    expect(rows.map((row) => [row.status, Number(row.cache_hit)])).toEqual([
      ['success', 0],
      ['success', 1],
      ['success', 1],
    ]);
    expect(rows[1]).toMatchObject({ provider: 'mock', model: 'mock-1', input_tokens: 0, output_tokens: 0 });
  });

  it('동시에 여러 번 요청해도 한도를 넘겨 통과하지 않는다', async () => {
    process.env.LLM_DAILY_LIMIT_PER_USER = '3';
    const userId = await createUser('race');

    const results = await Promise.allSettled(Array.from({ length: 8 }, () => draft(userId)));

    const passed = results.filter((result) => result.status === 'fulfilled').length;
    expect(passed).toBeLessThanOrEqual(3);
    const rows = await usageRows(userId);
    expect(rows.filter((row) => row.status === 'success')).toHaveLength(passed);
  });
});
