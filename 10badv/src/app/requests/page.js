'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './RequestsPage.module.css';

export default function RequestsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN'); // OPEN, MATCHED, COMPLETED, CANCELLED

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/requests?status=${filter}`);
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('의뢰 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = () => {
    router.push('/requests/create');
  };

  const handleViewDetail = (id) => {
    router.push(`/requests/${id}`);
  };

  const getStatusBadge = (status) => {
    const badges = {
      OPEN: { text: '모집중', color: '#10b981' },
      MATCHED: { text: '매칭완료', color: '#3b82f6' },
      COMPLETED: { text: '완료', color: '#6b7280' },
      CANCELLED: { text: '취소', color: '#ef4444' }
    };
    const badge = badges[status] || badges.OPEN;
    return (
      <span className={styles.statusBadge} style={{ background: badge.color }}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>🎨 디자인 의뢰</h1>
            <p className={styles.subtitle}>
              디자이너에게 간판 디자인을 의뢰하고 제안을 받아보세요
            </p>
          </div>
          
          {session && (
            <button onClick={handleCreateRequest} className={styles.createButton}>
              ✍️ 의뢰하기
            </button>
          )}
        </div>

        <div className={styles.filterContainer}>
          <button
            onClick={() => setFilter('OPEN')}
            className={filter === 'OPEN' ? styles.filterButtonActive : styles.filterButton}
          >
            모집중
          </button>
          <button
            onClick={() => setFilter('MATCHED')}
            className={filter === 'MATCHED' ? styles.filterButtonActive : styles.filterButton}
          >
            매칭완료
          </button>
          <button
            onClick={() => setFilter('COMPLETED')}
            className={filter === 'COMPLETED' ? styles.filterButtonActive : styles.filterButton}
          >
            완료
          </button>
          <button
            onClick={() => setFilter('CANCELLED')}
            className={filter === 'CANCELLED' ? styles.filterButtonActive : styles.filterButton}
          >
            취소
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>로딩중...</div>
        ) : requests.length === 0 ? (
          <div className={styles.empty}>
            <p>📭 아직 의뢰가 없습니다.</p>
            {session && (
              <button onClick={handleCreateRequest} className={styles.createButtonSmall}>
                첫 의뢰 등록하기
              </button>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {requests.map((request) => (
              <div
                key={request.id}
                className={styles.card}
                onClick={() => handleViewDetail(request.id)}
              >
                <div className={styles.cardHeader}>
                  {getStatusBadge(request.status)}
                  <span className={styles.category}>{request.category || '기타'}</span>
                </div>
                
                <h3 className={styles.cardTitle}>{request.title}</h3>
                <p className={styles.cardDescription}>
                  {request.description?.substring(0, 100)}
                  {request.description?.length > 100 && '...'}
                </p>
                
                <div className={styles.cardFooter}>
                  <div className={styles.budget}>
                    💰 예산: {request.budget ? `${Number(request.budget).toLocaleString()}원` : '협의'}
                  </div>
                  <div className={styles.author}>
                    👤 {request.client_name || request.client_username}
                  </div>
                </div>
                
                <div className={styles.cardDate}>
                  {new Date(request.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
