# RepoQuest

> **백엔드 없이 브라우저에서 진짜 Git 객체 모델을 시뮬레이션하는, 비공식 학습용 GitHub 에뮬레이터**

🔗 **라이브 데모: https://jtech-co.github.io/repoquest/**

## 1. 소개 (Introduction)

이 프로젝트는 **Git/GitHub 입문자가 흔히 겪는 오개념을 교정**하기 위해 개발된 웹 애플리케이션입니다.
`commit`하면 GitHub에 올라간다거나 `fork`와 `clone`이 같다는 식의 착각을, **직접 눌러보며** 바로잡도록 설계했습니다.

실제 네트워크 호출 없이 모든 저장소·커밋·PR이 브라우저 안의 가짜 데이터로 존재하지만,
내부 동작은 **진짜 Git의 객체 모델(blob/tree/commit/refs/HEAD)** 을 그대로 따르므로 학습이 "거짓말"이 되지 않습니다.

**주요 기능**
- **로컬 ↔ 원격 분리 시각화**: "내 컴퓨터(로컬)"와 "github.com(서버)"를 명확히 구분하고, `↑ahead`/`↓behind` 배지로 push·pull의 필요성을 스스로 깨닫게 합니다.
- **세 트리 워크플로**: 작업 디렉터리 → 스테이징 → HEAD의 이동을 컬럼으로 보여주고, 버튼을 누르면 대응하는 git 명령이 미니 터미널에 미러링됩니다.
- **협업 시뮬레이션**: Fork·Clone·Push·Fetch·Pull, Pull Request(fast-forward/merge commit/squash), Issue, 머지 충돌 해소까지 전 흐름을 체험합니다.
- **게임형 코칭**: 가이드 미션 8단계(자동 판정) + 개념 카드 20종 + 진행도 영속화(localStorage) + 실험 리셋.
- **GitHub 다크 테마 UI**: Primer 디자인 토큰·Octicons 기반의 반응형 인터페이스.

## 2. 기술 스택 (Tech Stack)

- **Frontend**: React 18, TypeScript, Tailwind CSS, React Router
- **Backend**: 없음 — 100% 클라이언트에서 동작 (네트워크 호출 없음)
- **State Management**: Zustand (+ immer)
- **UI/Content**: @primer/octicons-react, react-markdown + remark-gfm, highlight.js
- **Test**: Vitest
- **Deployment**: GitHub Pages (GitHub Actions 자동 배포)

## 3. 설치 및 실행 (Quick Start)

**요구 사항**: Node.js 20 이상

1. **설치 (Install)**
   ```bash
   git clone https://github.com/JTech-CO/repoquest.git
   cd repoquest
   npm install
   ```

2. **환경 변수 (Environment)**
   불필요합니다. 백엔드·외부 API·인증이 없어 별도 설정 없이 바로 실행됩니다.

3. **실행 (Run)**
   ```bash
   npm run dev        # 개발 서버 (http://localhost:5173)
   ```

   기타 스크립트:
   ```bash
   npm run build      # 프로덕션 빌드 (dist/)
   npm run preview    # 빌드 결과 미리보기
   npm run typecheck  # 타입 체크 (tsc --noEmit)
   npm test           # 단위 테스트 (Vitest)
   ```

## 4. 폴더 구조 (Structure)

```text
src/
├── engine/      # 순수 Git 엔진 (objects/refs/diff/merge/commands) + 단위 테스트
├── github/      # 서버 연동 (fork/clone/push/fetch/pull/mergePr) — 엔진 위 객체 복사·refs 이동
├── store/       # Zustand World 스토어 + github/collab 액션 + localStorage 영속화
├── seed/        # 초기 시드 데이터 (가짜 유저·레포·PR·Issue)
├── tutorial/    # 개념 카드(concepts) + 가이드 미션(missions, 자동 판정)
└── ui/          # layout · pages · repo · work(워크스페이스) · collab · coach(코칭 패널)
```

> 엔진은 **부수효과 없는 순수 함수** 집합입니다(`(state, command) => newState`). 모든 로컬 git 동작은 엔진을 통하며,
> 서버 연동은 github 레이어가 `LocalClone ↔ RemoteRepo` 사이에서 처리합니다.

## 5. 정보 (Info)

- **License**: MIT (자세한 내용은 [LICENSE](LICENSE) 참고)
- **고지**: 본 사이트는 **비공식 학습용 시뮬레이터**이며 GitHub, Inc.와 어떠한 제휴 관계도 없습니다. 아이콘은 Primer Octicons(MIT), 디자인 토큰은 Primer(MIT)를 참고했습니다.
