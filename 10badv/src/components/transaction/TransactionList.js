'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './TransactionList.module.css';

const allTransactions = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  title: ['프리미엄 네온사인 간판', '미니멀 입구 사인', 'LED 입체 간판', '채널레터 간판'][i % 4],
  client: ['김철수', '이영희', '박민수', '최지은'][i % 4],
  designer: ['박준혁', '이서연', '김민준', '정수현'][i % 4],
  designerAvatar: `https://i.pravatar.cc/150?img=${33 + i % 4}`,
  status: ['진행중', '완료', '검토중', '수정중'][i % 4],
  price: [580000, 420000, 350000, 720000][i % 4],
  startDate: `2024-01-${String(15 - i).padStart(2, '0')}`,
  thumbnailUrl: `https://images.unsplash.com/photo-${1550000000000 + i * 50000}?w=400&h=300&fit=crop`,
  progress: [75, 100, 30, 60][i % 4],
}));

export default function TransactionList({ showAll = false, limit = 6 }) {
  const [activeFilter, setActiveFilter] = useState('전체');
  const filters = ['전체', '진행중', '완료', '검토중', '수정중'];

  const filteredTransactions = activeFilter === '전체'
    ? allTransactions
    : allTransactions.filter(t => t.status === activeFilter);

  const displayTransactions = showAll ? filteredTransactions : filteredTransactions.slice(0, limit);

  const getStatusColor = (status) => {
    switch (status) {
      case '진행중': return 'blue';
      case '완료': return 'green';
      case '검토중': return 'purple';
      case '수정중': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <div className={styles.wrapper}>
      {showAll && (
        <div className={styles.filters}>
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`${styles.filterButton} ${activeFilter === filter ? styles.filterButtonActive : ''}`}
            >
              {filter}
            </button>
          ))}
        </div>
      )}

      <div className={styles.list}>
        {displayTransactions.map((transaction, index) => (
          <Link
            href={`/transactions/${transaction.id}`}
            key={transaction.id}
            className={styles.card}
            style={{ animation: `fadeIn 0.5s ease-out ${index * 0.05}s backwards` }}
          >
            <div className={styles.thumbnail}>
              <div
                className={styles.thumbnailImage}
                style={{ backgroundImage: `url(${transaction.thumbnailUrl})` }}
              ></div>
              <div className={`${styles.statusBadge} ${styles[`status${getStatusColor(transaction.status)}`]}`}>
                {transaction.status}
              </div>
            </div>
            <div className={styles.content}>
              <h3 className={styles.title}>{transaction.title}</h3>
              <div className={styles.participants}>
                <div className={styles.participant}>
                  <span className={styles.participantLabel}>의뢰인:</span>
                  <span className={styles.participantName}>{transaction.client}</span>
                </div>
                <div className={styles.participant}>
                  <span className={styles.participantLabel}>디자이너:</span>
                  <div className={styles.designer}>
                    <div className={styles.designerAvatar}>
                      <img src={transaction.designerAvatar} alt={transaction.designer} />
                    </div>
                    <span className={styles.designerName}>{transaction.designer}</span>
                  </div>
                </div>
              </div>
              <div className={styles.progressSection}>
                <div className={styles.progressHeader}>
                  <span className={styles.progressLabel}>진행률</span>
                  <span className={styles.progressValue}>{transaction.progress}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${transaction.progress}%` }}
                  ></div>
                </div>
              </div>
              <div className={styles.footer}>
                <div className={styles.date}>
                  <span className={styles.dateIcon}>📅</span>
                  <span>{transaction.startDate}</span>
                </div>
                <div className={styles.price}>{transaction.price.toLocaleString()}원</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
