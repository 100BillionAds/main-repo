/**
 * 0003_add_ai_cache_hit — AI 호출 기록에 "캐시에서 답했는지" 표시.
 * 캐시로 답한 호출은 LLM 비용이 들지 않으므로 하루 한도에서 뺀다. 캐시 적중률 계산에도 쓴다.
 */
const migration = {
  id: '0003_add_ai_cache_hit',
  description: 'ai_requests.cache_hit 컬럼 추가',
  steps: [{ addColumn: ['ai_requests', 'cache_hit', 'TINYINT(1) NOT NULL DEFAULT 0'] }],
};

export default migration;
