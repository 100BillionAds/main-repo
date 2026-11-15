'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from './NotificationsPage.module.css';

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function NotificationsPage() {
  const { status } = useSession();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || '알림을 불러오지 못했습니다.');
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    // 데이터를 받아온 뒤에만 상태를 바꾼다 (load 안의 setState 는 모두 await 이후)
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [status, load]);

  const markAllRead = async () => {
    const response = await fetch('/api/notifications', { method: 'PATCH' });
    if (response.ok) load();
  };

  if (status === 'unauthenticated') {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>알림</h1>
        <p className={styles.empty}>
          <Link href="/login">로그인</Link> 후 확인할 수 있습니다.
        </p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>알림</h1>
        <button type="button" className={styles.readAll} onClick={markAllRead} disabled={unreadCount === 0}>
          모두 읽음 ({unreadCount})
        </button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!error && loading && <p className={styles.empty}>불러오는 중...</p>}
      {!error && !loading && items.length === 0 && (
        <p className={styles.empty}>아직 알림이 없습니다. 거래가 진행되면 여기에 표시됩니다.</p>
      )}

      <ul className={styles.list}>
        {items.map((item) => {
          const content = (
            <>
              <div className={styles.itemHead}>
                <strong className={styles.itemTitle}>{item.title}</strong>
                <time className={styles.time}>{formatTime(item.created_at)}</time>
              </div>
              {item.body && <p className={styles.body}>{item.body}</p>}
            </>
          );
          return (
            <li key={item.id} className={`${styles.item} ${item.read_at ? '' : styles.unread}`}>
              {item.link ? (
                <Link href={item.link} className={styles.itemLink}>
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
