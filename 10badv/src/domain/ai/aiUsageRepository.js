import { query } from '@/lib/db';

/**
 * AI 사용 기록 저장소 (ai_requests)
 *
 * 호출마다 한 행: 누가, 어떤 기능을, 어떤 프롬프트 버전·모델로, 토큰을 얼마나 썼고, 얼마나 걸렸는지.
 * 프롬프트 원문과 응답은 저장하지 않는다 (개인정보·저장 비용). 글자 수와 토큰 수만 남긴다.
 * 용도: 사용자별 하루 한도, 비용 추적, 프롬프트 버전별 비교, 장애 분석.
 */

/** 호출 시작을 기록하고 id 를 돌려준다. */
export async function start({ userId, feature, promptVersion, inputChars }) {
  const result = await query(
    `INSERT INTO ai_requests (user_id, feature, prompt_version, input_chars, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [userId, feature, promptVersion, inputChars]
  );
  return result.insertId;
}

/** 캐시에서 답한 호출을 기록한다. LLM 을 부르지 않았으므로 토큰은 0 이고 하루 한도에 들어가지 않는다. */
export async function recordCacheHit({ userId, feature, promptVersion, inputChars, provider, model }) {
  await query(
    `INSERT INTO ai_requests
       (user_id, feature, prompt_version, input_chars, status, cache_hit, provider, model, input_tokens, output_tokens, latency_ms)
     VALUES (?, ?, ?, ?, 'success', 1, ?, ?, 0, 0, 0)`,
    [userId, feature, promptVersion, inputChars, provider ?? null, model ?? null]
  );
}

/** 최근 24시간 동안 이 사용자가 LLM 을 부른 횟수 (거절된 요청과 캐시 응답은 세지 않는다). 시각은 DB 시계 기준. */
export async function countRecent(userId) {
  const rows = await query(
    `SELECT COUNT(*) AS cnt FROM ai_requests
      WHERE user_id = ? AND status <> 'rejected' AND cache_hit = 0 AND created_at > NOW() - INTERVAL 1 DAY`,
    [userId]
  );
  return Number(rows[0]?.cnt || 0);
}

export async function markRejected(id) {
  await query("UPDATE ai_requests SET status = 'rejected' WHERE id = ?", [id]);
}

export async function markSuccess(id, { provider, model, inputTokens, outputTokens, latencyMs }) {
  await query(
    `UPDATE ai_requests
        SET status = 'success', provider = ?, model = ?, input_tokens = ?, output_tokens = ?, latency_ms = ?
      WHERE id = ?`,
    [provider ?? null, model ?? null, inputTokens ?? null, outputTokens ?? null, latencyMs ?? null, id]
  );
}

export async function markError(id, { errorCode, latencyMs }) {
  await query("UPDATE ai_requests SET status = 'error', error_code = ?, latency_ms = ? WHERE id = ?", [
    String(errorCode || 'UNKNOWN').slice(0, 50),
    latencyMs ?? null,
    id,
  ]);
}
