'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './bugReport.module.css';

const CATEGORIES = [
  { value: '', label: '카테고리를 선택해주세요' },
  { value: 'login', label: '🔐 로그인/회원가입' },
  { value: 'payment', label: '💳 결제/포인트' },
  { value: 'transaction', label: '📋 거래/의뢰' },
  { value: 'portfolio', label: '🎨 포트폴리오' },
  { value: 'chat', label: '💬 채팅' },
  { value: 'ui', label: '🖥️ 화면/UI' },
  { value: 'performance', label: '⚡ 성능/속도' },
  { value: 'other', label: '📌 기타' },
];

const STATUS_MAP = {
  open: { label: '접수됨', className: 'statusOpen' },
  in_progress: { label: '처리중', className: 'statusInProgress' },
  resolved: { label: '해결됨', className: 'statusResolved' },
  closed: { label: '종료', className: 'statusClosed' },
};

export default function BugReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({ title: '', category: '', description: '', page_url: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/bug-report');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchReports();
    }
  }, [session]);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch('/api/bug-reports?limit=10');
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch {
      // 조회 실패 시 무시
    } finally {
      setLoadingReports(false);
    }
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) return setError('제목을 입력해주세요.');
    if (!form.category) return setError('카테고리를 선택해주세요.');
    if (!form.description.trim()) return setError('상세 내용을 입력해주세요.');
    if (form.description.trim().length < 10) return setError('상세 내용은 10자 이상 입력해주세요.');

    setSubmitting(true);

    try {
      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          page_url: form.page_url || window.location.href,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '신고 접수에 실패했습니다.');
      }

      setSubmitted(true);
      fetchReports();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {submitted ? (
          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✅</div>
            <div className={styles.successTitle}>오류 신고가 접수되었습니다!</div>
            <p className={styles.successText}>
              빠른 시일 내에 확인하고 처리하겠습니다.<br />
              처리 상태는 아래 '내 신고 내역'에서 확인하실 수 있습니다.
            </p>
            <button className={styles.backBtn} onClick={() => { setSubmitted(false); setForm({ title: '', category: '', description: '', page_url: '' }); }}>
              새로운 신고하기
            </button>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <div className={styles.headerIcon}>🐛</div>
              <h1 className={styles.title}>오류 신고</h1>
              <p className={styles.subtitle}>서비스 이용 중 불편한 점이나 오류를 발견하셨나요?<br />아래 양식을 작성해주시면 빠르게 해결하겠습니다.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="title">제목 *</label>
                <input
                  className={styles.input}
                  type="text"
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="예: 로그인 버튼을 눌러도 반응이 없어요"
                  maxLength={200}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="category">카테고리 *</label>
                <select
                  className={styles.select}
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value} disabled={!cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="description">상세 내용 *</label>
                <textarea
                  className={styles.textarea}
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="어떤 상황에서 오류가 발생했는지 최대한 자세히 설명해주세요.&#10;&#10;예:&#10;1. 로그인 페이지에서 이메일과 비밀번호 입력&#10;2. 로그인 버튼 클릭&#10;3. 아무 반응 없이 화면이 멈춤"
                  rows={6}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="page_url">오류 발생 페이지 (선택)</label>
                <input
                  className={styles.input}
                  type="text"
                  id="page_url"
                  name="page_url"
                  value={form.page_url}
                  onChange={handleChange}
                  placeholder="예: /portfolios/123"
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button className={styles.submitBtn} type="submit" disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    전송 중...
                  </span>
                ) : '오류 신고하기'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* 내 신고 내역 */}
      <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>📜 내 신고 내역</h2>
        {loadingReports ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
          </div>
        ) : reports.length > 0 ? (
          reports.map(report => {
            const statusInfo = STATUS_MAP[report.status] || STATUS_MAP.open;
            return (
              <div key={report.id} className={styles.reportItem}>
                <div className={styles.reportInfo}>
                  <div className={styles.reportTitle}>{report.title}</div>
                  <div className={styles.reportMeta}>
                    {CATEGORIES.find(c => c.value === report.category)?.label || report.category}
                    {' · '}
                    {new Date(report.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <span className={styles[statusInfo.className]}>{statusInfo.label}</span>
              </div>
            );
          })
        ) : (
          <div className={styles.emptyState}>아직 신고 내역이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
