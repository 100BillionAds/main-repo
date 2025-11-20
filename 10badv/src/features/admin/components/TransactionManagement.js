'use client';

import Link from 'next/link';

export default function TransactionManagement() {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '3rem 2rem' }}>
      <Link href="/admin" style={{ color: '#667eea', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '600' }}>
        ← 대시보드로
      </Link>
      <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', margin: '1rem 0' }}>
        💼 거래 관리
      </h1>
      <p style={{ fontSize: '1rem', color: '#64748b', marginBottom: '2rem' }}>
        모든 거래 내역을 조회하고 관리할 수 있습니다
      </p>
      <div style={{ background: 'white', borderRadius: '1.5rem', padding: '3rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
        <p style={{ color: '#64748b', fontSize: '1.125rem' }}>거래 관리 기능이 곧 추가됩니다</p>
      </div>
    </div>
  );
}
