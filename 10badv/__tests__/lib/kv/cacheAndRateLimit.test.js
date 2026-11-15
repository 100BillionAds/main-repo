/** @jest-environment node */

import { createCache } from '@/lib/cache';
import { createMemoryStore } from '@/lib/kv/memoryStore';
import { rateLimit } from '@/lib/rateLimit';

const brokenStore = {
  get: async () => {
    throw new Error('redis down');
  },
  set: async () => {
    throw new Error('redis down');
  },
  incrementWithExpiry: async () => {
    throw new Error('redis down');
  },
};

describe('메모리 저장소', () => {
  it('만료 시간이 지나면 값이 사라진다', async () => {
    let time = 1000;
    const store = createMemoryStore({ now: () => time });

    await store.set('k', 'v', 10);
    expect(await store.get('k')).toBe('v');

    time += 10001;
    expect(await store.get('k')).toBeNull();
  });

  it('횟수를 올리고, 구간이 끝나면 다시 1부터 센다', async () => {
    let time = 0;
    const store = createMemoryStore({ now: () => time });

    expect(await store.incrementWithExpiry('c', 1000)).toEqual({ count: 1, ttlMs: 1000 });
    time += 400;
    expect(await store.incrementWithExpiry('c', 1000)).toEqual({ count: 2, ttlMs: 600 });
    time += 700;
    expect(await store.incrementWithExpiry('c', 1000)).toEqual({ count: 1, ttlMs: 1000 });
  });

  it('최대 개수를 넘으면 오래된 것부터 지운다 (메모리가 끝없이 늘지 않게)', async () => {
    const store = createMemoryStore({ maxEntries: 2 });

    await store.set('a', '1', 100);
    await store.set('b', '1', 100);
    await store.set('c', '1', 100);

    expect(await store.get('a')).toBeNull();
    expect(await store.get('c')).toBe('1');
  });
});

describe('캐시', () => {
  it('객체를 넣고 꺼낸다', async () => {
    const cache = createCache({ store: createMemoryStore() });

    await cache.set('k', { text: '안녕', n: 1 }, 60);

    expect(await cache.get('k')).toEqual({ text: '안녕', n: 1 });
    expect(await cache.get('없는 키')).toBeNull();
  });

  it('TTL 이 0 이면 저장하지 않는다', async () => {
    const cache = createCache({ store: createMemoryStore() });
    await cache.set('k', { a: 1 }, 0);
    expect(await cache.get('k')).toBeNull();
  });

  it('저장소가 죽어도 예외를 던지지 않는다 — 없는 셈 친다', async () => {
    const errors = [];
    const cache = createCache({ store: brokenStore, onError: (error) => errors.push(error.message) });

    expect(await cache.get('k')).toBeNull();
    await expect(cache.set('k', { a: 1 }, 60)).resolves.toBeUndefined();
    expect(errors).toEqual(['redis down', 'redis down']);
  });

  it('깨진 값이 들어 있으면 없는 셈 친다', async () => {
    const cache = createCache({ store: { get: async () => '{깨진 JSON' }, onError: () => {} });
    expect(await cache.get('k')).toBeNull();
  });
});

describe('요청 제한', () => {
  it('한도까지 허용하고 그 뒤는 거부한다', async () => {
    const store = createMemoryStore();
    const results = [];
    for (let i = 0; i < 4; i += 1) {
      results.push(await rateLimit('user-1', { limit: 3, windowMs: 1000, store }));
    }

    expect(results.map((result) => result.success)).toEqual([true, true, true, false]);
    expect(results.map((result) => result.remaining)).toEqual([2, 1, 0, 0]);
  });

  it('기준이 다르면 따로 센다', async () => {
    const store = createMemoryStore();
    await rateLimit('user-1', { limit: 1, store });

    expect((await rateLimit('user-1', { limit: 1, store })).success).toBe(false);
    expect((await rateLimit('user-2', { limit: 1, store })).success).toBe(true);
  });

  it('동시에 20번 요청해도 한도(5)만큼만 통과한다', async () => {
    const store = createMemoryStore();

    const results = await Promise.all(
      Array.from({ length: 20 }, () => rateLimit('burst', { limit: 5, windowMs: 1000, store }))
    );

    expect(results.filter((result) => result.success)).toHaveLength(5);
  });

  it('구간이 끝나면 다시 허용한다', async () => {
    let time = 0;
    const store = createMemoryStore({ now: () => time });

    await rateLimit('user-1', { limit: 1, windowMs: 1000, store });
    expect((await rateLimit('user-1', { limit: 1, windowMs: 1000, store })).success).toBe(false);

    time += 1001;
    expect((await rateLimit('user-1', { limit: 1, windowMs: 1000, store })).success).toBe(true);
  });

  it('저장소가 죽으면 메모리로 대신 센다 (제한이 사라지지도, 전부 막히지도 않는다)', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const id = `fallback-${Date.now()}`;

    const first = await rateLimit(id, { limit: 1, store: brokenStore });
    const second = await rateLimit(id, { limit: 1, store: brokenStore });

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    spy.mockRestore();
  });
});
