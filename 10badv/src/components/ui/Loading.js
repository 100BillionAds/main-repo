/**
 * Loading 컴포넌트 - 로딩 스피너
 * @param {Object} props
 * @param {string} props.size - 스피너 크기 ('sm' | 'md' | 'lg')
 * @param {string} props.text - 로딩 메시지
 */
export default function Loading({ size = 'md', text = 'Loading...' }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div
        className={`${sizes[size]} animate-spin rounded-full border-blue-600 border-t-transparent`}
        role="status"
        aria-label="Loading"
      />
      {text && <p className="text-sm text-zinc-600 dark:text-zinc-400">{text}</p>}
    </div>
  );
}
