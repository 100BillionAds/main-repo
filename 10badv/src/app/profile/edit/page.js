'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './profile.module.css';

export default function ProfileEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [currentAvatar, setCurrentAvatar] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    bio: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (session?.user) {
      fetchUserProfile();
    }
  }, [session, status]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch('/api/users/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFormData(prev => ({
            ...prev,
            name: data.user.name || '',
            email: data.user.email || '',
            username: data.user.username || '',
            bio: data.user.bio || '',
            phone: data.user.phone || ''
          }));
          setCurrentAvatar(data.user.avatar_url);
        }
      }
    } catch (error) {
      console.error('프로필 조회 실패:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: '파일 크기는 5MB 이하여야 합니다.' });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // 비밀번호 변경 시 확인
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
        setLoading(false);
        return;
      }
      if (!formData.currentPassword) {
        setMessage({ type: 'error', text: '현재 비밀번호를 입력해주세요.' });
        setLoading(false);
        return;
      }
    }

    try {
      let avatarUrl = currentAvatar;
      
      // 프로필 사진 업로드
      if (avatarFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', avatarFile);
        formDataUpload.append('type', 'avatar');
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          avatarUrl = uploadData.url;
        } else {
          const errorData = await uploadResponse.json();
          setMessage({ type: 'error', text: errorData.error || '이미지 업로드에 실패했습니다.' });
          setLoading(false);
          return;
        }
      }

      const updateData = {
        username: formData.username,
        bio: formData.bio,
        phone: formData.phone,
        avatar_url: avatarUrl
      };

      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ type: 'success', text: '프로필이 성공적으로 업데이트되었습니다.' });
        
        // 아바타 URL 업데이트
        if (data.user.avatar_url) {
          setCurrentAvatar(data.user.avatar_url);
        }
        
        // 비밀번호 필드 및 아바타 파일 초기화
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        setAvatarFile(null);
        setAvatarPreview(null);
        
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      } else {
        setMessage({ type: 'error', text: data.error || '업데이트에 실패했습니다.' });
      }
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      setMessage({ type: 'error', text: '서버 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className={styles.spinner}></div>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Link href="/dashboard" className={styles.backLink}>
            ← 대시보드로
          </Link>
          <h1 className={styles.title}>⚙️ 프로필 편집</h1>
          <p className={styles.subtitle}>내 정보를 관리하세요</p>
        </div>

        <div className={styles.card}>
          {message.text && (
            <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
              {message.type === 'success' ? '✓' : '✗'} {message.text}
            </div>
          )}

          {/* 아바타 섹션 */}
          <div className={styles.avatarSection}>
            <div className={styles.avatarContainer}>
              {avatarPreview || currentAvatar ? (
                <img 
                  src={avatarPreview || currentAvatar} 
                  alt="프로필" 
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatar}>
                  {formData.name?.charAt(0) || session?.user?.name?.charAt(0) || '👤'}
                </div>
              )}
              <label className={styles.avatarUploadButton}>
                📷
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            <div className={styles.avatarLabel}>
              {avatarFile ? `✓ ${avatarFile.name}` : '프로필 사진 (최대 5MB)'}
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* 기본 정보 */}
            <div className={styles.formSection}>
              <div className={styles.sectionTitle}>
                👤 기본 정보
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="username" className={styles.label}>
                  아이디
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  disabled
                  className={`${styles.input} ${styles.inputDisabled}`}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.label}>
                  이름
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  disabled
                  className={`${styles.input} ${styles.inputDisabled}`}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="이메일을 입력하세요"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phone" className={styles.label}>
                  전화번호
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="010-1234-5678"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="bio" className={styles.label}>
                  자기소개
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  className={styles.textarea}
                  placeholder="간단한 자기소개를 작성해주세요"
                />
              </div>
            </div>

            {/* 비밀번호 변경 */}
            <div className={styles.formSection}>
              <div className={styles.passwordSection}>
                <div className={styles.sectionTitle}>
                  🔒 비밀번호 변경
                </div>
                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
                  비밀번호를 변경하지 않으려면 비워두세요
                </p>
                
                <div className={styles.formGroup}>
                  <label htmlFor="currentPassword" className={styles.label}>
                    현재 비밀번호
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="현재 비밀번호"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="newPassword" className={styles.label}>
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="새 비밀번호"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword" className={styles.label}>
                    새 비밀번호 확인
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="새 비밀번호 확인"
                  />
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className={styles.buttonGroup}>
              <button
                type="button"
                onClick={() => router.back()}
                className={`${styles.button} ${styles.buttonSecondary}`}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                {loading ? (
                  <>
                    <div className={styles.spinner}></div>
                    저장 중...
                  </>
                ) : (
                  '변경사항 저장'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
