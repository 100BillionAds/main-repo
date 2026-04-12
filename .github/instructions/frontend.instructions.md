---
description: "Next.js 페이지/컴포넌트 및 사용자 인터랙션 동작을 구현할 때 사용합니다."
applyTo: "10badv/src/app/**/page.js, 10badv/src/app/**/layout.js, 10badv/src/features/**/*.js, 10badv/src/shared/**/*.js"
---
# 프론트엔드 지침

- 기본은 서버 컴포넌트를 사용하고, 필요할 때만 `'use client';`를 추가합니다.
- 기존 디자인 시스템 지침과 접근성 우선 시맨틱 마크업을 준수합니다.
- 반응형 구현은 모바일 우선으로 유지합니다.
- 변경 동작에 대해 사용자 중심 테스트를 추가/유지합니다.
