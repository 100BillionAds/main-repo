import { DomainError } from '@/domain/errors';

/**
 * 의뢰서 초안: 입력 검증과 출력 해석 (순수 함수 — DB·LLM 의존 없음)
 */
export const BRIEF_MIN_LENGTH = 10;
export const BRIEF_MAX_LENGTH = 500;

/** 사용자가 보낸 값을 검증하고 정리한다. LLM 에 보내는 글자 수를 여기서 제한한다 (비용·악용 방지). */
export function normalizeDraftInput({ brief, category, budget } = {}) {
  const text = typeof brief === 'string' ? brief.trim() : '';
  if (text.length < BRIEF_MIN_LENGTH) {
    throw new DomainError(`원하는 간판을 ${BRIEF_MIN_LENGTH}자 이상 적어주세요.`, { code: 'BRIEF_TOO_SHORT' });
  }
  if (text.length > BRIEF_MAX_LENGTH) {
    throw new DomainError(`메모는 ${BRIEF_MAX_LENGTH}자까지 쓸 수 있습니다.`, { code: 'BRIEF_TOO_LONG' });
  }

  const budgetNumber = Number(budget);
  return {
    // 꺾쇠를 없애 프롬프트의 <brief> 구획을 사용자가 닫지 못하게 한다.
    brief: text.replace(/[<>]/g, ''),
    category: typeof category === 'string' ? category.trim().replace(/[<>\n]/g, '').slice(0, 30) : '',
    budget: Number.isSafeInteger(budgetNumber) && budgetNumber > 0 ? budgetNumber : null,
  };
}

/**
 * 모델 출력("제목: ...\n---\n본문")을 제목과 본문으로 나눈다.
 * 모델이 형식을 어겨도 버리지 않는다 — 제목 없이 전체를 본문으로 돌려준다.
 * 스트리밍 도중의 미완성 글에도 쓸 수 있다.
 */
export function parseDraft(text) {
  const raw = String(text || '').replace(/\r\n/g, '\n');
  const match = raw.match(/^\s*제목\s*[:：]\s*(.*)(?:\n|$)/);
  if (!match) {
    return { title: '', description: raw.trim() };
  }

  const title = match[1].trim().slice(0, 100);
  const rest = raw.slice(match[0].length).replace(/^\s*-{3,}\s*(?:\n|$)/, '');
  return { title, description: rest.trim() };
}
