# 10badv - Modern Workspace Application

Next.js 16 기반의 현대적인 워크스페이스 애플리케이션입니다.

## 🚀 주요 기능

- ✨ **Modern Stack**: Next.js 16, React 19, Tailwind CSS 4
- 🎨 **Beautiful UI**: 다크 모드 지원, 반응형 디자인
- 🔒 **Authentication**: NextAuth.js를 통한 인증 시스템
- 📊 **Dashboard**: 프로젝트 및 태스크 관리
- 🧪 **Testing**: Jest, React Testing Library
- 📝 **TypeScript Ready**: JSDoc 타입 힌트 지원

## 📦 설치

```bash
cd 10badv
npm install
```

## 🛠️ 개발

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:3000 접속
```

## 🧪 테스트

```bash
# 전체 테스트 실행
npm test

# 테스트 watch 모드
npm run test:watch

# 커버리지 확인
npm run test:coverage
```

## 🏗️ 빌드

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 📁 프로젝트 구조

```
10badv/
├── src/
│   ├── app/              # Next.js 앱 라우터
│   │   ├── api/          # API 라우트
│   │   ├── dashboard/    # 대시보드 페이지
│   │   ├── projects/     # 프로젝트 페이지
│   │   ├── demo/         # 데모 페이지
│   │   ├── about/        # 소개 페이지
│   │   ├── layout.js     # 루트 레이아웃
│   │   └── page.js       # 홈 페이지
│   ├── components/       # 재사용 컴포넌트
│   │   └── ui/           # UI 컴포넌트
│   ├── hooks/            # 커스텀 훅
│   ├── utils/            # 유틸리티 함수
│   └── lib/              # 라이브러리 설정
├── __tests__/            # 테스트 파일
├── public/               # 정적 파일
└── package.json
```

## 🔧 주요 설정 파일

- `next.config.mjs` - Next.js 설정
- `jsconfig.json` - 경로 별칭 설정
- `jest.config.js` - Jest 테스트 설정
- `.eslintrc.json` - ESLint 설정
- `.prettierrc` - Prettier 설정

## 🎯 페이지

- `/` - 홈 페이지
- `/dashboard` - 대시보드
- `/projects` - 프로젝트 목록
- `/projects/[id]` - 프로젝트 상세
- `/demo` - 인터랙티브 데모
- `/about` - 프로젝트 소개

## 🔌 API 엔드포인트

- `GET /api/health` - 헬스 체크
- `GET /api/tasks` - 태스크 목록 조회
- `POST /api/tasks` - 새 태스크 생성

## 🎨 커스텀 컴포넌트

- `Button` - 다양한 variant와 size 지원
- `Card` - Header, Content, Footer 서브 컴포넌트
- `Input` - 라벨, 에러 메시지 지원
- `Loading` - 로딩 스피너
- `Header` - 네비게이션 헤더
- `Footer` - 푸터

## 🪝 커스텀 훅

- `useLocalStorage` - 로컬 스토리지 상태 관리
- `useMediaQuery` - 미디어 쿼리 감지
- `useBreakpoint` - 반응형 브레이크포인트
- `useToggle` - 토글 상태 관리

## 🛠️ 유틸리티 함수

- `helpers.js` - 날짜 포맷, 슬러그, 숫자 포맷 등
- `api.js` - API 요청 헬퍼 함수

## 📝 코드 품질

```bash
# ESLint 실행
npm run lint

# Prettier 포맷팅
npm run format
```

## 🌍 환경 변수

`.env.example` 파일을 `.env.local`로 복사하고 필요한 값을 설정하세요.

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 👥 개발팀

100BillionAds - [GitHub](https://github.com/100BillionAds)

---

Made with ❤️ using Next.js
