'use client';

import { use, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function MyPortfolioDetailPage({ params }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (!session || session.user.role !== 'designer') {
      router.push('/login');
      return;
    }
    fetchPortfolio();
  }, [session, id]);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/portfolios/${id}`);
      const data = await response.json();
      if (data.success) {
        setPortfolio(data.portfolio);
        setFormData({
          title: data.portfolio.title,
          description: data.portfolio.description,
          category: data.portfolio.category,
          price: data.portfolio.price,
        });
      }
    } catch (error) {
      console.error('포트폴리오 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/portfolios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        alert('포트폴리오가 수정되었습니다.');
        setIsEditing(false);
        fetchPortfolio();
      } else {
        alert(data.error || '수정 실패');
      }
    } catch (error) {
      alert('수정 중 오류 발생');
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const response = await fetch(`/api/portfolios/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        alert('포트폴리오가 삭제되었습니다.');
        router.push('/my-portfolios');
      } else {
        alert(data.error || '삭제 실패');
      }
    } catch (error) {
      alert('삭제 중 오류 발생');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>;
  if (!portfolio) return <div style={{ padding: '2rem', textAlign: 'center' }}>포트폴리오를 찾을 수 없습니다.</div>;

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '승인대기', color: '#f59e0b' },
      approved: { text: '승인완료', color: '#10b981' },
      rejected: { text: '반려', color: '#ef4444' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: badge.color, color: 'white', fontWeight: 'bold' }}>
        {badge.text}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '2rem' }}>
      {!isEditing ? (
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{portfolio.title}</h1>
            {getStatusBadge(portfolio.status)}
          </div>

          {portfolio.thumbnail_url && (
            <img src={portfolio.thumbnail_url} alt={portfolio.title} style={{ width: '100%', borderRadius: '0.5rem', marginBottom: '1rem' }} />
          )}

          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <strong>카테고리:</strong> {portfolio.category}
            </div>
            <div>
              <strong>가격:</strong> {portfolio.price?.toLocaleString()}원
            </div>
            <div>
              <strong>조회수:</strong> {portfolio.views || 0}
            </div>
            <div>
              <strong>좋아요:</strong> {portfolio.likes || 0}
            </div>
            <div>
              <strong>등록일:</strong> {new Date(portfolio.created_at).toLocaleDateString()}
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <strong>설명:</strong>
            <p style={{ marginTop: '0.5rem', color: '#666', whiteSpace: 'pre-wrap' }}>{portfolio.description}</p>
          </div>

          {portfolio.images && portfolio.images.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <strong>추가 이미지:</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                {portfolio.images.map((img, idx) => (
                  <img key={idx} src={img.image_url} alt={`이미지 ${idx + 1}`} style={{ width: '100%', borderRadius: '0.5rem' }} />
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              onClick={() => setIsEditing(true)}
              style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              편집하기
            </button>
            <button
              onClick={handleDelete}
              style={{ padding: '0.75rem 1.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              삭제하기
            </button>
            <button
              onClick={() => router.back()}
              style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              목록으로
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUpdate} style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>포트폴리오 편집</h2>
          
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>제목</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>카테고리</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}
                required
              >
                <option value="signage">간판</option>
                <option value="banner">배너</option>
                <option value="poster">포스터</option>
                <option value="logo">로고</option>
                <option value="package">패키지</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>가격</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>설명</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={8}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              저장하기
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              취소
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
