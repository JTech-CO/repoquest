// src/store/world.ts
//
// 앱 상태(World)의 "단일 출처". 엔진(git 객체 모델)과 GitHub 도메인(레포/PR/이슈),
// 튜토리얼 진행을 하나로 합친다. 그리고 엔진 명령을 호출해 상태를 갱신하는 스토어를 제공한다.
//
// 의존 방향 규칙(순환 참조 방지): engine/types → store/world → tutorial/missions, ui/*
//   - 즉 "아래에서 위로만" 의존한다. store는 engine을 알지만 ui는 모른다.
//
// ⚠️ tutorial/missions.ts 한 곳만 수정 필요:
//   현재 missions.ts가 TutorialProgress를 "직접 정의"하고 있다. 그 로컬 정의를 삭제하고
//   맨 위에 다음 한 줄로 바꾼다:  import type { TutorialProgress } from '../store/world';
//   (TutorialEvents/recordEvent 같은 런타임 값은 missions.ts에 그대로 둔다.)

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type {
  Blob,
  Commit,
  FileMap,
  Head,
  LocalClone,
  MergeState,
  ObjectStore,
  RefName,
  Refs,
  Tree,
  TreeEntry,
} from '../engine/types';

// 엔진 타입을 앱 전역에서 편히 쓰도록 re-export
export type {
  Blob,
  Commit,
  FileMap,
  Head,
  LocalClone,
  MergeState,
  ObjectStore,
  RefName,
  Refs,
  Tree,
  TreeEntry,
};

import {
  commit as engineCommit,
  createBranch as engineCreateBranch,
  deleteFile as engineDeleteFile,
  mergeBranch as engineMergeBranch,
  stage as engineStage,
  switchTo as engineSwitchTo,
  writeFile as engineWriteFile,
  type MergeOutcome,
} from '../engine/commands';

import { syncTutorialProgress, type TutorialEvent } from '../tutorial/missions';

// ──────────────────────────────────────────────────────────────────────────
// 1. GitHub 도메인 타입
// ──────────────────────────────────────────────────────────────────────────
export interface User {
  username: string;
  avatarSeed: string; // 외부 이미지 없이 시드로 아바타 도형 생성
  bio?: string;
}

export interface Comment {
  id: string;
  author: string;
  body: string;
  createdAt: number;
}

export type IssueState = 'open' | 'closed';
export interface Issue {
  id: string;
  number: number;
  author: string;
  title: string;
  body: string;
  state: IssueState;
  labels: string[];
  comments: Comment[];
  createdAt: number;
}

export type PullRequestState = 'open' | 'merged' | 'closed';
export interface PullRequest {
  id: string;
  number: number;
  author: string;
  title: string;
  body: string;
  state: PullRequestState;
  // fork→upstream PR을 표현하기 위한 출처 정보
  sourceRepoId: string;
  sourceBranch: string;
  targetBranch: string;
  comments: Comment[];
  createdAt: number;
}

/** GitHub 서버에 존재하는 저장소. 서버엔 workingDir/index가 없다(refs/heads/*만). */
export interface RemoteRepo {
  id: string;
  owner: string;
  name: string;
  description: string;
  isPrivate: boolean;
  defaultBranch: string;
  forkOf?: string; // fork된 거라면 원본 repo id
  stars: number;
  forks?: number; // 표시용 fork 수(시드 baseline + 실제 fork 시 증가). optional 확장.
  objects: ObjectStore;
  refs: Refs;
  issues: Issue[];
  pullRequests: PullRequest[];
  createdAt: number;
}

// ──────────────────────────────────────────────────────────────────────────
// 2. 튜토리얼 진행 (단일 출처 — missions.ts가 여기서 import)
// ──────────────────────────────────────────────────────────────────────────
export interface TutorialProgress {
  currentMissionId: string | null;
  completedMissionIds: string[];
  /** 읽기 전용 UI 동작 판정을 위한 append-only 이벤트 로그 */
  events: string[];
}

// ──────────────────────────────────────────────────────────────────────────
// 3. World
// ──────────────────────────────────────────────────────────────────────────
export interface World {
  currentUser: string;
  users: Record<string, User>;
  remoteRepos: Record<string, RemoteRepo>;
  localClones: Record<string, LocalClone>;
  tutorial: TutorialProgress;
  ui: {
    activePane: 'web' | 'terminal';
    currentRoute: string;
  };
}

/** seed/seedWorld.ts가 완성되기 전, 앱이 일단 마운트되도록 하는 최소 World */
export function bootstrapWorld(currentUser = 'me'): World {
  return {
    currentUser,
    users: { [currentUser]: { username: currentUser, avatarSeed: currentUser } },
    remoteRepos: {},
    localClones: {},
    tutorial: { currentMissionId: 'explore', completedMissionIds: [], events: [] },
    ui: { activePane: 'web', currentRoute: '/' },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 4. 스토어 (엔진 ↔ 미션 글루)
//
// 패턴: 엔진 명령은 새 clone을 "반환"하는 순수 함수다. 스토어 액션은 그 결과를
// draft.localClones[id]에 꽂은 뒤 syncTutorialProgress(draft)로 미션 완료를 재평가한다.
// 모든 액션은 새로 완료된 미션 id 배열을 돌려주므로, 호출부에서 축하 토스트를 띄울 수 있다.
// ──────────────────────────────────────────────────────────────────────────
export interface WorldActions {
  // 로컬 편집/엔진 명령
  writeFile: (cloneId: string, path: string, content: string) => string[];
  deleteFile: (cloneId: string, path: string) => string[];
  stage: (cloneId: string, paths?: string[]) => string[];
  commit: (cloneId: string, message: string) => string[];
  createBranch: (cloneId: string, name: string, checkout?: boolean) => string[];
  switchTo: (cloneId: string, target: string, force?: boolean) => string[];
  merge: (cloneId: string, sourceBranch: string) => { outcome: MergeOutcome['status']; conflicts: string[]; newlyCompleted: string[] };

  // 튜토리얼 이벤트(README 열람, 충돌 해소 등 UI 신호)
  recordEvent: (e: TutorialEvent) => string[];

  // UI
  setRoute: (route: string) => void;
  setPane: (pane: 'web' | 'terminal') => void;

  // 리셋(실험 후 복구)
  reset: (initial: World) => void;

  // NOTE: fork/clone/push/fetch/pull은 github/ 레이어에서 이 스토어 위에 구현한다.
}

export type WorldStore = World & { actions: WorldActions };

export const useWorld = create<WorldStore>()(
  immer((set, get) => ({
    ...bootstrapWorld(), // 앱 시작 후 reset(seedWorld())로 교체 권장

    actions: {
      writeFile: (cloneId, path, content) => {
        let newly: string[] = [];
        set((draft) => {
          const { clone } = engineWriteFile(draft.localClones[cloneId], path, content);
          draft.localClones[cloneId] = clone;
          newly = syncTutorialProgress(draft);
        });
        return newly;
      },

      deleteFile: (cloneId, path) => {
        let newly: string[] = [];
        set((draft) => {
          const { clone } = engineDeleteFile(draft.localClones[cloneId], path);
          draft.localClones[cloneId] = clone;
          newly = syncTutorialProgress(draft);
        });
        return newly;
      },

      stage: (cloneId, paths) => {
        let newly: string[] = [];
        set((draft) => {
          const { clone } = engineStage(draft.localClones[cloneId], paths);
          draft.localClones[cloneId] = clone;
          newly = syncTutorialProgress(draft);
        });
        return newly;
      },

      commit: (cloneId, message) => {
        let newly: string[] = [];
        const author = get().currentUser;
        set((draft) => {
          const { clone } = engineCommit(draft.localClones[cloneId], { author, message });
          draft.localClones[cloneId] = clone;
          newly = syncTutorialProgress(draft);
        });
        return newly;
      },

      createBranch: (cloneId, name, checkout = true) => {
        let newly: string[] = [];
        set((draft) => {
          const { clone } = engineCreateBranch(draft.localClones[cloneId], name, { checkout });
          draft.localClones[cloneId] = clone;
          newly = syncTutorialProgress(draft);
        });
        return newly;
      },

      switchTo: (cloneId, target, force = false) => {
        let newly: string[] = [];
        set((draft) => {
          const { clone } = engineSwitchTo(draft.localClones[cloneId], target, { force });
          draft.localClones[cloneId] = clone;
          newly = syncTutorialProgress(draft);
        });
        return newly;
      },

      merge: (cloneId, sourceBranch) => {
        const author = get().currentUser;
        let result: MergeOutcome | null = null;
        let newly: string[] = [];
        set((draft) => {
          result = engineMergeBranch(draft.localClones[cloneId], sourceBranch, { author });
          draft.localClones[cloneId] = result.clone;
          newly = syncTutorialProgress(draft);
        });
        const r = result as unknown as MergeOutcome;
        return {
          outcome: r.status,
          conflicts: r.status === 'conflict' ? r.conflicts : [],
          newlyCompleted: newly,
        };
      },

      recordEvent: (e) => {
        let newly: string[] = [];
        set((draft) => {
          draft.tutorial.events.push(e);
          newly = syncTutorialProgress(draft);
        });
        return newly;
      },

      setRoute: (route) => set((draft) => { draft.ui.currentRoute = route; }),
      setPane: (pane) => set((draft) => { draft.ui.activePane = pane; }),

      reset: (initial) =>
        set((draft) => {
          Object.assign(draft, initial);
        }),
    },
  })),
);
