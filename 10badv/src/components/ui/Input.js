/**
 * Input 컴포넌트 - 재사용 가능한 입력 필드
 * @param {Object} props
 * @param {string} props.label - 라벨 텍스트
 * @param {string} props.error - 에러 메시지
 * @param {string} props.type - 입력 타입
 * @param {string} props.placeholder - 플레이스홀더
 * @param {string} props.className - 추가 CSS 클래스
 */
export default function Input({
  label,
  error,
  type = 'text',
  placeholder,
  className = '',
  id,
  ...props
}) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
          error
            ? 'border-red-500 focus:ring-red-600'
            : 'border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
