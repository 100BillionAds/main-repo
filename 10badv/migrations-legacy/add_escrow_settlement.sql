-- 에스크로 자동정산 컬럼/인덱스 (수동 적용용)
-- 앱이 시작될 때 initializeDatabase() 가 같은 변경을 자동으로 적용한다.
-- 앱을 띄우지 않고 DB 만 먼저 올릴 때 이 파일을 사용한다. 한 번만 실행할 것.

ALTER TABLE transactions
  ADD COLUMN escrow_status ENUM('none', 'held', 'released', 'refunded') NOT NULL DEFAULT 'none',
  ADD COLUMN settled_by ENUM('buyer', 'designer', 'admin', 'auto') NULL,
  ADD COLUMN cancel_reason VARCHAR(255) NULL,
  ADD COLUMN started_at DATETIME NULL,
  ADD COLUMN submitted_at DATETIME NULL,
  ADD COLUMN auto_confirm_at DATETIME NULL,
  ADD COLUMN auto_cancel_at DATETIME NULL,
  ADD COLUMN completed_at DATETIME NULL,
  ADD COLUMN cancelled_at DATETIME NULL;

-- 기존 거래의 에스크로 상태를 결제 상태에서 역산
UPDATE transactions
   SET escrow_status = CASE
         WHEN payment_status = 'refunded' THEN 'refunded'
         WHEN payment_status = 'completed' AND status = 'completed' THEN 'released'
         WHEN payment_status = 'completed' AND status = 'cancelled' THEN 'refunded'
         WHEN payment_status = 'completed' THEN 'held'
         ELSE 'none'
       END;

CREATE INDEX idx_transactions_auto_confirm ON transactions(status, auto_confirm_at);
CREATE INDEX idx_transactions_auto_cancel ON transactions(status, auto_cancel_at);

-- 같은 결제/거래에 같은 종류의 포인트 기록이 두 번 남지 않게 한다.
-- 기존 데이터에 중복이 있으면 실패한다. 그 경우 중복 행을 먼저 정리할 것.
CREATE UNIQUE INDEX uniq_point_tx_reference ON point_transactions(reference_type, reference_id, type);
