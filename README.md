# RepoQuest — Git/GitHub 학습 에뮬레이터

브라우저 안에서 **진짜 Git 객체 모델(blob/tree/commit/refs/HEAD)** 을 시뮬레이션하는,
백엔드 없는 게임형 튜토리얼 웹앱입니다. 입문자가 **fork · clone · commit · push · PR · issue · 머지 충돌**이
각각 무슨 일을 하는지 직접 눌러보며 배우도록 설계했습니다.

> ⚠️ **비공식 학습용 프로젝트입니다. GitHub, Inc. 와 어떠한 제휴 관계도 없습니다.**
> 모든 저장소·계정·커밋·PR 은 브라우저 안의 가짜 데이터이며, 실제 네트워크 통신은 일어나지 않습니다.
> 아이콘은 [Primer Octicons](https://primer.style/octicons/)(MIT), 디자인 토큰은 [Primer](https://primer.style/)(MIT) 를 참고했습니다.

## 핵심 설계 원칙

- **로컬과 원격을 물리적으로 분리해서 보여준다.** "내 컴퓨터(로컬)"와 "github.com(서버)"를 항상 구분 — 데이터가 지금 어디에 있는지가 모든 개념의 출발점.
- **암묵적 동작 금지.** commit 이 자동으로 push 되지 않고, fork 가 자동으로 clone 되지 않는다. 각 단계는 사용자가 직접 누른다.
- **`commit ≠ push`, `fork ≠ clone`, `fetch ≠ pull`** 의 경계를 동작·UI·문구 모두에서 일관되게 유지한다. (로컬이 앞서면 `↑ahead`, 뒤처지면 `↓behind` 배지 표시)
- **정직한 내부.** UI 는 단순화하더라도, 내부 git 동작은 개념적으로 거짓이 아니다.

## 기능

- 저장소 검색 · Code/파일 트리 · README 렌더링 · 커밋 히스토리 / diff
- Fork · Clone · 세 트리(작업본 → 스테이징 → HEAD) · branch/switch · add · commit
- Push / Fetch / Pull + ahead/behind 배지 + 방향 화살표 + 미니 터미널(버튼 = git 명령 미러링)
- Pull Request(비교 · fast-forward / merge commit / squash) · Issue(라벨·코멘트·닫기) · 머지 충돌 해소
- 가이드 미션 8단계 + 개념 카드 20종(코칭 패널) + 진행도 localStorage 영속화 + 실험 리셋

## 기술 스택

Vite + React 18 + TypeScript / Zustand(+immer) / Tailwind CSS / @primer/octicons-react /
react-markdown + remark-gfm / highlight.js / Vitest

## 로컬 실행

```bash
npm install
npm run dev        # http://localhost:5173
```

기타 스크립트:

```bash
npm run build      # 프로덕션 빌드 (dist/)
npm run preview    # 빌드 결과 미리보기
npm run typecheck  # tsc --noEmit
npm test           # 엔진/시나리오/시드 단위 테스트 (Vitest)
```

## 배포 (GitHub Pages)

`main` 브랜치에 푸시하면 [GitHub Actions 워크플로](.github/workflows/deploy.yml)가
타입체크 → 테스트 → 빌드 → Pages 배포를 자동 수행합니다.

- 호스팅 경로가 `/<repo>/` 하위이므로 프로덕션 빌드에서 Vite `base` 를 `/repoquest/` 로 둡니다.
- SPA 딥링크(`/repoquest/octocat/spoon-knife` 등)의 새로고침 404 는 `public/404.html` 리다이렉트 트릭으로 우회합니다.

저장소 **Settings → Pages → Source** 를 **GitHub Actions** 로 설정하면 됩니다.

## 프로젝트 구조

```
src/
  engine/      순수 Git 엔진 (objects/refs/diff/merge/commands) + 단위 테스트
  github/      서버 연동 (fork/clone/push/fetch/pull/mergePr) — 엔진 위에서 객체 복사·refs 이동
  store/       Zustand World 스토어 + github/collab 액션 + localStorage 영속화
  seed/        초기 시드 데이터(가짜 유저·레포·PR·Issue)
  tutorial/    개념 카드(concepts) + 가이드 미션(missions, 자동 판정)
  ui/          레이아웃 · 페이지 · repo · work(워크스페이스) · collab · coach(코칭 패널)
```

엔진은 **부수효과 없는 순수 함수** 집합입니다(`(state, command) => newState`). 모든 로컬 git 동작은 엔진을 통하고,
서버 연동은 github 레이어가 `LocalClone ↔ RemoteRepo` 사이에서 처리합니다.
