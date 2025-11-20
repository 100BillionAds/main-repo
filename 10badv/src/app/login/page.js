'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        username: formData.username,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.brandSection}>
          <div className={styles.brandContent}>
            <div className={styles.logo}>
              <span className={styles.logoIcon}>💯</span>
              <span className={styles.logoText}>백억광고</span>
            </div>
            <h1 className={styles.brandTitle}>
              간판 디자인의<br />새로운 기준
            </h1>
            <p className={styles.brandDescription}>
              전문 디자이너와 함께하는<br />
              프리미엄 간판 제작 플랫폼
            </p>
            <div className={styles.features}>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>✓</span>
                <span>검증된 전문 디자이너</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>✓</span>
                <span>안전한 에스크로 결제</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>✓</span>
                <span>실시간 작업 진행 공유</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.formWrapper}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>로그인</h2>
              <p className={styles.formDescription}>
                계정에 로그인하여 서비스를 이용하세요
              </p>
            </div>

            {error && (
              <div className={styles.errorAlert}>
                <span className={styles.errorIcon}>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>아이디</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={styles.input}
                  placeholder="아이디를 입력하세요"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>비밀번호</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={styles.input}
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>

              <div className={styles.options}>
                <label className={styles.checkbox}>
                  <input type="checkbox" />
                  <span>로그인 상태 유지</span>
                </label>
                <Link href="/forgot-password" className={styles.forgotLink}>
                  비밀번호 찾기
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={styles.submitButton}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner}></span>
                    <span>로그인 중...</span>
                  </>
                ) : (
                  '로그인'
                )}
              </button>
            </form>

            <div className={styles.footer}>
              <span>아직 계정이 없으신가요?</span>
              <Link href="/register" className={styles.registerLink}>
                회원가입
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
