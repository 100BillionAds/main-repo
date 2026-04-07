# 백억광고 (100BillionAds)

> 디자이너와 광고주를 연결하는 디자인 거래 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-16.0.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://react.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.1-010101?logo=socket.io)](https://socket.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)

## 📋 프로젝트 개요

백억광고는 디자이너가 포트폴리오를 등록하고, 광고주가 이를 구매하여 디자인 작업을 의뢰할 수 있는 **B2B 디자인 거래 플랫폼**입니다.

**v0.1.0** | 개발 진행 중 🚧

## 🚀 주요 기능

- 🎨 **포트폴리오 마켓** - 디자이너 작품 등록/검색/구매
- 💬 **실시간 채팅** - Socket.io 기반 1:1 메시징
- 💳 **에스크로 결제** - 안전한 포인트 기반 거래
- ⭐ **리뷰 시스템** - 거래 완료 후 별점 평가
- 👥 **다중 역할** - 광고주, 디자이너, 관리자

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS, Socket.io Client |
| **Backend** | Next.js API Routes, NextAuth.js, Socket.io Server |
| **Database** | MySQL 8.0 (mysql2) |
| **Payment** | Portone SDK |

## 📁 프로젝트 구조

```
main-repo/
├── docs/                # 📚 문서
│   ├── ARCHITECTURE.md  # 시스템 아키텍처
│   ├── ERD.md           # 데이터베이스 ERD
│   ├── DEPLOYMENT.md    # 배포 가이드
│   └── CONTRIBUTING.md  # 기여 가이드
└── 10badv/              # 📦 애플리케이션 코드
    ├── src/
    └── ...
```

## 🚀 빠른 시작

```bash
# 저장소 클론
git clone https://github.com/100BillionAds/main-repo.git
cd main-repo/10badv

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local

# 개발 서버 실행
npm run dev
```

자세한 설정은 [10badv/README.md](./10badv/README.md)를 참고하세요.

## 📚 문서

- [시스템 아키텍처](./docs/ARCHITECTURE.md)
- [데이터베이스 ERD](./docs/ERD.md)
- [배포 가이드](./docs/DEPLOYMENT.md)
- [기여 가이드](./docs/CONTRIBUTING.md)
- [변경 이력](./docs/CHANGELOG.md)
