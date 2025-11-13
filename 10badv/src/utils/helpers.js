/**
 * 클래스명을 조건부로 결합하는 유틸리티 함수
 * @param {...string} classes - 결합할 클래스명들
 * @returns {string} 결합된 클래스명
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * 날짜를 포맷팅하는 유틸리티 함수
 * @param {Date|string} date - 포맷팅할 날짜
 * @param {string} locale - 로케일 (기본값: 'ko-KR')
 * @returns {string} 포맷된 날짜 문자열
 */
export function formatDate(date, locale = 'ko-KR') {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 상대 시간을 반환하는 유틸리티 함수
 * @param {Date|string} date - 기준 날짜
 * @returns {string} 상대 시간 (예: "2시간 전")
 */
export function getRelativeTime(date) {
  if (!date) return '';
  
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}개월 전`;
  return `${Math.floor(diffInSeconds / 31536000)}년 전`;
}

/**
 * 문자열을 슬러그로 변환하는 유틸리티 함수
 * @param {string} str - 변환할 문자열
 * @returns {string} 슬러그 문자열
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * 배열을 청크로 나누는 유틸리티 함수
 * @param {Array} array - 나눌 배열
 * @param {number} size - 청크 크기
 * @returns {Array} 청크 배열
 */
export function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * 숫자를 천 단위로 포맷팅하는 유틸리티 함수
 * @param {number} num - 포맷팅할 숫자
 * @returns {string} 포맷된 숫자 문자열
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('ko-KR').format(num);
}

/**
 * 문자열을 자르고 말줄임표를 추가하는 유틸리티 함수
 * @param {string} str - 자를 문자열
 * @param {number} length - 최대 길이
 * @returns {string} 자른 문자열
 */
export function truncate(str, length = 100) {
  if (!str || str.length <= length) return str;
  return str.slice(0, length) + '...';
}
