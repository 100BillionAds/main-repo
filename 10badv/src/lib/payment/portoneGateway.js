/**
 * 포트원(PortOne) 결제 게이트웨이.
 *
 * 외부 결제 시스템과 말하는 코드를 한곳에 모은다. 나머지 코드는 "결제 한 건을 조회한다"는
 * 사실만 알고, URL·인증 헤더·오류 형식은 모른다. (LLM 제공자를 lib/llm 뒤에 둔 것과 같은 방식)
 */
const API_BASE = 'https://api.portone.io';

/**
 * 결제 한 건을 포트원에서 조회한다 (V2 API, API Secret 으로 인증).
 * @returns {Promise<object>} 포트원 결제 객체 (status, amount.total, method ...)
 */
export async function fetchPayment(paymentId, { apiSecret = process.env.PORTONE_API_SECRET, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `PortOne ${apiSecret}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // 원인 파악용: 상태코드와 포트원 오류 type만 남긴다 (시크릿/결제 정보는 로그에 남기지 않음)
    console.error('포트원 결제 조회 실패', {
      status: response.status,
      type: errorData.type,
      message: errorData.message,
    });
    const error = new Error(
      errorData.message || `결제 검증 실패 (포트원 ${response.status} ${errorData.type || ''})`.trim()
    );
    error.upstreamStatus = response.status;
    throw error;
  }

  return response.json();
}
