# AI (LLM) 기능

LLM 을 서비스에 붙이는 구조와, 첫 기능인 **의뢰서 초안 작성**을 설명합니다.

## 한눈에 보기

```
브라우저 (의뢰 작성 화면)
   │  POST /api/ai/request-draft { brief }          ← 짧은 메모
   ▼
API 라우트                인증, SSE 응답으로 변환
   ▼
requestDraftService      입력 검증 → 하루 한도 → LLM 호출 → 사용 기록
   ▼
LLM 클라이언트            제한 시간 · 재시도 · 대체 제공자
   ▼
제공자 (mock | anthropic | openai)
```

글자가 만들어지는 대로 화면에 채워집니다(스트리밍). 결과는 제목·설명 칸에 들어갈 뿐 자동으로 등록되지 않으며, 사용자가 고친 뒤 직접 등록합니다.

## 용어

| 용어 | 뜻 |
|---|---|
| 제공자(provider) | LLM 을 서비스하는 곳. Anthropic, OpenAI, 그리고 가짜(mock) |
| 프롬프트 | 모델에게 주는 지시문. 시스템 프롬프트(역할·규칙)와 사용자 메시지(자료) |
| 토큰 | 모델이 글을 세는 단위. 요금은 입력 토큰 + 출력 토큰으로 매겨진다 |
| 스트리밍 | 응답을 다 만든 뒤 한 번에 주지 않고, 만드는 대로 흘려보내는 것 |
| SSE | Server-Sent Events. 스트리밍에 쓰는 HTTP 응답 형식 |
| 대체(fallback) | 주 제공자가 실패했을 때 다른 제공자로 넘어가는 것 |

## 파일

```
10badv/src/
├── lib/
│   ├── sse.js                    # SSE 읽기/쓰기 (서버·브라우저 공용)
│   └── llm/
│       ├── index.js              # 환경변수 → 클라이언트 조립, collect()
│       ├── anthropic.js          # 제공자: Anthropic Messages API
│       ├── openai.js             # 제공자: OpenAI Chat Completions API
│       ├── mock.js               # 제공자: 가짜 (키·비용 없이 개발/테스트)
│       ├── resilient.js          # 제한 시간, 재시도, 대체 제공자
│       └── errors.js             # LlmError: 제공자별 오류를 같은 모양으로
├── domain/ai/
│   ├── prompts/requestDraft.v1.js  # 프롬프트 (버전 관리)
│   ├── requestDraft.js             # 입력 검증, 출력 해석 (순수 함수)
│   ├── requestDraftService.js      # 응용 서비스
│   └── aiUsageRepository.js        # ai_requests 테이블
└── app/api/ai/request-draft/route.js
```

## 제공자 추상화

모든 제공자는 메서드 하나만 가집니다.

```js
provider.stream({ system, messages, maxTokens, temperature, signal })
// → 비동기 반복자
//   { type: 'text', text: '...' }                       여러 번
//   { type: 'done', usage: { inputTokens, outputTokens }, model, provider }   마지막에 한 번
```

Anthropic 과 OpenAI 는 요청 모양(시스템 프롬프트의 위치), 응답 이벤트 형식, 토큰 수 필드 이름이 모두 다릅니다. 그 차이는 각 제공자 파일 안에서 끝나고, 기능 코드(`domain/ai`)는 위 모양만 압니다. 그래서 제공자를 바꾸는 일이 코드 수정이 아니라 **환경변수 변경**입니다.

같은 이유로 SDK 를 쓰지 않고 `fetch` 로 직접 호출합니다. 의존성이 늘지 않고, 실제로 무엇이 오가는지 코드에 그대로 보입니다.

## 장애 대응 (`resilient.js`)

LLM 호출은 느리고(수 초~수십 초), 자주 실패합니다(요청 한도, 과부하). 제공자를 감싸는 한 겹으로 처리합니다.

| 장치 | 동작 | 기본값 |
|---|---|---|
| 제한 시간 | 시간 안에 끝나지 않으면 연결을 끊는다 | 30초 |
| 재시도 | 일시적 오류만 다시 시도. 간격은 300ms → 600ms → 1200ms 로 늘리고 무작위 값을 섞는다 | 2회 |
| 대체 제공자 | 재시도 후에도 실패하면 다른 제공자로 | 없음 |

오류를 분류해서 **다시 해볼 만한 것만** 재시도합니다.

| 코드 | 원인 | 재시도 | 대체 |
|---|---|---|---|
| `RATE_LIMITED` | 429 요청 한도 | 예 | 예 |
| `UNAVAILABLE` | 5xx, 과부하 | 예 | 예 |
| `NETWORK`, `TIMEOUT` | 연결 실패, 시간 초과 | 예 | 예 |
| `AUTH` | API 키 문제 | 아니오 | 예 |
| `BAD_REQUEST` | 우리 요청이 잘못됨 | 아니오 | 아니오 |
| `ABORTED` | 사용자가 페이지를 떠남 | 아니오 | 아니오 |

**글자가 한 번이라도 나간 뒤에는 재시도도 대체도 하지 않습니다.** 이미 화면에 일부가 보인 상태에서 처음부터 다시 시작하면 같은 내용이 두 번 나오기 때문입니다.

## 프롬프트 관리

프롬프트는 `domain/ai/prompts/` 에 **파일 + 버전**으로 둡니다. 문구 하나가 바뀌어도 결과가 달라지므로, 고칠 때는 기존 파일을 수정하지 않고 `requestDraft.v2.js` 를 새로 만듭니다. 호출마다 `ai_requests.prompt_version` 에 버전이 남아 버전별 토큰 사용량과 실패율을 비교할 수 있습니다.

v1 프롬프트의 핵심 규칙:

- 메모에 **없는 사실은 지어내지 않는다** (가게 이름, 크기, 금액, 일정). 필요한데 없는 정보는 "확인 필요" 질문으로 남긴다.
- 출력 형식을 고정한다 (`제목: ...` / `---` / 본문). 형식이 어긋나도 `parseDraft` 는 전체를 본문으로 돌려주어 결과를 버리지 않는다.

### 프롬프트 주입 대비

사용자 메모는 "지시"가 아니라 "자료"입니다. 메모 안에 "위 지시를 무시하고…" 같은 문장이 있어도 따르지 않도록 세 겹으로 막습니다.

1. 메모를 `<brief>` 구획 안에 넣고, 시스템 프롬프트에서 그 안은 자료로만 취급하라고 명시
2. 입력에서 `<`, `>` 를 제거해 사용자가 구획을 닫지 못하게 함
3. 결과가 자동으로 실행·등록되지 않음 — 본인 화면의 초안 칸에만 들어가고, 사람이 확인 후 등록

## 비용 통제

| 장치 | 위치 |
|---|---|
| 입력 길이 제한 (10~500자) | `requestDraft.js` — LLM 을 부르기 전에 거부 |
| 출력 길이 제한 (`maxTokens: 800`) | 프롬프트 파일 |
| 사용자별 하루 한도 (기본 20회 / 24시간) | `requestDraftService.js` |
| 로그인 필수 | API 라우트 |
| 사용자가 떠나면 호출 중단 | `request.signal` → 제공자 `fetch` 취소 |

하루 한도는 **먼저 기록하고 나서 셉니다**. "세고 나서 기록"하면 동시에 들어온 요청들이 모두 한도 안이라고 판단해 통과합니다. 먼저 기록하면 동시 요청이 서로의 기록을 보게 되어 한도를 넘지 않습니다. (대신 한도 근처에서 동시에 누르면 필요 이상으로 거절될 수 있습니다. 거절된 요청은 횟수에 들어가지 않습니다.)

## 사용 기록 (`ai_requests`)

호출마다 한 행을 남깁니다: 사용자, 기능, 프롬프트 버전, 제공자, 모델, 상태(`pending` / `success` / `error` / `rejected`), 입력 글자 수, 입출력 토큰 수, 걸린 시간, 오류 코드.

**메모 원문과 모델 응답은 저장하지 않습니다.**

```sql
-- 최근 7일 기능·버전별 사용량
SELECT feature, prompt_version, provider, status, COUNT(*) AS calls,
       SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens,
       ROUND(AVG(latency_ms)) AS avg_ms
  FROM ai_requests
 WHERE created_at > NOW() - INTERVAL 7 DAY
 GROUP BY feature, prompt_version, provider, status;
```

## API

`POST /api/ai/request-draft` (로그인 필요)

요청

```json
{ "brief": "동네 카페 간판. 따뜻한 느낌, 나무 소재", "category": "커피숍", "budget": 500000 }
```

응답 — 시작 전에 실패하면 일반 JSON

| 상태 | 경우 |
|---|---|
| 400 | 메모가 10자 미만 또는 500자 초과 |
| 401 | 로그인하지 않음 |
| 429 | 하루 한도 초과 |

응답 — 성공하면 `text/event-stream`

```
event: delta
data: {"text":"제목: 동네 카페"}

event: done
data: {"title":"동네 카페 간판 디자인 의뢰","description":"1. 의뢰 내용\n..."}
```

스트림 도중 LLM 이 실패하면 `event: error` 가 옵니다.

## 설정

| 변수 | 기본값 | 설명 |
|---|---|---|
| `LLM_PROVIDER` | `mock` | `mock` \| `anthropic` \| `openai` |
| `LLM_MODEL` | anthropic: `claude-haiku-5-5` | 모델 이름. openai 는 필수 |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | | 해당 제공자를 쓸 때 |
| `LLM_FALLBACK_PROVIDER`, `LLM_FALLBACK_MODEL` | 없음 | 대체 제공자 |
| `LLM_TIMEOUT_MS` | `30000` | 호출 한 번의 제한 시간 |
| `LLM_MAX_RETRIES` | `2` | 재시도 횟수 |
| `LLM_DAILY_LIMIT_PER_USER` | `20` | 사용자별 24시간 한도 |

### mock 제공자

`LLM_PROVIDER=mock` 이면 실제 AI 를 부르지 않고 고정된 양식을 돌려줍니다. 응답 본문에 **"예시 응답입니다"** 라는 문구가 들어가므로 진짜 AI 답으로 오해할 일이 없습니다. 운영 배포의 기본값도 mock 입니다.

### 실제 AI 로 바꾸기

1. [Anthropic Console](https://console.anthropic.com) 에서 API 키를 발급합니다 (사용량만큼 과금).
2. Render → tenbadv → Environment 에서 `ANTHROPIC_API_KEY` 에 키를 넣고, `LLM_PROVIDER` 를 `anthropic` 으로 바꿉니다.
3. 저장하면 재배포됩니다. 코드 변경은 없습니다.

## 테스트

| 파일 | 내용 | 외부 호출 |
|---|---|---|
| `__tests__/lib/llm/providers.test.js` | SSE 파싱(조각난 응답), 제공자별 요청·응답 변환, 오류 분류 | 없음 (가짜 fetch) |
| `__tests__/lib/llm/resilient.test.js` | 재시도, 대체, 제한 시간, 취소, 도중 실패 | 없음 |
| `__tests__/domain/requestDraft.test.js` | 입력 검증, 프롬프트, 출력 해석, 서비스 흐름·한도·기록 | 없음 |
| `__tests__/integration/aiRequestDraft.integration.test.js` | 사용 기록 SQL, 하루 한도, 동시 요청 | DB 만 (MySQL, TiDB) |

실제 제공자 API 를 부르는 테스트는 없습니다. 실제 키로의 동작은 배포 후 수동으로 확인합니다.

## 아직 없는 것

- 응답 캐시, 원자적 요청 제한 (4단계: Redis)
- 오래 걸리는 작업을 큐로 넘기기 (5단계)
- 모델 응답의 품질 평가(eval) 자동화
