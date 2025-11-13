# 기여 가이드

10badv 프로젝트에 기여해 주셔서 감사합니다! 🎉

## 시작하기

1. **Repository Fork하기**
   - GitHub에서 이 저장소를 Fork합니다.

2. **로컬에 Clone하기**
   ```bash
   git clone https://github.com/YOUR_USERNAME/main-repo.git
   cd main-repo/10badv
   ```

3. **의존성 설치**
   ```bash
   npm install
   ```

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```

## 개발 워크플로우

### 브랜치 전략

- `main` - 프로덕션 코드
- `feature/*` - 새로운 기능
- `fix/*` - 버그 수정
- `docs/*` - 문서 업데이트
- `refactor/*` - 리팩토링

### 커밋 메시지 규칙

[Conventional Commits](https://www.conventionalcommits.org/) 형식을 따릅니다:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드/설정 변경

**예시:**
```
feat(dashboard): 통계 차트 추가

프로젝트 대시보드에 월별 통계 차트를 추가했습니다.

Closes #123
```

## 코드 스타일

### JavaScript/JSX

- ESLint와 Prettier 설정을 따릅니다
- 코드 제출 전 포맷팅: `npm run format`
- Lint 검사: `npm run lint`

### 컴포넌트 작성 가이드

1. **파일 구조**
   ```javascript
   import statements...

   /**
    * 컴포넌트 설명
    * @param {Object} props - props 설명
    */
   export default function ComponentName({ props }) {
     // 컴포넌트 로직
   }
   ```

2. **Props 검증**
   - JSDoc을 사용하여 props 타입 명시

3. **스타일링**
   - Tailwind CSS 유틸리티 클래스 사용
   - 반복되는 스타일은 컴포넌트로 추출

### 테스트 작성

- 모든 새로운 기능에는 테스트 코드 필수
- 테스트 파일: `__tests__/` 디렉토리
- 테스트 실행: `npm test`

```javascript
import { render, screen } from '@testing-library/react';
import Component from '@/components/Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
```

## Pull Request 프로세스

1. **브랜치 생성**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **변경사항 작성**
   - 의미 있는 단위로 커밋
   - 커밋 메시지 규칙 준수

3. **테스트 실행**
   ```bash
   npm test
   npm run lint
   ```

4. **Push**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Pull Request 생성**
   - 명확한 제목과 설명 작성
   - 관련 이슈 번호 연결

### PR 체크리스트

- [ ] 코드가 정상적으로 동작하는가?
- [ ] 테스트가 통과하는가?
- [ ] Lint 오류가 없는가?
- [ ] 문서가 업데이트되었는가?
- [ ] 커밋 메시지가 규칙을 따르는가?

## 코드 리뷰

- 모든 PR은 최소 1명의 리뷰어 승인 필요
- 건설적인 피드백 환영
- 리뷰 코멘트에 신속히 대응

## 질문이 있으신가요?

- Issue를 통해 질문해주세요
- 토론이 필요한 경우 Discussion 활용

## 행동 강령

- 서로 존중하고 배려합니다
- 건설적인 비판을 환영합니다
- 다양성을 존중합니다

감사합니다! 🙏
