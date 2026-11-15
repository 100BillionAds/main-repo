# Redis: 캐시와 요청 제한

Redis 를 어디에, 왜 쓰는지와 장애 때의 동작을 설명합니다.

## 무엇에 쓰나

| 용도 | 키 | 만료 | 코드 |
|---|---|---|---|
| AI 응답 캐시 | `tenbadv:cache:llm:<기능>:<프롬프트 버전>:<제공자>:<모델>:<입력 해시>` | 24시간 | `domain/ai/requestDraftService.js` |
| 요청 제한 횟수 | `tenbadv:rl:<기준>` (예: `ai:draft:42`, `register:1.2.3.4`) | 구간 길이 (예: 1분) | `lib/rateLimit.js` |

둘 다 **없어져도 되는 데이터**입니다. 캐시가 사라지면 LLM 을 한 번 더 부르면 되고, 횟수가 사라지면 다시 세면 됩니다. 돈·거래 같은 원본 데이터는 Redis 에 두지 않습니다 (MySQL/TiDB 에만).

## 용어

| 용어 | 뜻 |
|---|---|
| 캐시 적중(hit) / 실패(miss) | 찾는 값이 캐시에 있음 / 없음 |
| TTL | Time To Live. 키가 자동으로 지워지기까지의 시간 |
| cache-aside | "먼저 캐시를 보고, 없으면 원래 작업을 한 뒤 캐시에 넣는" 방식 |
| 원자적(atomic) | 여러 동작이 전부 되거나 전혀 안 되는 것. 중간 상태가 없음 |
| fail-open | 보조 부품이 고장 나면 막지 않고 통과시키는 설계 |

## 구조

```
10badv/src/lib/
├── redis.js            # 연결 (REDIS_URL 이 있을 때만)
├── kv/
│   ├── index.js        # 저장소 선택: Redis 또는 메모리
│   ├── redisStore.js   # Redis 구현 (Lua 스크립트)
│   └── memoryStore.js  # 메모리 구현 (Redis 없을 때 / 장애 때)
├── cache.js            # 캐시: get / set (실패해도 예외 없음)
└── rateLimit.js        # 요청 제한
```

두 저장소는 같은 메서드(`get`, `set`, `delete`, `incrementWithExpiry`)를 가집니다. 캐시와 요청 제한은 어느 쪽인지 모릅니다. LLM 제공자를 추상화한 것과 같은 방식입니다.

## Redis 는 "있으면 좋은" 부품

| 상황 | 캐시 | 요청 제한 |
|---|---|---|
| `REDIS_URL` 없음 (로컬 개발, 테스트) | 서버 메모리 사용 | 서버 메모리로 셈 |
| Redis 정상 | Redis | Redis (서버가 여러 대여도 정확) |
| Redis 장애 | 없는 셈 치고 원래 작업 수행 | 서버 메모리로 대신 셈 |

Redis 가 죽었다고 로그인이나 AI 초안이 같이 멈추면 안 됩니다. 그래서 연결 설정을 이렇게 했습니다 (`lib/redis.js`).

- **명령 제한 시간 1초** — 캐시가 본 작업보다 느리면 캐시가 아닙니다.
- **끊긴 동안 명령을 쌓아 두지 않음** — 쌓아 두면 Redis 가 돌아올 때까지 사용자 요청이 같이 기다립니다. 바로 실패시키고 대역으로 넘어갑니다.
- 재연결은 뒤에서 계속 시도합니다 (200ms 부터 최대 5초 간격).

## AI 응답 캐시

같은 메모에 대한 초안 요청은 LLM 을 다시 부르지 않고 저장해 둔 글을 돌려줍니다.

```
요청 → 입력 검증 → 캐시 확인 ─ 있음 → 저장된 글을 조각내어 스트리밍 (LLM 호출 없음, 하루 한도 차감 없음)
                              └ 없음 → 하루 한도 확인 → LLM 호출 → 끝까지 받았으면 캐시에 저장
```

**캐시 키에 "답을 바꾸는 것"을 전부 넣습니다**: 기능, 프롬프트 버전, 제공자, 모델, 정리된 입력(메모·업종·예산)의 해시. 프롬프트를 v2 로 올리거나 모델을 바꾸면 키가 달라져 예전 답이 섞이지 않습니다. 따로 지울 필요가 없습니다.

지킨 규칙:

- **끝까지 받은 응답만 저장합니다.** 중간에 끊긴 글을 넣으면 다음 사람도 끊긴 글을 받습니다.
- **반드시 TTL 을 겁니다** (기본 24시간, `LLM_CACHE_TTL_SECONDS`).
- 키에는 입력 원문이 아니라 SHA-256 해시가 들어갑니다. Redis 키 목록에 사용자 글이 드러나지 않습니다.
- 캐시에 저장되는 것은 **모델이 만든 초안 글**입니다. 사용자 식별 정보는 넣지 않으며, 글자 하나까지 같은 메모를 보낸 요청에만 돌아갑니다.

알아둘 점: 같은 메모로 다시 누르면 24시간 동안 같은 초안이 나옵니다. 다른 초안을 원하면 메모를 조금 바꾸면 됩니다.

캐시 적중률은 사용 기록으로 봅니다.

```sql
SELECT cache_hit, COUNT(*) AS calls FROM ai_requests
 WHERE status = 'success' AND created_at > NOW() - INTERVAL 7 DAY
 GROUP BY cache_hit;
```

## 요청 제한

"기준 하나당 `windowMs` 동안 `limit` 번까지" 를 셉니다 (고정 구간 방식).

| 대상 | 기준 | 한도 |
|---|---|---|
| 회원가입 | IP | 분당 5회 |
| 파일 업로드 | IP | 분당 30회 |
| AI 초안 작성 | 사용자 | 분당 5회 (하루 20회 한도와 별개) |

### 왜 Lua 스크립트인가

횟수를 세려면 두 동작이 필요합니다: **횟수 올리기(INCR)**, **처음이면 만료 걸기(EXPIRE)**.

이 둘을 따로 보내면, 사이에 서버가 죽었을 때 **만료 없는 키**가 남습니다. 그 사용자는 횟수가 영영 초기화되지 않아 계속 차단됩니다. Redis 는 스크립트 하나를 실행하는 동안 다른 명령을 끼워 넣지 않으므로, 스크립트로 묶으면 두 동작이 원자적으로 실행됩니다 (`lib/kv/redisStore.js`).

```lua
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
```

`INCR` 자체가 원자적이라, 서버 두 대가 동시에 요청해도 횟수가 겹쳐 세어지지 않습니다. 통합 테스트가 연결 두 개로 동시에 50번 요청해 정확히 한도만큼만 통과하는지 확인합니다.

### 고정 구간의 한계

구간 경계에서 순간적으로 한도의 두 배까지 통과할 수 있습니다 (59초에 5번, 61초에 5번). 지금 용도(남용 방지)에는 충분하다고 판단했습니다. 더 정밀해야 하면 이동 구간(sliding window)이나 토큰 버킷으로 바꿉니다.

## 운영 (Render)

`render.yaml` 에 Key Value 인스턴스 `tenbadv-cache` (무료 플랜) 가 정의되어 있고, 내부 접속 주소가 웹 서비스의 `REDIS_URL` 로 자동 연결됩니다.

- 무료 플랜은 **재시작하면 데이터가 사라집니다.** 캐시·횟수만 두므로 괜찮습니다.
- 메모리가 차면 오래 안 쓴 키부터 지웁니다 (`allkeys-lru`).
- 외부 접속은 막혀 있고 (`ipAllowList: []`), Render 내부 네트워크에서만 접속합니다.

## 로컬에서 Redis 쓰기

```bash
docker compose up --build          # 앱 + MySQL + Redis
# 또는 Redis 만
docker run -d -p 6379:6379 redis:7-alpine
# .env.local 에 REDIS_URL=redis://127.0.0.1:6379
```

`REDIS_URL` 을 비워 두면 메모리로 동작합니다.

## 테스트

| 파일 | 내용 | Redis |
|---|---|---|
| `__tests__/lib/kv/cacheAndRateLimit.test.js` | 메모리 저장소, 캐시의 장애 무시, 요청 제한 | 불필요 |
| `__tests__/domain/requestDraft.test.js` | 캐시 적중·키·실패 응답 미저장 | 불필요 |
| `__tests__/integration/redis.integration.test.js` | 실제 만료, Lua 원자성(연결 2개 동시 50회), 만료 없는 키 복구 | 필요 (`TEST_REDIS_URL`) |
| `__tests__/integration/aiRequestDraft.integration.test.js` | 캐시 응답이 하루 한도를 쓰지 않음 | 있으면 Redis, 없으면 메모리 |

## 아직 없는 것

- 캐시 쏠림(stampede) 방지: 같은 입력이 동시에 여러 번 오면 각자 LLM 을 부릅니다.
- 작업 큐 (5단계: BullMQ 가 이 Redis 를 사용)
- `/api/health` 에 Redis 상태 포함 (6단계)
