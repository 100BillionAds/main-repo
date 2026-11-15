'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './PointsWithdraw.module.css';

const WITHDRAWAL_FEE = 10000;

export default function PointsWithdrawPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchPoints();
  }, [session]);

  const fetchPoints = async () => {
    try {
      const response = await fetch('/api/points');
      const data = await response.json();
      if (data.success) {
        setPoints(data.points);
      }
    } catch (error) {
      console.error('포인트 조회 오류:', error);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount, 10);
    if (!amount || amount <= 0) {
      alert('인출 금액을 입력해주세요.');
      return;
    }

    if (amount < 50000) {
      alert('최소 인출 금액은 5만원입니다.');
      return;
    }

    if (amount + WITHDRAWAL_FEE > points) {
      alert(`포인트가 부족합니다. (필요: ${(amount + WITHDRAWAL_FEE).toLocaleString()}원, 보유: ${points.toLocaleString()}원)`);
      return;
    }

    if (!bankName || !accountNumber || !accountHolder) {
      alert('계좌 정보를 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/points/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          bank_name: bankName,
          account_number: accountNumber,
          account_holder: accountHolder,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        router.push('/points/charge');
      } else {
        alert(data.error || '포인트 인출에 실패했습니다.');
      }
    } catch (error) {
      console.error('포인트 인출 오류:', error);
      alert('포인트 인출 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = parseInt(withdrawAmount || '0', 10) + WITHDRAWAL_FEE;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/points/charge" className={styles.backButton}>
          ← 포인트 충전
        </Link>
        <h1 className={styles.title}>💰 포인트 인출</h1>
      </div>

      <div className={styles.content}>
        {/* 포인트 잔액 */}
        <div className={styles.balanceCard}>
          <div className={styles.balanceLabel}>보유 포인트</div>
          <div className={styles.balanceAmount}>{points.toLocaleString()}원</div>
        </div>

        {/* 인출 섹션 */}
        <div className={styles.withdrawSection}>
          <h2 className={styles.sectionTitle}>인출 신청</h2>

          {/* 인출 금액 입력 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>인출 금액</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="금액을 입력하세요 (최소 1만원)"
              className={styles.input}
              min="10000"
              step="10000"
            />
          </div>

          {/* 수수료 안내 */}
          <div className={styles.feeInfo}>
            <div className={styles.feeRow}>
              <span>인출 금액</span>
              <span>{parseInt(withdrawAmount || '0', 10).toLocaleString()}원</span>
            </div>
            <div className={styles.feeRow}>
              <span>수수료</span>
              <span className={styles.feeAmount}>- {WITHDRAWAL_FEE.toLocaleString()}원</span>
            </div>
            <div className={styles.feeRow + ' ' + styles.totalRow}>
              <span>차감 포인트</span>
              <span className={styles.totalAmount}>{totalAmount.toLocaleString()}원</span>
            </div>
          </div>

          {/* 계좌 정보 */}
          <div className={styles.accountSection}>
            <h3 className={styles.subTitle}>계좌 정보</h3>
            
            <div className={styles.inputGroup}>
              <label className={styles.label}>은행명</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className={styles.select}
              >
                <option value="">은행을 선택하세요</option>
                <option value="국민은행">국민은행</option>
                <option value="신한은행">신한은행</option>
                <option value="우리은행">우리은행</option>
                <option value="하나은행">하나은행</option>
                <option value="농협은행">농협은행</option>
                <option value="기업은행">기업은행</option>
                <option value="카카오뱅크">카카오뱅크</option>
                <option value="토스뱅크">토스뱅크</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>계좌번호</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                placeholder="계좌번호를 입력하세요"
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>예금주</label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="예금주명을 입력하세요"
                className={styles.input}
              />
            </div>
          </div>

          {/* 인출 버튼 */}
          <button
            onClick={handleWithdraw}
            disabled={isLoading}
            className={styles.withdrawButton}
          >
            {isLoading ? '처리 중...' : '인출 신청하기'}
          </button>

          <div className={styles.notice}>
            <p>• 최소 인출 금액은 1만원입니다.</p>
            <p>• 인출 시 수수료 {WITHDRAWAL_FEE.toLocaleString()}원이 차감됩니다.</p>
            <p>• 인출 신청 후 영업일 기준 1~3일 내에 처리됩니다.</p>
            <p>• 계좌 정보가 정확하지 않을 경우 인출이 지연될 수 있습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
