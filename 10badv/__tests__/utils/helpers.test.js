import {
  formatDate,
  getRelativeTime,
  slugify,
  chunk,
  formatNumber,
  truncate,
  cn,
} from '@/utils/helpers';

describe('helpers 유틸리티 함수', () => {
  describe('cn', () => {
    it('여러 클래스명을 결합한다', () => {
      expect(cn('class1', 'class2', 'class3')).toBe('class1 class2 class3');
    });

    it('falsy 값을 필터링한다', () => {
      expect(cn('class1', null, undefined, false, '', 'class2')).toBe('class1 class2');
    });
  });

  describe('formatDate', () => {
    it('날짜를 포맷팅한다', () => {
      const date = new Date('2025-11-13');
      const formatted = formatDate(date);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('빈 값일 때 빈 문자열을 반환한다', () => {
      expect(formatDate(null)).toBe('');
    });
  });

  describe('getRelativeTime', () => {
    it('방금 전 시간을 반환한다', () => {
      const now = new Date();
      expect(getRelativeTime(now)).toBe('방금 전');
    });

    it('몇 분 전을 반환한다', () => {
      const past = new Date(Date.now() - 120000); // 2분 전
      expect(getRelativeTime(past)).toContain('분 전');
    });

    it('빈 값일 때 빈 문자열을 반환한다', () => {
      expect(getRelativeTime(null)).toBe('');
    });
  });

  describe('slugify', () => {
    it('문자열을 슬러그로 변환한다', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('특수문자를 제거한다', () => {
      expect(slugify('Hello! World?')).toBe('hello-world');
    });

    it('공백을 하이픈으로 변환한다', () => {
      expect(slugify('hello   world')).toBe('hello-world');
    });
  });

  describe('chunk', () => {
    it('배열을 청크로 나눈다', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = chunk(arr, 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('빈 배열을 처리한다', () => {
      expect(chunk([], 2)).toEqual([]);
    });
  });

  describe('formatNumber', () => {
    it('숫자를 천 단위로 포맷팅한다', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });
  });

  describe('truncate', () => {
    it('문자열을 자르고 말줄임표를 추가한다', () => {
      const longText = 'a'.repeat(150);
      const result = truncate(longText, 100);
      expect(result).toHaveLength(103); // 100 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('짧은 문자열은 그대로 반환한다', () => {
      const shortText = 'Hello';
      expect(truncate(shortText, 100)).toBe('Hello');
    });
  });
});
