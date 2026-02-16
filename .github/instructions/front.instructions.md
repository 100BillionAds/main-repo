---
description: (v2.2) "백억광고" 프론트엔드 디자인 시스템(Claymorphism), 하이브리드 스타일링(Tailwind + CSS Modules), UX 극대화 지침입니다.
applyTo: "src/app/**/page.js", "src/app/**/layout.js", "src/features/**/*.js", "src/shared/**/*.js", "!src/app/api/**"
---

# 1. 🎨 디자인 시스템 및 UX 극대화 원칙 (v2.2)

모든 프론트엔드 UI는 '기능'이 아닌 **'경험'**을 중심으로 설계합니다. 텍스트만 나열하는 것이 아니라, 사용자가 "즐겁고", "쉽게" 서비스를 이용할 수 있도록 **UX를 극대화**하는 것을 최우선 목표로 합니다.

### 1.1. 핵심 디자인 철학

1.  **Google SaaS 스타일:** 'Google Analytics', 'Firebase' 등 최신 Google SaaS 제품의 디자인 철학을 따릅니다. 이는 **극단적인 여백(Whitespace)**, 기능적 명확성, 데이터 중심의 깔끔한 레이아웃을 의미합니다.
2.  **클레이모피즘 (Claymorphism):** 딱딱한 사각형이 아닌, **'찰흙(Clay)'**처럼 둥글고 '부풀린(Puffy)'듯한 3D 스타일을 컴포넌트(버튼, 카드)에 적용하여 시각적 즐거움을 줍니다.
3.  **파스텔 톤 (Pastel Tones):** 쨍한 색상 대신 **부드러운 파스텔 톤**(`blue-100`, `green-100` 등)을 배경, 하이라이트, 사용자 아바타 등에 사용하여 편안하고 현대적인 느낌을 줍니다.

### 1.2. 톤앤매너 (Tone & Manner)

* **배경:** 순백(`bg-white`) 대신, `bg-gray-50` 또는 `bg-slate-50`을 사용하여 흰색 카드/컴포넌트가 '떠 있는' 느낌을 강조합니다.
* **색상:**
    * `Primary (주요) (SaaS)`: `blue-600` (Google의 기능적 파란색)
    * `Pastel (보조)`: `blue-100`, `purple-100` (알림, 배지, 사용자 프로필 배경)
    * `Neutral (본문)`: `gray-800` (제목), `gray-500` (설명)
* **스타일:** `rounded-xl` (더 둥글게), `shadow-lg` (부드럽고 풍부한 그림자)

### 1.3. 📱 반응형 디자인 (Responsive Design) - (Mobile-First)

* **원칙:** **모바일 우선(Mobile-First)** 접근 방식을 엄격히 준수합니다.
* **구현:**
    1.  먼저 **모바일(sm)** 기준(e.g., `grid-cols-1`)으로 스타일을 작성합니다.
    2.  `md:` (태블릿), `lg:` (데스크탑) 브레이크포인트를 사용하여 레이아웃을 확장합니다.
    * **(중요)** `lg:` 스크린에서는 **한 줄에 3개 카드**(`lg:grid-cols-3`)를 기본으로 하여 넉넉한 여백을 확보합니다.

### 1.4. ✨ UX 극대화: 인터랙션 및 애니메이션

* **마이크로 인터랙션:**
    * **호버 (Hover):** 버튼/카드에 `transition-transform hover:scale-[1.02]` 또는 `hover:brightness-110`
    * **클릭 (Click):** 버튼 클릭 시 `active:scale-[0.98]`
    * **포커스 (Focus):** 모든 입력 필드, 버튼은 `focus:ring-2 focus:ring-primary/50`
* **애니메이션:**
    * **(필수)** 페이지/모달 로드 시 부드럽게 나타나야 합니다. (`tailwindcss-animate` 사용)
    * **예시:** `animate-in fade-in slide-in-from-bottom-2 duration-300`
* **로딩 (Loading):**
    * **(금지)** 단순 텍스트("로딩 중...") 사용 금지.
    * **(필수)** **스켈레톤 UI (Skeleton)**를 모든 카드, 프로필, 리스트에 적용합니다.
* **버튼 로딩:** 클릭 시 "로딩 아이콘 + 텍스트"로 변경하고 `disabled` 상태로 만듭니다.

### 1.5. 📐 핵심 UI 컴포넌트 상세 가이드 (UX/디자인 적용)

#### 1. 버튼 (`Button.js`)
* **디자인:** **클레이모피즘** 적용. `rounded-lg` 또는 `rounded-full`, `shadow-lg`, `font-semibold`.
* **인터랙션:** `hover:brightness-110`, `active:scale-[0.98] transition-all`

#### 2. 카드 (`Card.js`)
* **디자인:** **클레이모피즘**의 핵심. `bg-white`, `rounded-xl`, `shadow-lg`. 배경(`bg-slate-50`)과 명확히 분리되어 '떠 있는' 느낌.
* **(중요) 구조:** "사진이 너무 큰 문제"를 해결하기 위해, 카드는 **시각적 균형**을 이뤄야 합니다.
    * **(상단)** 썸네일 이미지 (`aspect-video` 또는 `aspect-[16/9]` 비율 유지)
    * **(하단)** `p-4` 또는 `p-6` 여백을 준 텍스트 영역 (제목, 설명, 태그, 가격 등)

#### 3. 모달 (`Modal.js`)
* **UX 극대화:**
    * **배경 (Backdrop):** **Google SaaS 스타일.** `bg-black/30 backdrop-blur-sm` (뒷배경을 흐리게 처리)
    * **애니메이션:** `animate-in fade-in zoom-in-95` (모달이 '튀어나오는' 느낌)
    * **기능:** ESC 키로 닫기, 바깥쪽 배경 클릭으로 닫기 기능이 **반드시** 포함.

#### 4. 입력 (`Input.js` / `Form`)
* **디자인:** `Floating Label` (포커스 시 `placeholder`가 레이블이 되어 위로 올라감)
* **UX:** `onBlur` (포커스 아웃 시) 즉시 유효성 검사 피드백.

### 1.6. 🎨 스타일링 전략 (Hybrid: Tailwind + CSS Modules)

* **(중요)** 우리는 **하이브리드** 스타일링 전략을 사용합니다.
* **1. Tailwind CSS (기본):**
    * 레이아웃 (`flex`, `grid`), 간격 (`p-`, `m-`), 반응형 (`md:`, `lg:`), 기본 스타일 (`rounded-lg`, `shadow-lg`), 애니메이션 등 **모든 공통 유틸리티**는 Tailwind를 사용합니다.
* **2. CSS Modules (컴포넌트/페이지 전용):**
    * **(필수)** 특정 컴포넌트나 페이지만을 위한 복잡하고 고유한 스타일은 **CSS Modules (`.module.css`)**을 사용합니다.
    * **(규칙)** 파일은 컴포넌트와 **같은 위치**에 둡니다.
    * **(예시)** `dashboard/page.js`의 전용 스타일은 `dashboard/dashboard.module.css` 파일에 작성하고, `import styles from './dashboard.module.css'`로 불러와 `className={styles.myCard}`처럼 사용합니다.
    * **(금지)** 전역 `.css` 파일을 컴포넌트 레벨에서 `import`하는 것을 금지합니다 (Next.js 오류 및 충돌 유발).

### 1.7. 기술적 개발 원칙
* **핵심 도구:** React (함수형), Tailwind CSS, Zustand, **CSS Modules**
* **컴포넌트 유형:** 서버 컴포넌트(Default), 클라이언트 컴포넌트(`'use client'`)
* **데이터 페칭 (Client):** `useSWR` 또는 `Zustand + fetch`
* **네이밍:** `PascalCase`

---

# 2. 🏛️ 메인 페이지(`src/app/page.js`) 구현 가이드

인프런 스타일의 시각적인 메인 페이지를 구현합니다.

### 2.1. 섹션 1: 핵심 통계 (`StatisticsDashboard.js`)
* **목표:** "텍스트만 나오는 문제" 해결. 플랫폼 활성도를 시각적으로 보여줍니다.
* **스타일:** 4개의 `Card`를 `grid-cols-2 lg:grid-cols-4`로 배치.
* **카드 디자인:** **(필수)** 텍스트만 넣지 않습니다.
    * **아이콘:** `Heroicons` 또는 `Lucide Icons` (e.g., "포트폴리오" 아이콘)
    * **배경:** **부드러운 파스텔 톤** (`bg-blue-50`, `bg-green-50` 등)
    * **내용:** 굵은 숫자(`text-3xl font-bold`)와 설명 텍스트.
* **내용:** "총 등록된 포트폴리오", "거래중인 건수", "완료된 총 거래", "총 회원 수"

### 2.2. 섹션 2: 최근 성사된 거래 (`LatestTransactionGrid.js`)
* **목표:** '최근 성사된 거래'를 인프런 강의 목록처럼 보여줍니다.
* **스타일:** **반응형 카드 그리드** (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`)
* **카드 디자인:** `1.5` 가이드(이미지 + 텍스트 영역)를 따릅니다.
* **인터랙션:** 카드를 클릭하면 **`/transactions/[id]`** 상세 페이지로 이동합니다.

### 2.3. 섹션 3: 우수 디자이너 (`FeaturedDesignerCarousel.js`)
* **목표:** '우수 사용자'를 가로 캐러셀로 노출합니다.
* **카드 디자인:** **파스텔 톤** 배경의 프로필 카드. (`rounded-full` 아바타)

---

# 3. 🖼️ 전체 애플리케이션 레이아웃 (노션 + 인프런)

### 3.1. 상단 헤더 (`Header.js`)
* **스타일:** 인프런처럼 상단 고정, **'메인 검색창'** 중심.
* **반응형:** `lg:`에서 검색창 표시, `md:` 이하에서는 검색 아이콘 또는 햄버거 메뉴로 이동.

### 3.2. 왼쪽 사이드바 (`Sidebar.js`)
* **스타일:** 노션처럼 계층형 메뉴, 접고 펼 수 있음(Collapsible).
* **반응형:** `lg:`에서 고정 표시, `md:` 이하에서는 숨김 (`hidden lg:block`).
* **모바일:** `md:` 이하에서는 `MobileSidebar.js`가 햄버거 메뉴 클릭 시 `Drawer`로 열립니다. (Zustand로 상태 관리, **배경 `backdrop-blur-sm` 적용**)
* **메뉴 구성:**
    * 🛒 **포트폴리오 마켓**
    * ✍️ **디자인 의뢰하기**
    * 🧑‍🎨 **디자이너 찾기**
    * 🗣️ **자유게시판**
    * Ⓜ️ **마이페이지** (로그인 시)
    * 💬 **채팅** (로그인 시, **안 읽은 메시지는 파스텔 톤 `Badge`로 숫자 표시**)

---

# 4. 📑 동적 페이지 템플릿 (Portfolio & Transaction)

**"페이지 구조는 동일하게, 내용만 바꿔 끼는"** 전략입니다. `portfolio/[id]`와 `transactions/[id]` 페이지는 이 공통 템플릿을 사용해야 합니다.

### 4.1. 렌더링 전략: SSR 뼈대 + CSR 컨텐츠
* **SSR (`page.js`):**
    * **로딩 스켈레톤**을 `fallback`으로 하는 `<Suspense>`를 사용합니다.
    * 이 단계에서는 "시각적인 뼈대"만 빠르게 로드됩니다.
* **CSR (`*Detail.js`):**
    * `'use client';`를 선언합니다.
    * `useSWR` 또는 `Zustand`를 사용해 클라이언트에서 API로 실제 데이터를 가져옵니다.
    * 데이터 로딩이 완료되면 스켈레톤이 실제 컨텐츠로 교체됩니다.

### 4.2. (중요) 공통 레이아웃: `DynamicPageLayout.js`
* **구조:** **2단 컬럼 레이아웃** (메인 콘텐츠 + 정보 사이드바)
* **반응형:** 데스크탑(`lg:`)에서는 2단, 모바일/태블릿(`md:` 이하)에서는 1단으로 표시됩니다.
* **슬롯(Slots):**
    * **메인 콘텐츠 (Main Content):** (왼쪽, 70%) 페이지의 핵심 내용. (e.g., 포트폴리오 이미지 갤러리, 거래 상세 타임라인)
    * **정보 사이드바 (Aside/Sidebar):** (오른쪽, 30%) **'클레이모피즘'**이 적용된 **'떠 있는' 정보 카드** (`sticky top-20` 적용).

### 4.3. 예시: 포트폴리오 상세 (`/app/portfolios/[id]/page.js`)
* **메인:** `PortfolioGallery.js` (이미지 갤러리)
* **사이드바:** `DesignerInfoCard.js` (디자이너 프로필), `PortfolioPurchaseCard.js` (가격, "채팅하기", "구매하기" **클레이모피즘 버튼**)

### 4.4. 예시: 거래 상세 (`/app/transactions/[id]/page.js`)
* **메인:** `TransactionTimeline.js` (의뢰 → 제안 → 결제 → 완료 과정을 시각적 타임라인으로 표시)
* **사이드바:** `TransactionSummary.js` (최종 결과물 이미지, 참여자, 최종 리뷰(`Review`) 요약 카드)

---

# 5. 📦 컴포넌트 아키텍처 (Atomic Design)

* **`src/shared/components/ui/`:**
    * **Atoms:** `Button.js`, `Modal.js`, `Input.js`, `Avatar.js`, `Card.js` (필수), `Badge.js` (파스텔 톤), `Skeleton.js` (필수)
    * 비즈니스 로직 없이 **디자인 시스템(1.0)**만 가집니다.
* **`src/features/[feature]/components/`:**
    * **Molecules/Organisms:** `SignupForm.js`, `LatestTransactionGrid.js`
    * `shared` 컴포넌트를 조합하여 실제 기능을 구현합니다.