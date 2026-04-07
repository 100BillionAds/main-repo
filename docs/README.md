# 백억광고 (100BillionAds) 문서

> 이 폴더에는 프로젝트의 모든 기술 문서가 포함되어 있습니다.

## 📚 문서 목록

| 문서 | 설명 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 시스템 아키텍처 다이어그램 및 레이어별 설명 |
| [ERD.md](./ERD.md) | 데이터베이스 ERD 및 테이블 스키마 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel, Docker, AWS 배포 가이드 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 기여 가이드 및 코드 스타일 |
| [CHANGELOG.md](./CHANGELOG.md) | 버전별 변경 이력 |

## 🚀 빠른 시작

개발 환경 설정은 [10badv/README.md](../10badv/README.md)를 참고하세요.

## 🏗️ 기술 스택 요약

| 분류 | 기술 |
|------|------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS |
| **Backend** | Next.js API Routes, Socket.io |
| **Database** | MySQL 8.0 (mysql2) |
| **Auth** | NextAuth.js |
| **Payment** | Portone SDK |

## 📁 프로젝트 구조

```
main-repo/
├── docs/                # 📁 문서 (현재 위치)
├── 10badv/              # 📁 애플리케이션 코드
│   ├── src/
│   │   ├── app/         # Next.js App Router 페이지
│   │   ├── components/  # 공통 컴포넌트
│   │   ├── features/    # 기능별 모듈 (admin, chat, payment, portfolio)
│   │   ├── hooks/       # 커스텀 훅
│   │   ├── lib/         # DB, 유틸리티
│   │   └── utils/       # 헬퍼 함수
│   ├── public/          # 정적 파일
│   └── server.js        # Socket.io 커스텀 서버
└── .github/             # GitHub Actions, 이슈 템플릿
```

## 🔗 외부 링크

- [Next.js Documentation](https://nextjs.org/docs)
- [Socket.io Documentation](https://socket.io/docs/)
- [Portone API Documentation](https://developers.portone.io/)
