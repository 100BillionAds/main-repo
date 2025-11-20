'use client';

import { use, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MyTransactionDetailPage({ params }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchTransaction();
  }, [session, id]);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transactions/${id}`);
      const data = await response.json();
      if (data.success) {
        setTransaction(data.transaction);
      } else {
        console.error('거래 조회 실패:', data.error);
      }
    } catch (error) {
      console.error('거래 상세 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 채팅방 생성 또는 이동
  const handleStartChat = async () => {
    try {
      // 채팅방 생성 또는 조회 (transaction_id 포함)
      const response = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designerId: transaction.designer_id,
          portfolioId: transaction.portfolio_id,
          transactionId: transaction.id
        })
      });

      const data = await response.json();
      if (data.success) {
        router.push(`/chat?room=${data.roomId}`);
      } else {
        alert('채팅방 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('채팅방 생성 오류:', error);
      alert('채팅방 생성 중 오류가 발생했습니다.');
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      // awaiting_confirmation -> completed 전환 시 리뷰 작성 모달 표시 (광고주만)
      if (newStatus === 'completed' && transaction.status === 'awaiting_confirmation' && !isDesigner) {
        setShowReviewModal(true);
        return;
      }
      
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        alert('거래 상태가 업데이트되었습니다.');
        fetchTransaction();
      } else {
        alert(data.error || '상태 업데이트 실패');
      }
    } catch (error) {
      alert('상태 업데이트 중 오류 발생');
    }
  };

  const handleSubmitReview = async () => {
    try {
      console.log('📝 리뷰 제출:', {
        transaction_id: transaction.id,
        designer_id: transaction.designer_id,
        rating,
        comment: reviewComment
      });

      // 리뷰 작성
      const reviewResponse = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transaction.id,
          designer_id: transaction.designer_id,
          rating,
          comment: reviewComment
        })
      });

      const reviewData = await reviewResponse.json();
      
      if (!reviewResponse.ok) {
        console.error('❌ 리뷰 작성 실패:', reviewData);
        throw new Error(reviewData.error || '리뷰 작성 실패');
      }

      console.log('✅ 리뷰 작성 성공:', reviewData);

      // 거래 상태 업데이트
      const statusResponse = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      const statusData = await statusResponse.json();
      if (statusData.success) {
        alert('거래가 완료되고 리뷰가 등록되었습니다!');
        setShowReviewModal(false);
        fetchTransaction();
      } else {
        alert(statusData.error || '상태 업데이트 실패');
      }
    } catch (error) {
      console.error('리뷰 제출 오류:', error);
      alert(error.message || '리뷰 제출 중 오류가 발생했습니다.');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>;
  if (!transaction) return <div style={{ padding: '2rem', textAlign: 'center' }}>거래 정보를 찾을 수 없습니다.</div>;

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '결제대기', color: '#f59e0b' },
      in_progress: { text: '진행중', color: '#3b82f6' },
      awaiting_confirmation: { text: '완료대기', color: '#8b5cf6' },
      completed: { text: '완료', color: '#10b981' },
      cancelled: { text: '취소', color: '#ef4444' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: badge.color, color: 'white', fontWeight: 'bold' }}>
        {badge.text}
      </span>
    );
  };

  // 타입 변환하여 비교 (숫자 또는 문자열 모두 대응)
  const currentUserId = parseInt(session?.user?.id);
  const isDesigner = currentUserId === parseInt(transaction.designer_id);
  const isAdvertiser = currentUserId === parseInt(transaction.buyer_id);

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
        거래 상세 #{transaction.id}
      </h1>
      <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
        {transaction.portfolio_title && `${transaction.portfolio_title} - `}
        광고주: {transaction.buyer_name || transaction.buyer_username || '정보 없음'}
      </p>
      
      <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
        {transaction.portfolio_title && `${transaction.portfolio_title} - `}
        광고주: {transaction.buyer_name || transaction.buyer_username || '정보 없음'}
      </p>
      
      {/* 거래 상태 Stepper */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f9fafb', borderRadius: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          {/* 진행 바 */}
          <div style={{ position: 'absolute', top: '15px', left: '0', right: '0', height: '4px', background: '#e5e7eb', zIndex: 0 }}>
            <div style={{ 
              height: '100%', 
              background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
              width: transaction.status === 'pending' ? '0%' : transaction.status === 'in_progress' ? '50%' : transaction.status === 'awaiting_confirmation' ? '75%' : '100%',
              transition: 'width 0.3s ease'
            }} />
          </div>
          
          {/* Step 1: 거래 대기 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, position: 'relative' }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', 
              background: ['pending', 'in_progress', 'awaiting_confirmation', 'completed'].includes(transaction.status) ? '#10b981' : '#e5e7eb',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.5rem'
            }}>
              1
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151' }}>거래 대기</span>
          </div>
          
          {/* Step 2: 진행 중 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, position: 'relative' }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', 
              background: ['in_progress', 'awaiting_confirmation', 'completed'].includes(transaction.status) ? '#3b82f6' : '#e5e7eb',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.5rem'
            }}>
              2
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151' }}>진행 중</span>
          </div>
          
          {/* Step 3: 완료 대기 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, position: 'relative' }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', 
              background: ['awaiting_confirmation', 'completed'].includes(transaction.status) ? '#8b5cf6' : '#e5e7eb',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.5rem'
            }}>
              3
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151' }}>완료 대기</span>
          </div>
          
          {/* Step 4: 거래 완료 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, position: 'relative' }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', 
              background: transaction.status === 'completed' ? '#10b981' : '#e5e7eb',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.5rem'
            }}>
              ✓
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151' }}>거래 완료</span>
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {getStatusBadge(transaction.status)}
        <span style={{ color: '#666' }}>등록일: {new Date(transaction.created_at).toLocaleDateString()}</span>
      </div>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <strong>포트폴리오:</strong> {transaction.portfolio_title || `#${transaction.portfolio_id}`}
        </div>
        <div>
          <strong>디자이너:</strong>{' '}
          {transaction.designer_id ? (
            <Link 
              href={`/designers/${transaction.designer_id}`}
              style={{ color: '#3b82f6', textDecoration: 'underline' }}
            >
              {transaction.designer_name || transaction.designer_username}
            </Link>
          ) : (
            <span>{transaction.designer_name || transaction.designer_username}</span>
          )}
        </div>
        <div>
          <strong>광고주:</strong> {transaction.buyer_name || transaction.buyer_username || '정보 없음'}
        </div>
        <div>
          <strong>금액:</strong> {transaction.amount?.toLocaleString()}원
        </div>
        {transaction.description && (
          <div>
            <strong>설명:</strong>
            <p style={{ marginTop: '0.5rem', color: '#666' }}>{transaction.description}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
        {/* 채팅하기 버튼 (항상 표시) */}
        <button
          onClick={handleStartChat}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '0.5rem', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          💬 채팅하기
        </button>
        
        {/* 디자이너: pending일 때만 "진행 중" 버튼 (프롬프트 요구사항) */}
        {isDesigner && transaction.status === 'pending' && (
          <button
            onClick={() => handleStatusUpdate('in_progress')}
            style={{ padding: '0.75rem 1.5rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🎨 진행 중
          </button>
        )}
        
        {/* 디자이너: in_progress일 때만 "작업 완료" 버튼 */}
        {isDesigner && transaction.status === 'in_progress' && (
          <button
            onClick={() => handleStatusUpdate('awaiting_confirmation')}
            style={{ padding: '0.75rem 1.5rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✅ 작업 완료 (시안 픽스)
          </button>
        )}
        
        {/* 광고주: awaiting_confirmation일 때만 "거래 확정 및 완료" 버튼 */}
        {isAdvertiser && transaction.status === 'awaiting_confirmation' && (
          <>
            <button
              onClick={() => handleStatusUpdate('completed')}
              style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✅ 거래 확정 및 완료
            </button>
            <button
              onClick={() => handleStatusUpdate('in_progress')}
              style={{ padding: '0.75rem 1.5rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              🔄 수정 요청
            </button>
          </>
        )}
        
        {/* 취소 버튼 (pending 상태일 때만) */}
        {transaction.status === 'pending' && (
          <button
            onClick={() => handleStatusUpdate('cancelled')}
            style={{ padding: '0.75rem 1.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ❌ 거래 취소
          </button>
        )}
        
        <button
          onClick={() => router.back()}
          style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ← 목록으로
        </button>
      </div>

      {/* 리뷰 작성 모달 */}
      {showReviewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '1rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              거래 완료 및 리뷰 작성
            </h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                별점 평가
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    style={{
                      fontSize: '2rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: star <= rating ? '#fbbf24' : '#d1d5db'
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                리뷰 내용 (선택사항)
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="작업에 대한 평가를 남겨주세요..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleSubmitReview}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                리뷰 제출 및 거래 완료
              </button>
              <button
                onClick={() => setShowReviewModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
