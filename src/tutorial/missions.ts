// src/tutorial/missions.ts
//
// 게임형 가이드 미션 정의 + 자동 완료 판정.
//
// 설계 원칙
//  - isComplete(world)는 "순수 함수"다. 부수효과 없이 현재 World만 보고 true/false를 낸다.
//  - 가능하면 도메인 상태(레포/커밋/PR 등)로 판정한다. 그게 가장 정직하다.
//  - "README를 열어봤다"처럼 영구 흔적이 안 남는 UI 액션은 tutorial.events 로그로 판정한다.
//    → UI는 그런 순간에 recordEvent(world, TutorialEvents.XXX)를 디스패치하면 된다.
//
// ⚠️ 아래 SEED 상수들은 seed/seedWorld.ts 의 실제 id와 반드시 일치시켜야 한다.

import type {
  World,
  RemoteRepo,
  LocalClone,
  Commit,
  TutorialProgress,
} from '../store/world';

// TutorialProgress 의 단일 출처는 store/world.ts 다 (KICKOFF §3-(1)).
// 여기서는 import 만 하고, 런타임 값(TutorialEvents/recordEvent)만 노출한다.

export const TutorialEvents = {
  SearchPerformed: 'search-performed',
  RepoOpened: 'repo-opened',
  ReadmeViewed: 'readme-viewed',
  ConflictEncountered: 'conflict-encountered',
  ConflictResolved: 'conflict-resolved',
} as const;
export type TutorialEvent = (typeof TutorialEvents)[keyof typeof TutorialEvents];

/** UI가 호출: 이벤트 한 번 기록(중복 허용). store 액션에서 immer 등으로 push하면 됨 */
export function recordEvent(progress: TutorialProgress, e: TutorialEvent): void {
  progress.events.push(e);
}

function did(w: World, e: TutorialEvent): boolean {
  return (w.tutorial?.events ?? []).includes(e);
}

// ──────────────────────────────────────────────────────────────────────────
// 1. 시드 식별자 (seedWorld.ts와 동기화 필수)
// ──────────────────────────────────────────────────────────────────────────
/** 실습용 원본(upstream) 저장소. 사용자는 이걸 fork → clone → PR 한다. */
export const PRACTICE_REPO_ID = 'repo_spoon-knife';

// ──────────────────────────────────────────────────────────────────────────
// 2. World 조회 헬퍼 (전부 순수 함수, 방어적으로 작성)
// ──────────────────────────────────────────────────────────────────────────
function repos(w: World): RemoteRepo[] {
  return Object.values(w.remoteRepos ?? {});
}
function clones(w: World): LocalClone[] {
  return Object.values(w.localClones ?? {});
}

/** 현재 사용자가 특정 원본을 fork해서 가진 레포 */
function myForkOf(w: World, sourceRepoId: string): RemoteRepo | undefined {
  return repos(w).find(
    (r) => r.owner === w.currentUser && r.forkOf === sourceRepoId,
  );
}

/** 특정 원격 레포를 clone한 로컬이 있는가 */
function cloneOf(w: World, remoteRepoId: string): LocalClone | undefined {
  return clones(w).find((c) => c.remoteRepoId === remoteRepoId);
}

/** start 커밋에서 부모를 따라 도달 가능한 모든 커밋 id 집합 */
function reachable(
  commits: Record<string, Commit>,
  start?: string,
): Set<string> {
  const seen = new Set<string>();
  if (!start) return seen;
  const stack = [start];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    const c = commits[id];
    if (!c) continue;
    seen.add(id);
    for (const p of c.parentIds ?? []) stack.push(p);
  }
  return seen;
}

function refEntries(refs: Record<string, string> | undefined, prefix: string) {
  return Object.entries(refs ?? {}).filter(([ref]) => ref.startsWith(prefix));
}

/** 로컬에만 있고 아직 origin에 없는, 현재 사용자가 만든 커밋이 있는가 (= 커밋했지만 push 안 함) */
function hasUnpushedCommitByUser(w: World): boolean {
  for (const clone of clones(w)) {
    const commits = clone.objects?.commits ?? {};
    const onOrigin = new Set<string>();
    for (const [, cid] of refEntries(clone.refs, 'refs/remotes/origin/')) {
      for (const id of reachable(commits, cid)) onOrigin.add(id);
    }
    for (const [, cid] of refEntries(clone.refs, 'refs/heads/')) {
      for (const id of reachable(commits, cid)) {
        if (!onOrigin.has(id) && commits[id]?.author === w.currentUser) {
          return true;
        }
      }
    }
  }
  return false;
}

/** 기본 브랜치가 아닌 로컬 브랜치를 하나라도 만들었는가 */
function hasNonDefaultLocalBranch(w: World): boolean {
  for (const clone of clones(w)) {
    const def = w.remoteRepos[clone.remoteRepoId]?.defaultBranch ?? 'main';
    for (const [ref] of refEntries(clone.refs, 'refs/heads/')) {
      const name = ref.slice('refs/heads/'.length);
      if (name !== def) return true;
    }
  }
  return false;
}

/** 내 fork 서버에, 기본 브랜치가 아니면서 내 커밋이 tip인 브랜치가 올라가 있는가 (= push 완료) */
function hasPushedFeatureBranch(w: World): boolean {
  const fork = myForkOf(w, PRACTICE_REPO_ID);
  if (!fork) return false;
  const def = fork.defaultBranch ?? 'main';
  for (const [ref, cid] of refEntries(fork.refs, 'refs/heads/')) {
    const name = ref.slice('refs/heads/'.length);
    if (name !== def && fork.objects?.commits?.[cid]?.author === w.currentUser) {
      return true;
    }
  }
  return false;
}

/** 현재 사용자가 연 PR이 (어느 레포에든) 있는가 */
function hasPullRequestByUser(w: World): boolean {
  return repos(w).some((r) =>
    (r.pullRequests ?? []).some((pr: any) => pr?.author === w.currentUser),
  );
}

/** 현재 사용자가 작성한 이슈가 (어느 레포에든) 있는가 */
function hasIssueByUser(w: World): boolean {
  return repos(w).some((r) =>
    (r.issues ?? []).some((it: any) => it?.author === w.currentUser),
  );
}

/** 현재 사용자가 만든 머지 커밋(부모 2개 이상)이 있는가 */
function hasMergeCommitByUser(w: World): boolean {
  const stores: Record<string, Commit>[] = [
    ...repos(w).map((r) => r.objects?.commits ?? {}),
    ...clones(w).map((c) => c.objects?.commits ?? {}),
  ];
  return stores.some((commits) =>
    Object.values(commits).some(
      (c) => (c.parentIds?.length ?? 0) >= 2 && c.author === w.currentUser,
    ),
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 3. 미션 정의
// ──────────────────────────────────────────────────────────────────────────
export interface Mission {
  id: string;
  /** 화면에 보일 순번 (1부터) */
  order: number;
  title: string;
  /** 목표 한 줄 설명 */
  brief: string;
  /** 막혔을 때 펼쳐 보는 단계별 힌트 */
  steps: string[];
  /** 완료 판정 — 순수 함수 */
  isComplete: (w: World) => boolean;
  /** 완료 시 보여줄 한 줄 학습 요약(왜 방금 한 게 중요한가) */
  takeaway: string;
}

export const missions: Mission[] = [
  {
    id: 'explore',
    order: 1,
    title: '저장소 둘러보기',
    brief: '검색창에서 실습용 저장소를 찾아 열고, README를 읽어보세요.',
    steps: [
      '상단 검색창에 "spoon-knife"를 입력해 검색합니다.',
      '결과에서 저장소를 클릭해 Code 탭을 엽니다.',
      '아래쪽 README 내용을 확인합니다.',
    ],
    takeaway:
      '저장소는 파일뿐 아니라 전체 변경 이력을 함께 담는 프로젝트 폴더입니다. 지금 보는 건 GitHub "서버"에 있는 원본입니다.',
    isComplete: (w) =>
      did(w, TutorialEvents.SearchPerformed) && did(w, TutorialEvents.ReadmeViewed),
  },
  {
    id: 'fork',
    order: 2,
    title: 'Fork 하기',
    brief: '그 저장소를 내 계정으로 Fork 해서 내 복사본을 만드세요.',
    steps: [
      '저장소 우측 상단의 Fork 버튼을 누릅니다.',
      '내 프로필로 가면 같은 이름의 저장소가 생긴 걸 확인합니다.',
      '아직 내 컴퓨터에는 아무것도 없다는 점에 주목하세요(서버에만 복사됨).',
    ],
    takeaway:
      'Fork는 GitHub "서버 안에서의" 복사입니다. 내 PC로 받아온 게 아니라, 다음 단계인 Clone이 필요합니다.',
    isComplete: (w) => Boolean(myForkOf(w, PRACTICE_REPO_ID)),
  },
  {
    id: 'clone',
    order: 3,
    title: 'Clone 하기',
    brief: 'Fork한 내 저장소를 내 컴퓨터(로컬)로 Clone 하세요.',
    steps: [
      '내 fork 저장소에서 Code 버튼을 눌러 clone을 실행합니다.',
      '왼쪽 "내 컴퓨터" 패널에 파일들이 생기는 걸 확인합니다.',
      '이제 origin이라는 이름으로 서버 출처가 연결됩니다.',
    ],
    takeaway:
      'Clone은 서버 → 내 PC로의 복제입니다. 이제부터 파일을 실제로 편집할 수 있습니다. Fork와 Clone은 다른 동작이에요.',
    isComplete: (w) => {
      const fork = myForkOf(w, PRACTICE_REPO_ID);
      return Boolean(fork && cloneOf(w, fork.id));
    },
  },
  {
    id: 'branch-commit',
    order: 4,
    title: '브랜치 → 수정 → Add → Commit',
    brief:
      '새 브랜치를 만들고, 파일을 수정한 뒤, 변경을 스테이징하고 커밋하세요.',
    steps: [
      '새 브랜치를 만들고 그 브랜치로 전환(switch)합니다.',
      '아무 파일이나 내용을 고칩니다(작업 디렉터리).',
      'Add로 변경을 스테이징 영역에 올립니다.',
      'Commit으로 메시지와 함께 스냅샷을 봉인합니다.',
      '아직 GitHub 서버에는 이 커밋이 없다는 점을 확인하세요(↑ 배지).',
    ],
    takeaway:
      '작업본 → 스테이징 → 커밋의 세 단계를 거쳐야 이력에 남습니다. 그리고 커밋은 100% 로컬입니다. 서버엔 아직 안 갔어요.',
    // 비기본 브랜치 + 사용자 커밋. push 전에는 로컬에만 있고(hasUnpushedCommitByUser),
    // push 후에는 그 커밋이 origin에 올라가 unpushed가 아니게 되므로 hasPushedFeatureBranch로
    // 받쳐 준다. 한 번 달성한 미션이 다음 단계(push)에서 풀리지 않도록(monotonic).
    isComplete: (w) =>
      hasNonDefaultLocalBranch(w) &&
      (hasUnpushedCommitByUser(w) || hasPushedFeatureBranch(w)),
  },
  {
    id: 'push',
    order: 5,
    title: 'Push 하기',
    brief: '방금 만든 로컬 커밋을 GitHub 서버(origin)로 Push 하세요.',
    steps: [
      '작업한 브랜치를 origin으로 push합니다.',
      '서버 패널의 해당 브랜치에 커밋이 나타나는 걸 확인합니다.',
      '로컬이 서버보다 앞서 있던 ↑ 배지가 사라집니다.',
    ],
    takeaway:
      '바로 이 순간 변경이 처음으로 GitHub에 올라갑니다. Commit(로컬 기록)과 Push(서버 업로드)는 별개의 동작입니다.',
    isComplete: (w) => hasPushedFeatureBranch(w),
  },
  {
    id: 'pull-request',
    order: 6,
    title: 'Pull Request 열기',
    brief: '내 브랜치의 변경을 원본 저장소에 합치자고 PR로 제안하세요.',
    steps: [
      'Pull requests 탭에서 New pull request를 누릅니다.',
      'base를 원본(upstream), compare를 내 작업 브랜치로 설정합니다.',
      '제목과 본문을 적고 PR을 생성합니다.',
    ],
    takeaway:
      'PR은 "합쳐달라는 제안"이지 머지 그 자체가 아닙니다. 권한 없는 남의 프로젝트엔 Fork → PR이 정석입니다.',
    isComplete: (w) => hasPullRequestByUser(w),
  },
  {
    id: 'issue',
    order: 7,
    title: 'Issue 남기기',
    brief: '버그나 제안을 Issue로 기록해보세요.',
    steps: [
      'Issues 탭에서 New issue를 누릅니다.',
      '재현 방법·기대 동작·실제 동작을 구체적으로 적습니다.',
      '라벨을 붙이고 제출합니다.',
    ],
    takeaway:
      'Issue는 코드를 바꾸지 않는 대화·기록 공간입니다. 실제 수정은 PR로, 할 일 관리는 Issue로 나눠 생각하세요.',
    isComplete: (w) => hasIssueByUser(w),
  },
  {
    id: 'conflict-boss',
    order: 8,
    title: '머지 충돌 해소',
    brief:
      '일부러 충돌을 만든 뒤, 충돌 마커를 정리하고 머지를 완성하세요.',
    steps: [
      '같은 파일의 같은 줄을 서로 다른 브랜치에서 다르게 고칩니다.',
      '머지를 시도하면 충돌이 발생합니다(당황하지 마세요, 정상입니다).',
      '<<<<<<< ======= >>>>>>> 마커를 보고 살릴 코드를 고른 뒤 마커를 지웁니다.',
      '수정한 파일을 다시 Add하고 Commit해서 머지를 마무리합니다.',
    ],
    takeaway:
      '충돌은 잘못이 아니라 두 사람이 같은 곳을 고치면 생기는 자연스러운 일입니다. 해소 후 다시 커밋하면 머지 커밋(부모 2개)이 만들어집니다.',
    isComplete: (w) =>
      hasMergeCommitByUser(w) && did(w, TutorialEvents.ConflictResolved),
  },
];

// ──────────────────────────────────────────────────────────────────────────
// 4. 진행/잠금 로직 (순차 잠금 해제)
// ──────────────────────────────────────────────────────────────────────────
const ordered = [...missions].sort((a, b) => a.order - b.order);

/** 각 미션의 현재 완료 여부 스냅샷 */
export function evaluateMissions(w: World): { id: string; complete: boolean }[] {
  return ordered.map((m) => ({ id: m.id, complete: m.isComplete(w) }));
}

/** 앞 미션이 모두 끝나야 다음이 열림. index는 ordered 기준 */
export function isMissionUnlocked(w: World, index: number): boolean {
  return ordered.slice(0, index).every((m) => m.isComplete(w));
}

/** 지금 진행해야 할 미션(처음으로 미완료인 것). 전부 끝났으면 null */
export function getActiveMission(w: World): Mission | null {
  return ordered.find((m) => !m.isComplete(w)) ?? null;
}

/** 전체 진행률 0~1 */
export function overallProgress(w: World): number {
  if (ordered.length === 0) return 1;
  const done = ordered.filter((m) => m.isComplete(w)).length;
  return done / ordered.length;
}

/**
 * 스토어에서 매 액션 후 호출하는 동기화 헬퍼.
 * 새로 완료된 미션 id 배열을 반환하므로, 호출부에서 축하 토스트 등을 띄우면 된다.
 * (progress.completedMissionIds / currentMissionId를 갱신한다)
 */
export function syncTutorialProgress(w: World): string[] {
  const progress = w.tutorial;
  const already = new Set(progress.completedMissionIds);
  const newlyDone: string[] = [];

  for (const m of ordered) {
    if (m.isComplete(w) && !already.has(m.id)) {
      progress.completedMissionIds.push(m.id);
      newlyDone.push(m.id);
    }
  }
  progress.currentMissionId = getActiveMission(w)?.id ?? null;
  return newlyDone;
}

export const missionsById: Record<string, Mission> = Object.fromEntries(
  missions.map((m) => [m.id, m]),
);
