/**
 * 마이그레이션 목록. 새 마이그레이션은 파일을 만들고 이 배열 "맨 끝"에 추가한다.
 * 작성 규칙은 docs/MIGRATIONS.md 참고.
 */
import baseline from './0001_baseline.js';
import addAiRequests from './0002_add_ai_requests.js';

const migrations = [baseline, addAiRequests];

export default migrations;
