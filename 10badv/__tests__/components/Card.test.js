import { render, screen } from '@testing-library/react';
import Card from '@/components/ui/Card';

describe('Card 컴포넌트', () => {
  it('children이 정상적으로 렌더링된다', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('title과 description이 표시된다', () => {
    render(<Card title="Test Title" description="Test Description" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('커스텀 className이 적용된다', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('custom-class');
  });

  it('title만 있을 때 정상적으로 렌더링된다', () => {
    render(<Card title="Only Title">Content</Card>);
    expect(screen.getByText('Only Title')).toBeInTheDocument();
  });
});
