# GitHub 학습 에뮬레이터 — Claude Code 기술 백서 / 빌드 가이드라인

> 이 문서는 Claude Code(에이전트형 코딩 도구)에게 그대로 전달하여 프로젝트를 구현하기 위한 **단일 사양서**다.
> 코드를 한 줄도 본 적 없는 입문자가 "Fork가 뭔지, Commit과 Push가 왜 다른지"를 **직접 눌러보며** 체득하도록,
> GitHub의 UI/UX를 충실히 재현하되 내부적으로는 **진짜 Git의 데이터 모델을 클라이언트에서 시뮬레이션**한다.

---

## 0. 한 줄 정의

**"브라우저 안에서 돌아가는, 백엔드 없는 Git/GitHub 시뮬레이터 + 게임형 튜토리얼."**

- 실제 네트워크 호출 없음. 모든 저장소·사용자·커밋·PR은 클라이언트 메모리/IndexedDB에 존재하는 **가짜 데이터**다.
- 그러나 동작은 진짜 Git의 객체 모델(blob/tree/commit/ref/HEAD)을 따른다. 그래야 학습이 "거짓말"이 되지 않는다.
- 모든 인터랙티브 요소 옆에는 "이게 뭐고, 언제 쓰는가"를 설명하는 **개념 패널**이 따라붙는다.

---

## 1. 설계 철학 (구현 시 절대 어기면 안 되는 원칙)

입문자가 바이브코딩으로 GitHub을 쓰며 생기는 오개념은 거의 정해져 있다. 이 앱의 존재 이유는 그 오개념을 교정하는 것이므로, 아래 원칙은 **기능 완성도보다 우선**한다.

1. **로컬과 원격을 물리적으로 분리해서 보여준다.**
   가장 흔한 오개념: "커밋하면 GitHub에 올라간다." → 틀렸다. 커밋은 로컬, 푸시가 업로드다.
   따라서 화면을 **좌(내 컴퓨터/로컬)·우(GitHub 서버/원격)** 두 영역으로 나누거나, 명확히 구분되는 두 컨텍스트로 제시한다. 사용자는 데이터가 어디에 있는지 항상 눈으로 봐야 한다.

2. **암묵적 동작 금지.**
   `commit`이 자동으로 `push`까지 하면 안 된다. `fork` 후 자동 `clone`도 안 된다. 각 단계는 사용자가 직접 눌러야 하고, 누르지 않으면 변화가 동기화되지 않은 채로 **눈에 보이게 남아 있어야** 한다("로컬에 N개 커밋이 원격보다 앞서 있음" 같은 상태 표시).

3. **상태를 숨기지 않는다.**
   Working Directory / Staging Area(Index) / HEAD 세 영역의 차이가 입문자에게 가장 어렵다. `git add`가 무엇을 옮기는지 시각적으로 보여줄 수 있어야 한다(파일이 "변경됨 → 스테이징됨 → 커밋됨"으로 이동하는 애니메이션/컬럼).

4. **되돌릴 수 있는 학습 환경.**
   force push, 머지 충돌, detached HEAD 같은 "사고"를 일부러 만들어 체험하게 하되, 언제든 리셋·되돌리기가 가능해야 한다. 실수가 곧 학습이다.

5. **충실한 외형, 정직한 내부.**
   레이아웃·색·아이콘은 GitHub과 거의 같게(아래 디자인 시스템 참고). 단, 내부 동작은 단순화하더라도 **개념적으로 거짓이면 안 된다**.

---

## 2. 권장 기술 스택

사용자(JS 주력)에 맞추되, Git 객체 모델은 타입 안정성의 이득이 크므로 TypeScript를 권장한다. 부담되면 JS로도 가능하나, 엔진 레이어만이라도 TS를 쓰는 것을 강하게 추천한다.

| 영역 | 권장 | 비고 |
|---|---|---|
| 빌드/런타임 | **Vite + React 18** | SPA. 라우팅은 React Router |
| 언어 | **TypeScript**(엔진), JS 허용 | git 객체 모델은 타입이 곧 문서 |
| 상태관리 | **Zustand** | 단일 스토어에 "세계(World)" 상태. Redux보다 가볍고 시뮬레이터에 적합 |
| 스타일 | **Tailwind CSS** + (선택) **@primer/css** | Primer는 GitHub의 실제 오픈소스 디자인 시스템 |
| 아이콘 | **@primer/octicons-react** | GitHub이 쓰는 바로 그 아이콘셋(MIT) |
| 마크다운(README) | **react-markdown + remark-gfm** | GFM 표/체크박스/코드펜스 지원 |
| 코드 하이라이트 | **shiki** 또는 highlight.js | shiki가 VSCode 테마 그대로라 더 GitHub스러움 |
| diff 계산 | **diff**(jsdiff) | unified/split diff 렌더링용 |
| 영속화 | **Dexie(IndexedDB)** | 객체가 많아 localStorage는 한계. MVP는 localStorage 후 마이그레이션 가능 |
| 가짜 데이터 | **@faker-js/faker** | 시드용 유저/레포/커밋 메시지 생성 |

> **디자인 시스템 팁:** Primer(@primer/css, octicons)를 쓰면 GitHub 외형 재현 난이도가 급감한다. Tailwind와 병용하되, GitHub 특유의 컴포넌트(라벨, 배지, 박스, 타임라인)는 Primer 클래스를 참고/차용한다.

---

## 3. 전체 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│                        UI 레이어 (React)                    │
│  GitHub 외형 컴포넌트 + 좌(로컬)/우(원격) 듀얼 페인 + 코칭 패널 │
└───────────────▲───────────────────────────▲───────────────┘
                │ (읽기)                      │ (액션 디스패치)
┌───────────────┴───────────────────────────┴───────────────┐
│                  상태 스토어 (Zustand) — "World"            │
│  users, remoteRepos, localClones, ui, tutorialProgress     │
└───────────────▲───────────────────────────▲───────────────┘
                │                            │
┌───────────────┴────────────┐ ┌────────────┴───────────────┐
│   Git 엔진 (순수 함수)        │ │  GitHub 도메인 로직          │
│  객체모델/refs/merge/diff    │ │  fork/PR/issue/검색/권한     │
└─────────────────────────────┘ └────────────────────────────┘
                │
┌───────────────┴────────────────────────────────────────────┐
│              영속화 (Dexie/IndexedDB) — 직렬화된 World        │
└─────────────────────────────────────────────────────────────┘
```

핵심 원칙: **Git 엔진은 부수효과 없는 순수 함수 집합**으로 만든다. `(repoState, command) => newRepoState`. 그래야 테스트가 쉽고, undo/redo·튜토리얼 검증이 단순해진다.

---

## 4. 도메인 모델 (이 앱의 심장)

### 4.1 Git 객체 모델

진짜 Git을 따른다. 단, 해시는 학습 가독성을 위해 짧은 결정적 ID(예: 내용 기반 7자리 해시 또는 순번)로 둔다.

```ts
// 파일 내용
interface Blob { id: string; content: string; }

// 디렉터리 스냅샷: 이름 → blob/tree
interface TreeEntry { name: string; type: 'blob' | 'tree'; id: string; }
interface Tree { id: string; entries: TreeEntry[]; }

// 커밋: "어느 시점의 전체 스냅샷(tree) + 부모"
interface Commit {
  id: string;            // 짧은 해시
  treeId: string;        // 이 커밋이 가리키는 루트 트리
  parentIds: string[];   // 0개=최초, 1개=일반, 2개=머지 커밋
  author: string;        // username
  message: string;
  timestamp: number;
}

// 참조: 브랜치/태그/원격추적 브랜치는 전부 "커밋을 가리키는 이름표"
type RefName = string;   // 예: 'refs/heads/main', 'refs/remotes/origin/main'
interface Refs { [ref: RefName]: string /* commitId */; }

// HEAD: 현재 어디에 있나
type Head =
  | { type: 'branch'; ref: RefName }     // 일반 상태
  | { type: 'detached'; commitId: string }; // detached HEAD (가르치기 좋은 상태)
```

> **교육 포인트:** 커밋은 "diff"가 아니라 "스냅샷"임을 UI로 보여줄 것. 브랜치는 무거운 복사본이 아니라 "포스트잇 한 장(포인터)"임을 강조.

### 4.2 저장소 모델 — 원격(서버) vs 로컬(내 PC)

GitHub 서버에 있는 저장소와, 사용자가 clone한 로컬 저장소는 **별개 객체**다. 이 분리가 전체 설계의 척추다.

```ts
// === GitHub 서버에 존재하는 저장소 ===
interface RemoteRepo {
  id: string;
  owner: string;            // username 또는 org
  name: string;
  description: string;
  isPrivate: boolean;
  defaultBranch: string;    // 보통 'main'
  forkOf?: string;          // fork된 거라면 원본 repo id
  stars: number;
  objects: ObjectStore;     // blob/tree/commit 저장소
  refs: Refs;               // refs/heads/* 만 가짐(서버엔 working dir/index 없음)
  issues: Issue[];
  pullRequests: PullRequest[];
  createdAt: number;
}

// === 사용자가 clone하면 생기는 로컬 저장소 ===
interface LocalClone {
  id: string;
  remoteRepoId: string;     // origin이 가리키는 서버 repo
  objects: ObjectStore;     // 서버에서 받아온 객체들의 복사본
  refs: Refs;               // refs/heads/* + refs/remotes/origin/*
  head: Head;
  workingDir: Record<string, string>; // 파일경로 → 내용 (체크아웃된 작업본)
  index: Record<string, string>;       // 스테이징 영역(Staging Area)
  // 동기화 상태 계산용: origin/main 대비 ahead/behind 커밋 수
}

interface ObjectStore { blobs; trees; commits; } // id로 조회되는 맵들
```

> **세 트리 모델(Three Trees):** `workingDir`(내가 편집 중) → `index`(add로 올린 것) → `HEAD`(마지막 커밋). 이 세 영역의 차이를 컬럼 3개로 그려라. `git add`=workingDir의 변경을 index로, `git commit`=index를 새 commit으로 봉인.

### 4.3 사용자/세계 상태

```ts
interface User { username: string; avatarSeed: string; bio?: string; }

interface World {
  currentUser: string;              // 로그인한 "나"
  users: Record<string, User>;      // 나 + 시드된 가짜 유저들(octocat 등)
  remoteRepos: Record<string, RemoteRepo>;
  localClones: Record<string, LocalClone>;
  tutorial: TutorialProgress;
  ui: { activePane: 'web' | 'terminal'; currentRoute: string; };
}
```

---

## 5. 시뮬레이션할 기능 범위 (체크리스트)

"웬만한 기능 거의 전부"를 단계별로 구현한다. ✅=MVP 필수, ➕=확장.

### 5.1 둘러보기(읽기) 기능
- ✅ 저장소 검색(검색창에 입력 → 시드된 레포 결과)
- ✅ 저장소 페이지: 파일 트리, README 렌더링, 브랜치 셀렉터, 파일 보기
- ✅ 커밋 히스토리(목록 + 커밋별 diff)
- ✅ 사용자 프로필(보유 레포 목록, 아바타)
- ➕ Stars / Watch / 토픽 태그

### 5.2 원격(서버) 액션
- ✅ **Fork**: 다른 사람 레포를 내 계정으로 복제(`forkOf` 연결). 서버 객체만 복사, 로컬은 아직 없음
- ✅ **Push**: 로컬 커밋을 origin으로 전송 → 서버 refs 갱신, ahead 카운트 0으로
- ✅ **Fetch / Pull**: 서버 변경을 로컬로. fetch=가져오기만, pull=fetch+merge
- ✅ 새 저장소 생성(Create repository)
- ➕ 원격에 브랜치 push, 브랜치 삭제

### 5.3 로컬 액션 (터미널/로컬 페인)
- ✅ **Clone**: 서버 레포 → LocalClone 생성(객체 복사 + workingDir 체크아웃 + origin 추적브랜치 셋업)
- ✅ **Branch / Checkout(Switch)**: 브랜치 생성·전환, detached HEAD 체험
- ✅ **Add(스테이징)**: workingDir 변경 → index
- ✅ **Commit**: index → 새 commit, 브랜치 포인터 전진
- ✅ **Status / Log / Diff**: 현재 상태·기록·변경 확인
- ➕ Amend, Revert, Reset(soft/mixed/hard), Stash, Rebase, Cherry-pick

### 5.4 협업 기능
- ✅ **Pull Request**: 브랜치 간(또는 fork→원본) 비교, 제목/본문 작성, 변경 파일·커밋 탭
- ✅ **PR 머지**: fast-forward vs merge commit vs squash 선택지 + 결과 시각화
- ✅ **머지 충돌**: 같은 줄 동시 수정 시 충돌 유도 → 충돌 마커(<<<<<<< ======= >>>>>>>) 해소 UI
- ✅ **Issue**: 생성/목록/코멘트/라벨/닫기
- ✅ PR/Issue 코멘트 타임라인
- ➕ 리뷰 승인/변경요청, 리뷰어 지정, draft PR

### 5.5 부가 GitHub 표면(외형 위주, 동작은 스텁 가능)
- ➕ Actions 탭(워크플로 실행 흉내), Projects(칸반), Settings, Insights
- ➕ `.gitignore`, 라이선스 선택, 릴리스/태그

---

## 6. 핵심 동작의 정확한 정의 (구현 시 헷갈리지 말 것)

입문자 교정이 목적이므로, 아래 명령들의 **경계를 흐리면 안 된다.**

| 동작 | 어디서 일어나나 | 무엇이 바뀌나 | 흔한 오개념(교정 대상) |
|---|---|---|---|
| Fork | 서버 | 원본의 복사 RemoteRepo가 내 계정에 생김 | "fork하면 내 PC에 다운로드된다" → 아니다, 서버일 뿐 |
| Clone | 서버→로컬 | LocalClone 생성, 파일이 내 PC에 체크아웃 | "clone과 fork는 같다" → 다르다 |
| Add | 로컬 | workingDir → index | "add가 저장이다" → 아니다, 봉인 후보 등록일 뿐 |
| Commit | 로컬 | index → 새 commit(스냅샷) | "commit하면 GitHub에 올라간다" → 아니다, 로컬뿐 |
| Push | 로컬→서버 | 로컬 커밋이 origin에 반영 | "push와 commit은 같다" → 다르다 |
| Fetch | 서버→로컬 | 원격추적브랜치만 갱신(작업본은 그대로) | "fetch하면 내 코드가 바뀐다" → 아니다 |
| Pull | 서버→로컬 | fetch + merge(작업본 갱신) | "pull과 fetch는 같다" → pull은 합치기까지 |
| PR | 서버 | 브랜치 변경을 합치자는 "제안" 생성 | "PR이 곧 머지다" → 제안일 뿐, 머지는 별도 |

> **반드시 구현할 시각 신호:** 로컬이 origin보다 앞서면 `↑3`(ahead 3), 뒤처지면 `↓2`(behind 2), 갈라지면 둘 다 표시. 이 배지가 push/pull의 필요성을 스스로 깨닫게 만든다.

### 6.1 머지 알고리즘(단순화 버전)
- 공통 조상(merge base) 찾기 → 양쪽 변경 비교.
- 한쪽만 앞서면 **fast-forward**(새 커밋 없이 포인터 이동).
- 양쪽 다 변경됐고 겹치는 파일/줄이 없으면 **merge commit**(부모 2개) 생성.
- 같은 파일 같은 줄을 양쪽이 수정 → **충돌**. 충돌 마커를 workingDir에 심고, 사용자가 해소 후 다시 commit하게 한다.
- merge base 계산은 부모 그래프 BFS로 충분(성능 신경 안 써도 되는 규모).

---

## 7. UI/레이아웃 충실도

GitHub의 주요 화면을 컴포넌트로 분해한다. Octicons + Primer 색을 쓰면 이질감이 거의 없다.

- **글로벌 헤더**: 좌측 로고, 검색창, 우측 + 메뉴/프로필. (검색창은 실제 동작)
- **저장소 헤더**: `owner / repo`, 탭(Code·Issues·Pull requests·Actions·…), Star/Fork/Watch 버튼.
- **Code 탭**: 브랜치 셀렉터 + `Code↓` 버튼(clone URL/명령 안내), 파일 테이블, README 박스.
- **PR/Issue**: 목록(필터·라벨) + 상세(타임라인, Conversation/Commits/Files changed 탭).
- **Diff 뷰**: 추가=초록, 삭제=빨강, split/unified 토글.
- **듀얼 페인(이 앱의 정체성):**
  - 좌측 = **"내 컴퓨터"** 패널: 로컬 파일 트리, 세 트리(작업본/스테이징/HEAD) 컬럼, 미니 터미널.
  - 우측 = **"github.com"** 패널: 위의 웹 UI.
  - 가운데에 push/pull/fetch가 데이터를 어느 방향으로 옮기는지 **화살표 애니메이션**.

> 모바일/좁은 화면에서는 듀얼 페인을 탭 전환(웹 ⇄ 로컬)으로 폴백.

### 7.1 미니 터미널
- 입문자 다수가 CLI를 두려워하므로, **버튼 UI와 터미널을 1:1로 미러링**한다.
- 버튼을 누르면 터미널에 대응 명령(`git add .`, `git commit -m "..."`, `git push origin main`)이 타이핑되어 실행되는 모습을 보여준다 → "버튼 = 이 명령"이라는 매핑을 학습.
- 반대로 터미널에 직접 입력해도 동작하게 하면 더 좋다(파서는 주요 서브커맨드만 지원해도 충분).

---

## 8. 튜토리얼 / 코칭 레이어

요청의 핵심. 두 층위로 설계한다.

### 8.1 상시 개념 패널 (수동 탐색)
- 모든 주요 버튼/요소에 `data-concept="fork"` 식의 식별자.
- 호버 또는 클릭 시 우측 코칭 패널에 카드 표시: **무엇 / 언제 쓰나 / 실제로 무슨 일이 일어났나(방금 바뀐 상태 요약) / 흔한 실수**.
- 콘텐츠는 코드와 분리된 `concepts.ts`(또는 MD/JSON)에 둬서 비개발자도 문구 수정 가능하게.

```ts
interface Concept {
  id: string;            // 'fork', 'commit', 'push'...
  title: string;
  whatIsIt: string;      // 한 문단
  whenToUse: string;
  pitfalls: string[];    // 흔한 오개념
  relatedCmd?: string;   // 'git push origin <branch>'
}
```

### 8.2 가이드 미션 (게임형 진행)
순차적 퀘스트로, 각 미션은 "성공 조건(World 상태에 대한 술어 함수)"으로 검증한다.

```ts
interface Mission {
  id: string;
  title: string;
  brief: string;                       // 목표 설명
  steps: string[];                     // 힌트 단계
  isComplete: (w: World) => boolean;   // 순수 함수로 자동 판정
}
```

권장 미션 시퀀스:
1. **저장소 둘러보기** — 검색해서 `octocat/spoon-knife` 열고 README 읽기.
2. **Fork** — 그 레포를 내 계정으로 fork(서버에만 생김을 확인).
3. **Clone** — fork를 내 PC로 clone(파일이 로컬에 생김을 확인).
4. **브랜치 → 수정 → Add → Commit** — 세 트리 이동을 눈으로 확인. (아직 GitHub엔 없음을 강조)
5. **Push** — 그제서야 GitHub에 반영됨(ahead 배지 사라짐).
6. **Pull Request** — fork→원본으로 PR 작성.
7. **Issue** — 버그 리포트 작성.
8. **충돌 해소(보스전)** — 일부러 충돌을 만들고 해소 후 머지.

진행도·완료 미션은 `tutorial`에 저장하고 IndexedDB에 영속화. 완료 시 가벼운 축하 + 다음 미션 잠금 해제.

---

## 9. 영속화 & 리셋

- `World` 전체를 직렬화해 Dexie에 저장(자동 저장 디바운스).
- **"실험 모드 리셋"** 버튼: 초기 시드 상태로 복귀(force push·충돌 등 사고 실험 후 복구용).
- undo/redo: 엔진이 순수 함수이므로, 액션 전 World 스냅샷을 스택에 push해두면 간단히 구현 가능(메모리 절약 위해 N단계 제한).

---

## 10. 시드 데이터

- 가짜 사용자: `octocat`, `torvalds`, 그리고 현재 사용자(로그인 시 입력받거나 기본값). 아바타는 시드 기반 도형/이니셜로 생성(외부 이미지 의존 X).
- 가짜 레포 3~5개: README·여러 파일·여러 커밋·브랜치·기존 PR/Issue 포함. 최소 하나는 fork·PR 실습용으로 설계.
- 커밋 메시지는 faker 또는 직접 작성(현실적인 메시지가 학습에 좋음).

---

## 11. 권장 폴더 구조

```
src/
  engine/                 # 순수 Git 엔진 (부수효과 없음, 단위 테스트 집중 대상)
    objects.ts            # blob/tree/commit 생성·해시
    refs.ts               # 브랜치/HEAD 조작
    commands.ts           # add/commit/checkout/merge/diff...
    merge.ts              # merge base, 충돌 탐지
    diff.ts               # 트리/파일 diff 계산
  github/                 # 서버측 도메인 로직
    fork.ts  push.ts  pull.ts  pr.ts  issue.ts  search.ts
  store/
    world.ts              # Zustand 스토어 + 액션 디스패치
    persist.ts            # Dexie 직렬화
  ui/
    layout/               # 헤더, 듀얼페인, 코칭패널
    repo/                 # Code/Commits/Files/Branch UI
    pr/  issue/  diff/  terminal/
  tutorial/
    concepts.ts           # 개념 카드 데이터
    missions.ts           # 미션 정의 + 판정 함수
  seed/
    seedWorld.ts
  App.tsx  main.tsx
```

---

## 12. 단계별 구현 로드맵 (Claude Code 작업 순서)

> Claude Code에게 **이 순서대로** 진행하도록 지시할 것. 각 단계 끝에서 동작 확인 후 다음 단계로.

- **Phase 0 — 스캐폴딩**: Vite+React(+TS), Tailwind, Primer/Octicons, 라우팅, 빈 듀얼 페인 셸.
- **Phase 1 — 엔진 코어**: 객체 모델·refs·commit/log/diff. 단위 테스트 동반(엔진은 UI 없이도 검증 가능).
- **Phase 2 — 읽기 UI + 시드**: 시드 데이터로 레포 페이지·파일 트리·README·검색·커밋 히스토리 표시.
- **Phase 3 — 로컬 워크플로**: clone → 세 트리 UI → branch/checkout/add/commit/status. 미니 터미널 미러링.
- **Phase 4 — 원격 동기화**: fork/push/fetch/pull + ahead/behind 배지 + 방향 화살표 애니메이션.
- **Phase 5 — 협업**: PR(비교/머지/충돌)·Issue·코멘트 타임라인.
- **Phase 6 — 코칭 레이어**: 개념 패널 + 가이드 미션 + 진행도 영속화/리셋.
- **Phase 7 — 폴리시 & 확장**: Settings/Actions 스텁, rebase/reset/stash 등 ➕ 항목, 접근성·모바일 폴백.

각 Phase는 독립 실행 가능한 상태로 마무리(부분 동작이라도 데모 가능하게).

---

## 13. 반드시 다룰 "가르치기 좋은" 엣지 케이스

- **detached HEAD**: 커밋 해시로 직접 checkout 시 발생. "지금 어느 브랜치에도 없다"는 경고 + 탈출 방법 안내.
- **fast-forward vs merge commit**: 같은 PR을 두 방식으로 머지해 그래프 차이를 보여주기.
- **force push의 위험**: 원격 히스토리를 덮어쓰면 동료의 커밋이 사라질 수 있음을 시뮬레이션(되돌리기 제공).
- **diverged 상태**: 로컬·원격이 둘 다 앞선 경우 push 거부 → pull 후 머지하는 정석 흐름 학습.
- **.gitignore**: 무시된 파일이 add/commit에서 빠지는 모습.
- **빈 커밋/스테이징 없이 커밋 시도**: "커밋할 변경이 없습니다" 안내.

---

## 14. 테스트 전략

- **엔진 단위 테스트(Vitest)**: commit 후 log 정확성, merge base 계산, 충돌 탐지, ff 판정 등. 엔진이 순수 함수라 커버리지 확보가 쉽고, 학습 정확성의 보증이 된다.
- **미션 판정 테스트**: 각 `isComplete`가 의도한 World 상태에서만 true인지.
- **시나리오 통합 테스트**: "fork→clone→commit→push→PR→merge" 전체 흐름을 코드로 재현.

---

## 15. 법적/브랜딩 주의 (구현 시 1회 반영)

- UI **레이아웃을 학습용으로 모사**하는 것은 일반적으로 문제되지 않으나, GitHub의 **로고·이름·상표를 그대로 쓰면** 공식 제휴로 오인될 수 있다.
- 권장: 앱에 **독자적인 이름/로고**를 부여하고("예: GitLearn / RepoQuest" 등 임의), 푸터에 "본 사이트는 학습용 비공식 시뮬레이터이며 GitHub, Inc.와 무관합니다"라는 **고지문**을 넣는다.
- 아이콘은 Octicons(MIT), 디자인 토큰은 Primer(MIT) — 라이선스상 사용 가능하되 출처 표기 권장.

---

## 16. 비목표 (이번 범위에서 제외)

- 실제 네트워크/실제 Git 바이너리/실제 인증 — 전부 시뮬레이션.
- 다중 사용자 실시간 협업(서버 필요) — 협업은 "가짜 동료"의 사전 시드 커밋/PR로 연출.
- 완전한 Git 호환(rebase interactive의 모든 옵션 등) — 학습에 필요한 수준까지만.

---

## 17. Claude Code에게 전달할 핵심 지시 요약

1. 위 Phase 0→7 순서로 점진 구현하고, 각 Phase 끝에 동작하는 상태를 유지하라.
2. **Git 엔진은 부수효과 없는 순수 함수**로 작성하고 단위 테스트를 함께 작성하라.
3. **로컬과 원격을 절대 한 덩어리로 합치지 말고**, 데이터 위치가 항상 화면에 드러나게 하라.
4. commit≠push, fork≠clone, fetch≠pull의 경계를 동작·UI·코칭 문구 모두에서 일관되게 지켜라.
5. 개념/미션 텍스트는 코드와 분리된 데이터 파일에 두어 비개발자도 수정 가능하게 하라.
6. 외형은 Primer/Octicons로 GitHub에 가깝게, 단 독자 브랜딩 + 비공식 고지문을 포함하라.
