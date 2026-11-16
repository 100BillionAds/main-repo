/**
 * 마이그레이션 목록. 새 마이그레이션은 파일을 만들고 이 배열 "맨 끝"에 추가한다.
 * 작성 규칙은 docs/MIGRATIONS.md 참고.
 */
import baseline from './0001_baseline.js';
import addAiRequests from './0002_add_ai_requests.js';
import addAiCacheHit from './0003_add_ai_cache_hit.js';
import addOutboxAndNotifications from './0004_add_outbox_and_notifications.js';
import addStoredFiles from './0005_add_stored_files.js';

const migrations = [baseline, addAiRequests, addAiCacheHit, addOutboxAndNotifications, addStoredFiles];

export default migrations;
