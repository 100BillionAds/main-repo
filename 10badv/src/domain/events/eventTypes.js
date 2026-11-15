/**
 * 도메인 이벤트: "업무에서 일어난 일"을 과거형으로 적은 기록.
 *
 * 거래가 완료되면 해야 할 일이 여럿 있다 (알림, 통계, 메일 ...). 이것들을 정산 코드 안에 직접 넣으면
 * 정산이 알림 실패 때문에 실패하거나, 새 후속 작업을 붙일 때마다 정산 코드를 고쳐야 한다.
 * 대신 정산은 "거래가 완료됐다"는 사실만 남기고, 후속 작업은 그 사실을 듣고 각자 따로 한다 (이벤트 기반).
 *
 * 이름 규칙: <애그리거트>.<과거형 동사>
 */
export const EVENT = Object.freeze({
  TRADE_CREATED: 'trade.created', // 구매 또는 제안 수락으로 거래가 생기고 대금이 보관됨
  TRADE_WORK_STARTED: 'trade.work_started', // 디자이너가 작업을 시작함
  TRADE_WORK_SUBMITTED: 'trade.work_submitted', // 디자이너가 작업 완료를 제출함
  TRADE_REVISION_REQUESTED: 'trade.revision_requested', // 구매자가 수정을 요청함
  TRADE_COMPLETED: 'trade.completed', // 구매확정(수동/자동)으로 정산됨
  TRADE_CANCELLED: 'trade.cancelled', // 취소(수동/자동)됨. 보관금이 있었다면 환불됨
});
