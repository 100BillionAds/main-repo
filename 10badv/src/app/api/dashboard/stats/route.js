import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const isAdmin = session.user.role === 'admin';

    // 기본 통계
    const stats = {};

    if (isAdmin) {
      // 관리자: 전체 시스템 통계 (병렬 실행으로 응답 속도 최적화)
      const [
        [userCount],
        [designerCount],
        [portfolioCount],
        [transactionCount],
        [pendingPortfolios],
        [completedTransactions],
        [totalRevenue],
        [requestCount]
      ] = await Promise.all([
        pool.execute('SELECT COUNT(*) as count FROM users'),
        pool.execute("SELECT COUNT(*) as count FROM users WHERE role = 'designer'"),
        pool.execute('SELECT COUNT(*) as count FROM portfolios'),
        pool.execute('SELECT COUNT(*) as count FROM transactions'),
        pool.execute("SELECT COUNT(*) as count FROM portfolios WHERE status = 'pending'"),
        pool.execute("SELECT COUNT(*) as count FROM transactions WHERE status = 'completed'"),
        pool.execute("SELECT COALESCE(SUM(commission), 0) as total FROM transactions WHERE status = 'completed'"),
        pool.execute('SELECT COUNT(*) as count FROM requests')
      ]);

      stats.totalUsers = userCount[0].count;
      stats.totalDesigners = designerCount[0].count;
      stats.totalPortfolios = portfolioCount[0].count;
      stats.totalTransactions = transactionCount[0].count;
      stats.pendingPortfolios = pendingPortfolios[0].count;
      stats.completedTransactions = completedTransactions[0].count;
      stats.totalRevenue = totalRevenue[0].total;
      stats.totalRequests = requestCount[0].count;

      // 최근 거래 + 최근 가입 (병렬)
      const [[recentTransactions], [recentUsers]] = await Promise.all([
        pool.execute(`
          SELECT t.id, t.amount, t.status, t.created_at,
                 buyer.username as buyer_name, seller.username as seller_name
          FROM transactions t
          LEFT JOIN users buyer ON t.buyer_id = buyer.id
          LEFT JOIN users seller ON t.designer_id = seller.id
          ORDER BY t.created_at DESC LIMIT 5
        `),
        pool.execute(
          'SELECT id, name, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
        )
      ]);
      stats.recentTransactions = recentTransactions;
      stats.recentUsers = recentUsers;
    } else {
      // 일반 사용자 / 디자이너: 개인 통계 (병렬)
      const [
        [myTransactions],
        [myCompletedTx],
        [myPoints],
        [myRequests]
      ] = await Promise.all([
        pool.execute(
          'SELECT COUNT(*) as count FROM transactions WHERE buyer_id = ? OR designer_id = ?',
          [userId, userId]
        ),
        pool.execute(
          "SELECT COUNT(*) as count FROM transactions WHERE (buyer_id = ? OR designer_id = ?) AND status = 'completed'",
          [userId, userId]
        ),
        pool.execute(
          'SELECT points FROM users WHERE id = ?',
          [userId]
        ),
        pool.execute(
          'SELECT COUNT(*) as count FROM requests WHERE client_id = ?',
          [userId]
        )
      ]);

      stats.totalTransactions = myTransactions[0].count;
      stats.completedTransactions = myCompletedTx[0].count;
      stats.points = myPoints[0]?.points || 0;
      stats.totalRequests = myRequests[0].count;

      if (session.user.role === 'designer') {
        const [
          [myPortfolios],
          [myProposals],
          [myEarnings]
        ] = await Promise.all([
          pool.execute(
            'SELECT COUNT(*) as count FROM portfolios WHERE designer_id = ?',
            [userId]
          ),
          pool.execute(
            'SELECT COUNT(*) as count FROM proposals WHERE designer_id = ?',
            [userId]
          ),
          pool.execute(
            "SELECT COALESCE(SUM(amount - commission), 0) as total FROM transactions WHERE designer_id = ? AND status = 'completed'",
            [userId]
          )
        ]);
        stats.totalPortfolios = myPortfolios[0].count;
        stats.totalProposals = myProposals[0].count;
        stats.totalEarnings = myEarnings[0].total;
      }
    }

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('대시보드 통계 오류:', error);
    return NextResponse.json({ success: false, error: '통계를 가져오는데 실패했습니다.' }, { status: 500 });
  }
}
