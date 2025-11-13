/**
 * Card 컴포넌트 - 재사용 가능한 카드
 * @param {Object} props
 * @param {React.ReactNode} props.children - 카드 내용
 * @param {string} props.title - 카드 제목
 * @param {string} props.description - 카드 설명
 * @param {string} props.className - 추가 CSS 클래스
 */
export default function Card({ children, title, description, className = '' }) {
  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {description && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * CardHeader 컴포넌트
 */
export function CardHeader({ children, className = '' }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

/**
 * CardContent 컴포넌트
 */
export function CardContent({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

/**
 * CardFooter 컴포넌트
 */
export function CardFooter({ children, className = '' }) {
  return <div className={`mt-4 flex items-center gap-2 ${className}`}>{children}</div>;
}
