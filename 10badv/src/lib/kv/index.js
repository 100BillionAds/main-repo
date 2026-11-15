import { getRedis } from '@/lib/redis';
import { createMemoryStore } from '@/lib/kv/memoryStore';
import { createRedisStore } from '@/lib/kv/redisStore';

/**
 * 키-값 저장소 선택.
 *  - REDIS_URL 이 있으면 Redis (서버 여러 대가 공유, 재시작해도 유지)
 *  - 없으면 메모리 (이 서버 안에서만)
 * 메모리 저장소는 Redis 가 있을 때도 "Redis 장애 시 대역"으로 쓰인다.
 */
const memoryStore = createMemoryStore();
let redisStore = null;

/** 캐시·요청 제한이 쓸 기본 저장소 */
export function getStore() {
  const redis = getRedis();
  if (!redis) return memoryStore;
  if (!redisStore) redisStore = createRedisStore(redis);
  return redisStore;
}

/** 기본 저장소가 실패했을 때 쓸 저장소 */
export function getFallbackStore() {
  return memoryStore;
}
