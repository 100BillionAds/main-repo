---
description: "백억광고" 프로젝트의 Next.js (App Router) 및 React 코드 생성 규칙입니다.
applyTo: "src/**/*.js"
---

# 1. Next.js 및 React 규칙

* **프레임워크:** **Next.js 14+ App Router**(`src/app` 폴더)를 사용합니다.
* **컴포넌트:** **오직 함수형 컴포넌트**와 Hooks (`useState`, `useEffect` 등)만 사용합니다. 클래스형 컴포넌트는 절대 사용하지 않습니다.
* **컴포넌트 유형:** 가능한 한 **서버 컴포넌트(Server Component)**를 기본으로 사용합니다. `useState`, `onClick` 등 브라우저 상호작용이 필요할 때만 파일 상단에 `'use client';`를 선언합니다.
* **파일 및 컴포넌트 명명:** 컴포넌트 파일명과 함수명은 **PascalCase**를 따릅니다. (예: `SignupForm.js`)
* **스타일:** **Tailwind CSS**를 기본으로 사용합니다. 인라인 `style={{...}}` 객체 사용은 지양합니다.
* **데이터 페칭(Data Fetching):**
    * 서버 컴포넌트에서는 `fetch` 또는 **Sequelize**를 직접 사용하여 데이터를 가져옵니다.
    * 클라이언트 컴포넌트에서는 `SWR` 또는 `React Query` (Zustand와 함께) 사용을 권장합니다.

# 2. API Routes (`app/api/.../route.js`) 규칙

* **구조:** App Router의 라우트 핸들러 규칙을 따릅니다. (예: `export async function GET(request) { ... }`)
* **응답:** 항상 `NextResponse.json(...)`을 사용하여 JSON 형식으로 응답합니다.
* **인증:** 민감한 API는 항상 **Next-Auth**의 `getServerSession`을 통해 세션을 확인하고 권한을 검사합니다.
* **DB 접근:** **Sequelize** 모델을 `import`하여 데이터베이스와 상호작용합니다.
* **예외 처리:** 모든 API 라우트는 `try...catch` 구문으로 감싸야 하며, 에러 발생 시 적절한 5xx 상태 코드와 에러 메시지를 반환해야 합니다.