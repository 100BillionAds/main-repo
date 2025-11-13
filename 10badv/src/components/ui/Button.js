/**
 * Button 컴포넌트 - 재사용 가능한 버튼
 * @param {Object} props
 * @param {React.ReactNode} props.children - 버튼 내용
 * @param {string} props.variant - 버튼 스타일 ('primary' | 'secondary' | 'outline' | 'ghost')
 * @param {string} props.size - 버튼 크기 ('sm' | 'md' | 'lg')
 * @param {boolean} props.disabled - 비활성화 여부
 * @param {Function} props.onClick - 클릭 이벤트 핸들러
 * @param {string} props.className - 추가 CSS 클래스
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
    secondary: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600',
    outline:
      'border border-zinc-300 bg-transparent hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800',
    ghost: 'hover:bg-zinc-100 dark:hover:bg-zinc-800',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
  };

  const sizes = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-11 px-6 text-base',
    lg: 'h-12 px-8 text-lg',
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
