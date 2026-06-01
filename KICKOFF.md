# Claude Code 킥오프 프롬프트

> 아래 전체를 복사해 Claude Code에 첫 메시지로 붙여넣으세요.
> (이 파일들은 모두 레포에 실제 경로로 배치한 뒤 시작합니다 — 채팅에 붙여넣지 마세요.)

---

이 레포에서 "GitHub 학습 에뮬레이터"를 구현한다. 백엔드 없이 브라우저에서 도는, 진짜 Git 객체 모델을 시뮬레이션하는 게임형 튜토리얼 웹앱이다. 입문자가 fork/clone/commit/push/PR/issue가 각각 무슨 일을 하는지 직접 눌러보며 배우게 하는 것이 목적이다.

## 1. 먼저 읽을 것 (작업 시작 전 필수)

- `SPEC.md` — 전체 기술 백서. 설계 철학·아키텍처·도메인 모델·기능 범위·빌드 로드맵의 단일 기준이다.
- `src/engine/*.ts` — Git 엔진 코어(types/objects/refs/diff/merge/commands). **이미 작성·검증된 정본이다.**
- `src/tutorial/concepts.ts` — 개념 카드 데이터(정본).
- `src/tutorial/missions.ts` — 가이드 미션 + 자동판정(정본).
- `src/store/world.ts` — 앱 상태 단일 출처 + Zustand 스토어 골격(정본).

## 2. 정본(CANON) 규칙 — 매우 중요

위 `engine/`, `tutorial/`, `store/world.ts` 파일들은 **이미 검토·검증된 정본이다.** 너는:

- 이 파일들의 **타입과 함수 시그니처를 재설계하거나 다시 만들지 마라.** 그대로 import해서 쓴다.
- 엔진을 우회해 별도의 git 로직을 새로 짜지 마라. 모든 로컬 git 동작은 `src/engine/commands.ts`의 함수를 통한다.
- 버그를 발견하면 멋대로 고치지 말고, **먼저 보고하고 승인받은 뒤** 최소 수정한다.

## 3. 지금 채워야 할 빈 글루 (이것만 새로 만든다)

1. **`src/tutorial/missions.ts` 한 줄 수정**: 현재 이 파일이 `TutorialProgress`를 직접 정의하고 있다. 그 로컬 `interface TutorialProgress {...}` 정의를 삭제하고, 맨 위에 `import type { TutorialProgress } from '../store/world';`를 추가한다. (런타임 값 `TutorialEvents`/`recordEvent`는 그대로 둔다.)

2. **`src/seed/seedWorld.ts` 생성**: 초기 `World`를 만든다. 아래 요건을 반드시 지킨다.
   - 실습용 원본 저장소의 id를 **정확히 `'repo_spoon-knife'`**로 만든다. (`missions.ts`의 `PRACTICE_REPO_ID`와 일치해야 미션 2·3·5가 작동한다.)
   - 가짜 유저(`octocat` 등) + 현재 사용자, 가짜 레포 3~5개(README·여러 파일·여러 커밋·브랜치·기존 PR/Issue 포함). 최소 하나는 fork·PR 실습용.
   - 객체는 `src/engine/objects.ts`의 `buildTreeFromFiles`/`writeCommit`으로 생성한다(직접 손으로 만들지 말 것).
   - 앱 부팅 시 `useWorld.getState().actions.reset(seedWorld())`로 주입.

3. **`src/github/` 레이어 생성**: 엔진 위에서 서버 연동을 구현한다. `fork.ts`, `clone.ts`, `push.ts`, `fetch.ts`, `pull.ts`. 이들은 `LocalClone ↔ RemoteRepo` 사이에서 객체를 복사하고 refs를 옮긴다. 엔진이 제공하는 `reachable`, `snapshotOf`, `aheadBehind`를 활용한다. **로컬 git 연산을 여기서 새로 구현하지 말고 엔진을 호출한다.**

## 4. 절대 어기면 안 되는 가드레일

- **로컬과 원격을 물리적으로 분리해 보여준다.** UI는 좌(내 컴퓨터/로컬)·우(github.com/원격) 두 영역으로 나눈다. 데이터가 어디 있는지 항상 눈에 보여야 한다.
- **암묵적 동작 금지.** commit이 자동 push로 이어지면 안 된다. fork가 자동 clone으로 이어지면 안 된다. 각 단계는 사용자가 직접 누른다.
- **commit≠push, fork≠clone, fetch≠pull** 의 경계를 동작·UI·문구 모두에서 일관되게 유지한다.
- **엔진 순수성 유지.** 엔진 명령은 부수효과 없이 새 상태를 반환한다. 상태 변경은 스토어 액션을 통해서만.
- ahead/behind가 있으면 `↑3` `↓2` 배지를 보여줘 push/pull 필요성을 사용자가 스스로 깨닫게 한다.
- 브랜딩: 독자 이름/로고를 쓰고, 푸터에 "비공식 학습용 시뮬레이터, GitHub과 무관" 고지문을 넣는다. 아이콘은 Octicons, 디자인 토큰은 Primer를 차용한다.

## 5. 확정 기술 스택

Vite + React 18 + TypeScript / 상태: Zustand + immer(스토어 골격 이미 존재) / 스타일: Tailwind + @primer/css 참고 / 아이콘: @primer/octicons-react / README: react-markdown + remark-gfm / 코드 하이라이트: shiki / diff 렌더링: 필요 시 jsdiff(엔진 diff와 별개로 UI용) / 영속화: Dexie(IndexedDB), 단 MVP는 localStorage로 시작 가능.

## 6. 빌드 순서 — 단계별로 멈춰서 검토받기

`SPEC.md`의 Phase 0~7을 순서대로 진행한다. **각 Phase가 끝나면 멈추고, 무엇을 했는지 요약한 뒤 내 확인을 기다린다.** 한 번에 전부 만들지 마라.

- Phase 0: 스캐폴딩(Vite/React/TS, Tailwind, Primer/Octicons, 라우팅, 빈 듀얼 페인 셸).
- Phase 1: 위 글루(§3) 연결 + 앱이 시드 데이터로 마운트되는 상태. **그리고 기존 엔진 스모크 테스트를 Vitest 정식 단위 테스트로 승격**시켜 이후 단계의 안전망으로 둔다.
- Phase 2: 읽기 UI(레포 페이지·파일 트리·README·검색·커밋 히스토리).
- Phase 3: 로컬 워크플로(clone, 세 트리 UI, branch/switch/add/commit, 미니 터미널 미러링).
- Phase 4: 원격 동기화(fork/push/fetch/pull + ahead/behind 배지 + 방향 화살표).
- Phase 5: 협업(PR 비교/머지/충돌, Issue, 코멘트 타임라인).
- Phase 6: 코칭 레이어(개념 패널 + 가이드 미션 + 진행도 영속화/리셋).
- Phase 7: 폴리시 & 확장(Settings/Actions 스텁, 모바일 폴백, 접근성).

## 7. 지금 할 일

먼저 `SPEC.md`와 §1의 정본 파일들을 읽어라. 그다음 **Phase 0만** 수행하고 멈춘 뒤, 스캐폴딩 결과와 다음 단계 계획을 요약해서 보고하라. §3의 글루는 Phase 1에서 다룬다.
