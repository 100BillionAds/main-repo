'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import styles from './register.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    role: 'user', // user, designer, admin
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!formData.username || formData.username.length < 4) {
      newErrors.username = '아이디는 최소 4자 이상이어야 합니다.';
    }

    if (!formData.password || formData.password.length < 4) {
      newErrors.password = '비밀번호는 최소 4자 이상이어야 합니다.';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    if (!formData.name) {
      newErrors.name = '이름을 입력해주세요.';
    }

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 주소를 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      let avatarUrl = null;
      
      // 프로필 사진 업로드
      if (avatarFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', avatarFile);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          avatarUrl = uploadData.url;
        }
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          avatar_url: avatarUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // 자동 로그인
        await signIn('credentials', {
          username: formData.username,
          password: formData.password,
          redirect: false,
        });
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setErrors({ general: data.error || '회원가입에 실패했습니다.' });
      }
    } catch (err) {
      setErrors({ general: '서버 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // 입력 시 해당 필드 에러 제거
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, avatar: '파일 크기는 5MB 이하여야 합니다.' }));
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
      if (errors.avatar) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.avatar;
          return newErrors;
        });
      }
    }
  };

  if (success) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.successTitle}>회원가입 완료!</h2>
          <p className={styles.successText}>
            대시보드로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* 왼쪽: 브랜딩 섹션 */}
        <div className={styles.brandSection}>
          <div className={styles.brandContent}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>💯</div>
              <div className={styles.logoText}>백억광고</div>
            </div>
            <h1 className={styles.brandTitle}>
              간판 디자인의<br />새로운 시작
            </h1>
            <p className={styles.brandDescription}>
              지금 가입하고 전문 디자이너와 함께 멋진 간판을 만들어보세요
            </p>
            <div className={styles.features}>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>✓</div>
                <span>500+ 검증된 디자이너</span>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>✓</div>
                <span>안전한 거래 보장</span>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>✓</div>
                <span>빠른 제작 & 배송</span>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 회원가입 폼 */}
        <div className={styles.formSection}>
          <div className={styles.formWrapper}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>회원가입</h2>
              <p className={styles.formDescription}>
                무료로 시작하세요
              </p>
            </div>

            {errors.general && (
              <div className={styles.errorAlert}>
                <span className={styles.errorIcon}>⚠️</span>
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              {/* 계정 유형 선택 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>가입 유형</label>
                <div className={styles.roleButtons}>
                  <button
                    type="button"
                    className={`${styles.roleButton} ${formData.role === 'user' ? styles.roleButtonActive : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, role: 'user' }))}
                  >
                    <span className={styles.roleIcon}>👤</span>
                    <span>광고주</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.roleButton} ${formData.role === 'designer' ? styles.roleButtonActive : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, role: 'designer' }))}
                  >
                    <span className={styles.roleIcon}>🎨</span>
                    <span>디자이너</span>
                  </button>
                </div>
              </div>

              {/* 이름 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>이름</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="홍길동"
                  className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                />
                {errors.name && <span className={styles.errorText}>{errors.name}</span>}
              </div>

              {/* 아이디 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>아이디</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="영문, 숫자 4자 이상"
                  className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
                />
                {errors.username && <span className={styles.errorText}>{errors.username}</span>}
              </div>

              {/* 이메일 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>이메일</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                />
                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
              </div>

              {/* 프로필 사진 (선택) */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>프로필 사진 (선택)</label>
                <div className={styles.avatarUpload}>
                  {avatarPreview && (
                    <div className={styles.avatarPreview}>
                      <img src={avatarPreview} alt="프로필 미리보기" className={styles.avatarImage} />
                    </div>
                  )}
                  <label className={styles.avatarButton}>
                    <span className={styles.avatarIcon}>📷</span>
                    <span>{avatarFile ? avatarFile.name : '사진 선택'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className={styles.avatarInput}
                    />
                  </label>
                  <p className={styles.avatarHint}>5MB 이하의 이미지 파일</p>
                </div>
                {errors.avatar && <span className={styles.errorText}>{errors.avatar}</span>}
              </div>

              {/* 비밀번호 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>비밀번호</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="최소 4자 이상"
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                />
                {errors.password && <span className={styles.errorText}>{errors.password}</span>}
              </div>

              {/* 비밀번호 확인 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>비밀번호 확인</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="비밀번호를 다시 입력하세요"
                  className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                />
                {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
              </div>

              {/* 가입 버튼 */}
              <button
                type="submit"
                disabled={loading}
                className={styles.submitButton}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner}></span>
                    가입 중...
                  </>
                ) : (
                  '가입하기'
                )}
              </button>
            </form>

            {/* 로그인 링크 */}
            <div className={styles.footer}>
              이미 계정이 있으신가요?
              <Link href="/login" className={styles.loginLink}>
                로그인
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
