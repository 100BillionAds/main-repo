'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './payment.module.css';

export default function PaymentForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  
  // URL 파라미터에서 정보 가져오기
  const portfolioId = searchParams.get('portfolio');
  const portfolioTitle = searchParams.get('title');
  const portfolioAmount = searchParams.get('amount');

  const [formData, setFormData] = useState({
    amount: portfolioAmount || '100000',
    method: 'card',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    holderName: '',
  });

  useEffect(() => {
    if (portfolioAmount) {
      setFormData(prev => ({ ...prev, amount: portfolioAmount }));
    }
  }, [portfolioAmount]);

  const [errors, setErrors] = useState({});

  const paymentMethods = [
    { id: 'card', label: '신용/체크카드', icon: '💳' },
    { id: 'bank', label: '계좌이체', icon: '🏦' },
    { id: 'virtual', label: '가상계좌', icon: '🎫' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleMethodChange = (method) => {
    setFormData(prev => ({ ...prev, method }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || parseInt(formData.amount) < 1000) {
      newErrors.amount = '최소 1,000원 이상 입력하세요';
    }

    if (formData.method === 'card') {
      if (!formData.cardNumber || formData.cardNumber.length < 16) {
        newErrors.cardNumber = '카드번호를 정확히 입력하세요';
      }
      if (!formData.cardExpiry || formData.cardExpiry.length < 4) {
        newErrors.cardExpiry = '유효기간을 입력하세요 (MMYY)';
      }
      if (!formData.cardCvc || formData.cardCvc.length < 3) {
        newErrors.cardCvc = 'CVC 번호를 입력하세요';
      }
      if (!formData.holderName) {
        newErrors.holderName = '카드 소유자명을 입력하세요';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // 1. 결제 처리 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2. 결제 API 호출
      const paymentResponse = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId: session?.user?.id,
          userName: session?.user?.name,
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error('결제 실패');
      }

      // 3. 포트폴리오 구매인 경우 거래 생성
      if (portfolioId) {
        const transactionResponse = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portfolio_id: parseInt(portfolioId),
            amount: parseInt(formData.amount),
            payment_method: formData.method,
          }),
        });

        const transactionData = await transactionResponse.json();
        
        if (transactionData.success) {
          setTransactionId(transactionData.transactionId);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        if (transactionId) {
          router.push('/transactions');
        } else {
          router.push('/dashboard');
        }
      }, 3000);
    } catch (error) {
      alert('결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>결제 처리 중...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.successContainer}>
          <div className={styles.successIcon}>✅</div>
          <h2 className={styles.successTitle}>결제 완료!</h2>
          <p className={styles.successText}>결제가 성공적으로 처리되었습니다.</p>
          {transactionId && (
            <p className={styles.successText}>거래 번호: #{transactionId}</p>
          )}
          <p className={styles.redirectText}>잠시 후 대시보드로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* 좌측: 결제 정보 */}
        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>결제 정보</h2>
          
          <div className={styles.orderSummary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>주문자</span>
              <span className={styles.summaryValue}>{session?.user?.name}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>이메일</span>
              <span className={styles.summaryValue}>{session?.user?.email || '미등록'}</span>
            </div>
            <div className={styles.summaryDivider}></div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>상품명</span>
              <span className={styles.summaryValue}>
                {portfolioTitle ? decodeURIComponent(portfolioTitle) : '포트폴리오 구매'}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>결제 금액</span>
              <span className={styles.summaryTotal}>
                {parseInt(formData.amount || 0).toLocaleString()}원
              </span>
            </div>
          </div>

          <div className={styles.securityBadges}>
            <div className={styles.badge}>🔒 SSL 보안</div>
            <div className={styles.badge}>✅ 안전결제</div>
            <div className={styles.badge}>🛡️ 개인정보보호</div>
          </div>
        </div>

        {/* 우측: 결제 수단 */}
        <div className={styles.formSection}>
          <h1 className={styles.title}>결제하기</h1>
          <p className={styles.subtitle}>안전하고 빠른 결제 시스템</p>

          <form onSubmit={handleSubmit}>
            {/* 결제 금액 */}
            <div className={styles.formGroup}>
              <label className={styles.label}>결제 금액</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className={`${styles.input} ${errors.amount ? styles.inputError : ''}`}
                placeholder="금액을 입력하세요"
              />
              {errors.amount && <span className={styles.errorText}>{errors.amount}</span>}
            </div>

            {/* 결제 수단 선택 */}
            <div className={styles.formGroup}>
              <label className={styles.label}>결제 수단</label>
              <div className={styles.methodButtons}>
                {paymentMethods.map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => handleMethodChange(method.id)}
                    className={`${styles.methodButton} ${formData.method === method.id ? styles.methodButtonActive : ''}`}
                  >
                    <span className={styles.methodIcon}>{method.icon}</span>
                    <span className={styles.methodLabel}>{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 카드 결제 폼 */}
            {formData.method === 'card' && (
              <div className={styles.cardForm}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>카드 번호</label>
                  <input
                    type="text"
                    name="cardNumber"
                    value={formData.cardNumber}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.cardNumber ? styles.inputError : ''}`}
                    placeholder="0000 0000 0000 0000"
                    maxLength="16"
                  />
                  {errors.cardNumber && <span className={styles.errorText}>{errors.cardNumber}</span>}
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>유효기간</label>
                    <input
                      type="text"
                      name="cardExpiry"
                      value={formData.cardExpiry}
                      onChange={handleChange}
                      className={`${styles.input} ${errors.cardExpiry ? styles.inputError : ''}`}
                      placeholder="MMYY"
                      maxLength="4"
                    />
                    {errors.cardExpiry && <span className={styles.errorText}>{errors.cardExpiry}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>CVC</label>
                    <input
                      type="text"
                      name="cardCvc"
                      value={formData.cardCvc}
                      onChange={handleChange}
                      className={`${styles.input} ${errors.cardCvc ? styles.inputError : ''}`}
                      placeholder="123"
                      maxLength="3"
                    />
                    {errors.cardCvc && <span className={styles.errorText}>{errors.cardCvc}</span>}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>카드 소유자명</label>
                  <input
                    type="text"
                    name="holderName"
                    value={formData.holderName}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.holderName ? styles.inputError : ''}`}
                    placeholder="홍길동"
                  />
                  {errors.holderName && <span className={styles.errorText}>{errors.holderName}</span>}
                </div>
              </div>
            )}

            {/* 계좌이체 */}
            {formData.method === 'bank' && (
              <div className={styles.bankInfo}>
                <p className={styles.bankText}>📌 계좌이체 안내</p>
                <p className={styles.bankDetail}>입금 계좌: 국민은행 123-456-789012</p>
                <p className={styles.bankDetail}>예금주: (주)백억광고</p>
                <p className={styles.bankWarning}>⚠️ 입금 후 확인까지 1~2시간 소요됩니다.</p>
              </div>
            )}

            {/* 가상계좌 */}
            {formData.method === 'virtual' && (
              <div className={styles.bankInfo}>
                <p className={styles.bankText}>📌 가상계좌 안내</p>
                <p className={styles.bankDetail}>결제 완료 후 가상계좌가 발급됩니다.</p>
                <p className={styles.bankWarning}>⚠️ 발급 후 24시간 내 입금해주세요.</p>
              </div>
            )}

            {/* 결제 버튼 */}
            <button type="submit" className={styles.submitButton}>
              {parseInt(formData.amount || 0).toLocaleString()}원 결제하기
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
