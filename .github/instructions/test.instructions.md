---
description: Jest와 React Testing Library(RTL)를 사용한 테스트 코드 생성 지침입니다.
applyTo: "**/*.test.js, **/*.spec.js"
---

# 1. 테스트 기본 원칙

* **테스트 도구:** **Jest**를 테스트 러너로, **React Testing Library(RTL)**를 컴포넌트 테스트 라이브러리로 사용합니다.
* **테스트 대상:** 구현 세부 사항(e.g., 특정 state 값)이 아닌 **사용자의 관점에서 보이는 동작**을 테스트합니다.
* **쿼리(Query):** `getByRole`, `getByLabelText`, `getByText` 등 사용자가 인지할 수 있는 시맨틱 쿼리를 우선적으로 사용합니다. `getByTestId`는 최후의 수단으로 사용합니다.

# 2. 테스트 코드 구조

* **구조:** `describe` 블록으로 테스트 스위트를 그룹화하고, `it` (또는 `test`) 블록으로 개별 케이스를 작성합니다.
* **패턴:** "Given-When-Then" (준비-실행-검증) 또는 "Arrange-Act-Assert" (정렬-실행-단언) 패턴을 따릅니다.
* **Mocking:**
    * Next.js의 `useRouter` 등 훅은 `jest.fn()`으로 모의(mock) 처리합니다.
    * API 요청(`fetch`, `axios`)이나 Sequelize 호출은 **MSW(Mock Service Worker)** 또는 `jest.mock`을 사용하여 모의 처리합니다.

# 3. 테스트 케이스 예시

* **Happy Path (성공):** 폼을 올바르게 제출하면 "성공" 메시지가 표시되는지 테스트합니다.
* **Sad Path (실패):**
    * 필수 입력 필드를 비워두고 제출하면 "에러" 메시지가 표시되는지 테스트합니다.
    * API 요청이 500 에러를 반환했을 때 사용자에게 적절한 피드백이 가는지 테스트합니다.