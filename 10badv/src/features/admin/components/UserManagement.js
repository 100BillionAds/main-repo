'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './UserManagement.module.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, admin, designer, user
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('사용자 목록 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    // 상태 필터
    if (filter === 'admin' && user.role !== 'admin') return false;
    if (filter === 'designer' && user.role !== 'designer') return false;
    if (filter === 'user' && user.role !== 'user') return false;
    
    // 검색어 필터
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.username.toLowerCase().includes(searchLower) ||
        user.name.toLowerCase().includes(searchLower) ||
        (user.email && user.email.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  const handleUserAction = async (user, action) => {
    if (action === '삭제') {
      if (!confirm(`정말 ${user.name}님을 삭제하시겠습니까?`)) return;
      
      try {
        const response = await fetch('/api/admin/users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });

        if (response.ok) {
          alert('사용자가 삭제되었습니다');
          fetchUsers();
        }
      } catch (error) {
        alert('삭제 중 오류가 발생했습니다');
      }
    } else {
      setSelectedUser({ ...user, action });
      setShowModal(true);
    }
  };

  const confirmAction = async () => {
    try {
      const updates = {};
      
      if (selectedUser.action === '관리자 승급') {
        updates.role = 'admin';
      } else if (selectedUser.action === '디자이너 전환') {
        updates.role = 'designer';
      } else if (selectedUser.action === '일반회원 전환') {
        updates.role = 'user';
      }

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, updates }),
      });

      if (response.ok) {
        alert(`${selectedUser.action} 완료`);
        fetchUsers();
      }
    } catch (error) {
      alert('작업 중 오류가 발생했습니다');
    } finally {
      setShowModal(false);
      setSelectedUser(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>회원 목록 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div>
          <Link href="/admin" className={styles.backLink}>
            ← 대시보드로
          </Link>
          <h1 className={styles.title}>👥 회원 관리</h1>
          <p className={styles.subtitle}>총 {users.length}명의 회원이 있습니다</p>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className={styles.controls}>
        <div className={styles.filters}>
          <button
            className={`${styles.filterButton} ${filter === 'all' ? styles.filterActive : ''}`}
            onClick={() => setFilter('all')}
          >
            전체 ({users.length})
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'admin' ? styles.filterActive : ''}`}
            onClick={() => setFilter('admin')}
          >
            관리자 ({users.filter(u => u.role === 'admin').length})
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'designer' ? styles.filterActive : ''}`}
            onClick={() => setFilter('designer')}
          >
            디자이너 ({users.filter(u => u.role === 'designer').length})
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'user' ? styles.filterActive : ''}`}
            onClick={() => setFilter('user')}
          >
            광고주 ({users.filter(u => u.role === 'user').length})
          </button>
        </div>

        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="이름, 아이디, 이메일 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className={styles.clearButton}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 회원 테이블 */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>회원 정보</th>
              <th>권한</th>
              <th>상태</th>
              <th>가입일</th>
              <th>포트폴리오</th>
              <th>거래</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className={styles.userInfo}>
                    <div className={styles.userAvatar}>
                      {user.name.charAt(0)}
                    </div>
                    <div className={styles.userDetails}>
                      <div className={styles.userName}>{user.name}</div>
                      <div className={styles.userUsername}>@{user.username}</div>
                      <div className={styles.userEmail}>{user.email || '미등록'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`${styles.badge} ${
                    user.role === 'admin' ? styles.badgeAdmin : 
                    user.role === 'designer' ? styles.badgeDesigner : 
                    styles.badgeUser
                  }`}>
                    {user.role === 'admin' ? '👑 관리자' : 
                     user.role === 'designer' ? '🎨 디자이너' : 
                     '👤 광고주'}
                  </span>
                </td>
                <td>
                  <span className={`${styles.badge} ${styles.badgeActive}`}>
                    🟢 활성
                  </span>
                </td>
                <td className={styles.dateCell}>
                  {new Date(user.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td className={styles.numberCell}>0</td>
                <td className={styles.numberCell}>0</td>
                <td>
                  <div className={styles.actions}>
                    {user.role !== 'admin' && user.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleUserAction(user, '관리자로 승격')}
                          className={`${styles.actionButton} ${styles.actionPromote}`}
                          title="관리자로 승격"
                        >
                          ⬆️
                        </button>
                        <button
                          onClick={() => handleUserAction(user, '계정 정지')}
                          className={`${styles.actionButton} ${styles.actionBan}`}
                          title="계정 정지"
                        >
                          🚫
                        </button>
                      </>
                    )}
                    {user.status === 'banned' && (
                      <button
                        onClick={() => handleUserAction(user, '계정 해제')}
                        className={`${styles.actionButton} ${styles.actionUnban}`}
                        title="정지 해제"
                      >
                        ✅
                      </button>
                    )}
                    {user.role === 'admin' && user.id !== 1 && (
                      <button
                        onClick={() => handleUserAction(user, '관리자 권한 제거')}
                        className={`${styles.actionButton} ${styles.actionDemote}`}
                        title="일반 회원으로 변경"
                      >
                        ⬇️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 검색 결과 없음 */}
      {filteredUsers.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <p>검색 결과가 없습니다</p>
        </div>
      )}

      {/* 확인 모달 */}
      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>작업 확인</h3>
            <p className={styles.modalMessage}>
              <strong>{selectedUser.name}</strong> 회원에게<br />
              <strong>{selectedUser.action}</strong> 작업을 실행하시겠습니까?
            </p>
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowModal(false)}
                className={styles.modalCancel}
              >
                취소
              </button>
              <button
                onClick={confirmAction}
                className={styles.modalConfirm}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
