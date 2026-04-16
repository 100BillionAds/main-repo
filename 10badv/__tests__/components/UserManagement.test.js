import { render, screen, waitFor } from '@testing-library/react';
import UserManagement from '@/features/admin/components/UserManagement';

jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

const createUser = (overrides = {}) => ({
  id: 1,
  username: 'foo',
  name: null,
  email: 'foo@example.com',
  role: 'user',
  status: 'active',
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('UserManagement 컴포넌트', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  it('name이 없어도 username으로 안전하게 렌더링된다', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: [createUser()] }),
    });

    render(<UserManagement />);

    expect(await screen.findByText('foo')).toBeInTheDocument();
    expect(screen.getByText('@foo')).toBeInTheDocument();
  });

  it('블랙리스트 추가 시 PATCH payload를 status=suspended로 전송한다', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [createUser({ id: 7, username: 'target' })] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [createUser({ id: 7, username: 'target', status: 'suspended' })] }),
      });

    render(<UserManagement />);

    const blacklistButton = await screen.findByTitle('블랙리스트 추가');
    blacklistButton.click();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/users',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ userId: 7, status: 'suspended' }),
        })
      );
    });
  });
});
