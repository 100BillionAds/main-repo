import { render, screen } from '@testing-library/react';
import Home from '@/src/app/page';

describe('Home page', () => {
  it('renders the home page with heading', () => {
    render(<Home />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it('displays links to templates and learning resources', () => {
    render(<Home />);
    expect(screen.getByText(/Templates/i)).toBeInTheDocument();
    expect(screen.getByText(/Learning/i)).toBeInTheDocument();
  });
});
