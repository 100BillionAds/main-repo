'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './TransactionDetail.module.css';

export default function TransactionDetail({ transactionId }) {
  const [activeTab, setActiveTab] = useState('overview');

  // 샘플 거래 데이터
  const transaction = {
    id: transactionId,
    title: '프리미엄 네온사인 간판 제작',
    status: '진행중',
    progress: 75,
    price: 580000,
    startDate: '2024-01-10',
    estimatedEndDate: '2024-01-25',
    client: {
      name: '김철수',
      company: '맛있는 치킨',
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
    designer: {
      id: 3,
      name: '박준혁',
      nickname: '@signmaster',
      avatar: 'https://i.pravatar.cc/150?img=33',
      rating: 4.9,
    },
    thumbnailUrl: 'https://images.unsplash.com/photo-1550000000000?w=1200&h=800&fit=crop',
    // 도면 이미지들
    blueprints: [
      'https://images.unsplash.com/photo-1550000100000?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1550000200000?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1550000300000?w=800&h=600&fit=crop',
    ],
    // 요청사항
    requirements: {
      size: '2000mm × 800mm',
      material: 'LED 네온 + 아크릴',
      color: '레드 & 화이트',
      style: '모던 + 클래식 믹스',
      mounting: '벽면 부착형',
      special: '야간 조명 효과 강조',
    },
    clientMessage: `안녕하세요! 강남역 근처에 치킨집을 오픈하게 되어 간판 디자인을 의뢰합니다.

컨셉은 전통적인 치킨집의 따뜻함과 현대적인 세련미가 조화를 이루었으면 좋겠습니다.
특히 밤에 눈에 잘 띄어야 하므로 네온사인이 꼭 필요합니다.

브랜드 컬러는 레드와 화이트이고, 로고는 별도로 전달드리겠습니다.
제작 기간은 2주 정도를 예상하고 있습니다.`,
    // 작업 타임라인
    timeline: [
      { id: 1, date: '2024-01-10', title: '프로젝트 시작', description: '의뢰 확정 및 계약', status: 'completed' },
      { id: 2, date: '2024-01-12', title: '초안 제출', description: '1차 디자인 시안 3개 제출', status: 'completed' },
      { id: 3, date: '2024-01-15', title: '수정 완료', description: '클라이언트 피드백 반영', status: 'completed' },
      { id: 4, date: '2024-01-18', title: '최종 확정', description: '디자인 최종 승인', status: 'current' },
      { id: 5, date: '2024-01-22', title: '제작 진행', description: '실물 제작 단계', status: 'pending' },
      { id: 6, date: '2024-01-25', title: '납품 완료', description: '설치 및 프로젝트 완료', status: 'pending' },
    ],
    // 소요 기간 정보
    duration: {
      total: '15일',
      design: '5일 (완료)',
      production: '7일 (진행중)',
      installation: '3일 (예정)',
    },
  };

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
    <main className={styles.container}>
      <div className={styles.wrapper}>
        {/* 왼쪽: 메인 컨텐츠 */}
        <div className={styles.mainContent}>
          {/* 헤더 */}
          <div className={styles.header}>
            <div className={`${styles.statusBadge} ${styles[`status${getStatusColor(transaction.status)}`]}`}>
              {transaction.status}
            </div>
            <h1 className={styles.title}>{transaction.title}</h1>
            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>전체 진행률</span>
                <span className={styles.progressValue}>{transaction.progress}%</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${transaction.progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 탭 메뉴 */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'overview' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📋 개요
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'blueprints' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('blueprints')}
            >
              📐 도면
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'timeline' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              ⏱️ 타임라인
            </button>
          </div>

          {/* 개요 탭 */}
          {activeTab === 'overview' && (
            <div className={styles.content}>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>의뢰 내용</h2>
                <p className={styles.clientMessage}>{transaction.clientMessage}</p>
              </div>

              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>요청 사항</h2>
                <div className={styles.requirements}>
                  {Object.entries(transaction.requirements).map(([key, value]) => (
                    <div key={key} className={styles.requirementItem}>
                      <span className={styles.requirementLabel}>
                        {key === 'size' && '📏 크기'}
                        {key === 'material' && '🔧 재질'}
                        {key === 'color' && '🎨 색상'}
                        {key === 'style' && '✨ 스타일'}
                        {key === 'mounting' && '🔩 설치방식'}
                        {key === 'special' && '⭐ 특이사항'}
                      </span>
                      <span className={styles.requirementValue}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>소요 기간</h2>
                <div className={styles.duration}>
                  <div className={styles.durationItem}>
                    <div className={styles.durationIcon}>🎯</div>
                    <div className={styles.durationInfo}>
                      <div className={styles.durationLabel}>전체 기간</div>
                      <div className={styles.durationValue}>{transaction.duration.total}</div>
                    </div>
                  </div>
                  <div className={styles.durationItem}>
                    <div className={styles.durationIcon}>✏️</div>
                    <div className={styles.durationInfo}>
                      <div className={styles.durationLabel}>디자인</div>
                      <div className={styles.durationValue}>{transaction.duration.design}</div>
                    </div>
                  </div>
                  <div className={styles.durationItem}>
                    <div className={styles.durationIcon}>🔨</div>
                    <div className={styles.durationInfo}>
                      <div className={styles.durationLabel}>제작</div>
                      <div className={styles.durationValue}>{transaction.duration.production}</div>
                    </div>
                  </div>
                  <div className={styles.durationItem}>
                    <div className={styles.durationIcon}>🚚</div>
                    <div className={styles.durationInfo}>
                      <div className={styles.durationLabel}>설치</div>
                      <div className={styles.durationValue}>{transaction.duration.installation}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 도면 탭 */}
          {activeTab === 'blueprints' && (
            <div className={styles.content}>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>디자인 도면</h2>
                <div className={styles.blueprints}>
                  {transaction.blueprints.map((blueprint, index) => (
                    <div key={index} className={styles.blueprint}>
                      <div
                        className={styles.blueprintImage}
                        style={{ backgroundImage: `url(${blueprint})` }}
                      ></div>
                      <div className={styles.blueprintLabel}>도면 {index + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 타임라인 탭 */}
          {activeTab === 'timeline' && (
            <div className={styles.content}>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>작업 진행 상황</h2>
                <div className={styles.timeline}>
                  {transaction.timeline.map((event, index) => (
                    <div
                      key={event.id}
                      className={`${styles.timelineItem} ${styles[`timeline${event.status}`]}`}
                    >
                      <div className={styles.timelineMarker}></div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineDate}>{event.date}</div>
                        <div className={styles.timelineTitle}>{event.title}</div>
                        <div className={styles.timelineDescription}>{event.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 사이드바 */}
        <aside className={styles.sidebar}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>💰 거래 정보</h3>
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>거래 금액</span>
                <span className={styles.infoValue}>{transaction.price.toLocaleString()}원</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>시작일</span>
                <span className={styles.infoValue}>{transaction.startDate}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>예상 완료일</span>
                <span className={styles.infoValue}>{transaction.estimatedEndDate}</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>👥 참여자</h3>
            <div className={styles.participant}>
              <div className={styles.participantHeader}>의뢰인</div>
              <div className={styles.participantInfo}>
                <div className={styles.participantAvatar}>
                  <Image src={transaction.client.avatar} alt={transaction.client.name} width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div className={styles.participantName}>{transaction.client.name}</div>
                  <div className={styles.participantCompany}>{transaction.client.company}</div>
                </div>
              </div>
            </div>
            <div className={styles.participant}>
              <div className={styles.participantHeader}>디자이너</div>
              <Link href={`/designers/${transaction.designer.id}`} className={styles.participantInfo}>
                <div className={styles.participantAvatar}>
                  <Image src={transaction.designer.avatar} alt={transaction.designer.name} width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div className={styles.participantName}>{transaction.designer.name}</div>
                  <div className={styles.participantNickname}>{transaction.designer.nickname}</div>
                </div>
              </Link>
            </div>
          </div>

          <div className={styles.card}>
            <button className={styles.chatButton}>💬 채팅하기</button>
          </div>
        </aside>
      </div>
    </main>
  );
}
