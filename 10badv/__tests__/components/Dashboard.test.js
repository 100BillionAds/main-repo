import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '@/app/dashboard/page';
import { useSession } from 'next-auth/react';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('next/image', () => {
  return function MockImage(props) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />;
  };
});

jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe('Dashboard 페이지', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url) => {
      const endpoint = typeof url === 'string' ? url : url.url;

      if (endpoint === '/api/dashboard/stats') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            stats: {
              totalUsers: 12,
              totalPortfolios: 7,
              totalTransactions: 5,
              completedTransactions: 4,
              recentUsers: [
                {
                  id: 1,
                  name: '홍길동',
                  username: 'hong',
                  email: 'hong@example.com',
                  role: 'user',
                  created_at: '2026-04-25T00:00:00.000Z',
                },
              ],
            },
          }),
        });
      }

      if (endpoint === '/api/users/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            user: { points: 1000 },
          }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });

    useSession.mockReturnValue({
      status: 'authenticated',
      data: {
        user: {
          id: '1',
          role: 'admin',
          name: '관리자',
          avatar_url: null,
        },
      },
    });
  });

  it('관리자 통계 API 응답의 stats 필드를 매핑해 렌더링한다', async () => {
    render(<Dashboard />);

    expect(await screen.findByText('홍길동 (hong)')).toBeInTheDocument();
    expect(screen.getByText('총 회원 수')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('1,000원')).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/dashboard/stats');
      expect(fetch).toHaveBeenCalledWith('/api/users/me');
    });
  });
});
