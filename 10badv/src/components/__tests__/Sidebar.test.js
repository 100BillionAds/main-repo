import { render, screen } from '@testing-library/react';
import Sidebar from '@/src/components/Sidebar';
import { SessionProvider } from 'next-auth/react';

const mockSession = {
  user: { name: 'Test User', email: 'test@example.com' },
  expires: '2025-12-31',
};

describe('Sidebar component', () => {
  it('renders user name when session is provided', () => {
    render(
      <SessionProvider session={mockSession}>
        <Sidebar />
      </SessionProvider>
    );
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders navigation items', () => {
    render(
      <SessionProvider session={mockSession}>
        <Sidebar />
      </SessionProvider>
    );
    expect(screen.getByText(/Quick Notes/i)).toBeInTheDocument();
    expect(screen.getByText(/Projects/i)).toBeInTheDocument();
    expect(screen.getByText(/Settings/i)).toBeInTheDocument();
  });

  it('renders sign out button when authenticated', () => {
    render(
      <SessionProvider session={mockSession}>
        <Sidebar />
      </SessionProvider>
    );
    expect(screen.getByText(/Sign out/i)).toBeInTheDocument();
  });
});
