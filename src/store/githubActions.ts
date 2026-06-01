// src/store/githubActions.ts
//
// github/ 레이어(순수 함수)를 World 스토어에 연결하는 액션.
// 정본 store/world.ts 는 "fork/clone/push/fetch/pull 은 github 레이어에서 이 스토어 위에 구현한다"고
// 명시했다(주석). 정본을 수정하지 않기 위해 여기서 useWorld.setState 로 결과를 반영한다.
//
// 엔진/도메인 로직을 새로 짜지 않는다 — github/* 와 engine/* 함수만 호출한다.

import { useWorld } from './world';
import { clone as gitClone } from '../github/clone';
import { fork as gitFork } from '../github/fork';
import { push as gitPush } from '../github/push';
import { fetch as gitFetch } from '../github/fetch';
import { pull as gitPull } from '../github/pull';
import { currentBranch } from '../engine/refs';
import { syncTutorialProgress } from '../tutorial/missions';

export { NonFastForwardError } from '../github/push';

/** fork 하지 않은 남의 저장소로 push 를 시도할 때(권한 없음) */
export class PushPermissionError extends Error {
  constructor(public ownerRepo: string) {
    super(
      `${ownerRepo} 에 push 할 권한이 없습니다. ` +
        `먼저 이 저장소를 Fork 한 뒤, 내 fork 를 clone 해서 작업하세요.`,
    );
    this.name = 'PushPermissionError';
  }
}

/**
 * 원격 저장소를 로컬로 clone 한다. 이미 같은 레포의 clone 이 있으면 그것을 재사용한다
 * (재clone 으로 작업본이 날아가는 사고 방지).
 * @returns cloneId
 */
export function cloneRepo(remoteRepoId: string): string {
  // ⚠️ immer draft(proxy)를 순수 함수에 넘기지 않는다.
  //    getState()가 주는 plain(freeze된) 객체로 clone 을 계산한 뒤, setState 에서는 결과만 꽂는다.
  //    (draft proxy 를 gitClone 에 넘기면 finalize 단계에서 중첩 proxy 로 hang 한다.)
  const state = useWorld.getState();
  const remote = state.remoteRepos[remoteRepoId];
  if (!remote) throw new Error(`알 수 없는 저장소: ${remoteRepoId}`);

  const existing = Object.values(state.localClones).find(
    (c) => c.remoteRepoId === remoteRepoId,
  );
  if (existing) return existing.id;

  const local = gitClone({ source: remote });
  useWorld.setState((draft) => {
    draft.localClones[local.id] = local;
    syncTutorialProgress(draft);
  });
  return local.id;
}

/** 특정 원격을 clone 한 로컬이 있으면 그 id 반환 */
export function findCloneFor(remoteRepoId: string): string | undefined {
  return Object.values(useWorld.getState().localClones).find(
    (c) => c.remoteRepoId === remoteRepoId,
  )?.id;
}

/**
 * Fork = 서버 안에서의 복사. 내 계정(currentUser)에 원본의 복사 RemoteRepo 를 만든다.
 * 로컬은 생기지 않는다(그건 clone). 이미 내 fork 가 있으면 그것을 재사용한다.
 * @returns 새(또는 기존) fork RemoteRepo 의 id
 */
export function forkRepo(sourceRepoId: string): string {
  const state = useWorld.getState();
  const me = state.currentUser;
  const source = state.remoteRepos[sourceRepoId];
  if (!source) throw new Error(`알 수 없는 저장소: ${sourceRepoId}`);

  // 이미 내가 이 원본을 fork 했으면 재사용
  const existing = Object.values(state.remoteRepos).find(
    (r) => r.owner === me && r.forkOf === sourceRepoId,
  );
  if (existing) return existing.id;

  const forked = gitFork({ source, intoOwner: me });
  useWorld.setState((draft) => {
    draft.remoteRepos[forked.id] = forked;
    const src = draft.remoteRepos[sourceRepoId];
    if (src) src.forks = (src.forks ?? 0) + 1; // 원본 fork 카운트 증가
    syncTutorialProgress(draft);
  });
  return forked.id;
}

export interface PushResult {
  pushed: string[];
  branch: string;
}

/**
 * Push = 로컬 커밋을 origin 으로. 성공 시 서버 refs 갱신 + 로컬 origin 추적 갱신(ahead→0).
 * 권한 없음(fork 안 한 남의 레포) → PushPermissionError.
 * 원격이 갈라짐 → NonFastForwardError(먼저 pull).
 */
export function pushBranch(cloneId: string, branch?: string): PushResult {
  const state = useWorld.getState();
  const clone = state.localClones[cloneId];
  if (!clone) throw new Error(`알 수 없는 clone: ${cloneId}`);
  const remote = state.remoteRepos[clone.remoteRepoId];
  if (!remote) throw new Error('origin 저장소를 찾을 수 없습니다.');

  // 권한: 내 소유 저장소에만 push (fork → 내 fork 로 push 가 정석)
  if (remote.owner !== state.currentUser) {
    throw new PushPermissionError(`${remote.owner}/${remote.name}`);
  }

  const result = gitPush({ clone, remote, branch });
  useWorld.setState((draft) => {
    draft.localClones[cloneId] = result.clone;
    // remote 를 통째 할당하면 issues/pullRequests(frozen)가 이후 수정 불가해진다.
    // objects/refs 만 갱신한다.
    const r = draft.remoteRepos[remote.id];
    r.objects = result.remote.objects;
    r.refs = result.remote.refs;
    syncTutorialProgress(draft);
  });
  return { pushed: result.pushed, branch: result.branch };
}

export interface FetchResult {
  fetched: string[];
}

/** Fetch = origin 추적만 갱신(작업본 불변). */
export function fetchRemote(cloneId: string): FetchResult {
  const state = useWorld.getState();
  const clone = state.localClones[cloneId];
  if (!clone) throw new Error(`알 수 없는 clone: ${cloneId}`);
  const remote = state.remoteRepos[clone.remoteRepoId];
  if (!remote) throw new Error('origin 저장소를 찾을 수 없습니다.');

  const result = gitFetch({ clone, remote });
  useWorld.setState((draft) => {
    draft.localClones[cloneId] = result.clone;
    syncTutorialProgress(draft);
  });
  return { fetched: result.fetched };
}

export interface PullResult {
  status: 'up-to-date' | 'fast-forward' | 'merged' | 'conflict' | 'noop';
  fetched: string[];
  conflicts: string[];
}

/** Pull = fetch + merge(현재 브랜치). 충돌이면 conflict 상태로 작업본에 마커가 들어간다. */
export function pullRemote(cloneId: string): PullResult {
  const state = useWorld.getState();
  const clone = state.localClones[cloneId];
  if (!clone) throw new Error(`알 수 없는 clone: ${cloneId}`);
  const remote = state.remoteRepos[clone.remoteRepoId];
  if (!remote) throw new Error('origin 저장소를 찾을 수 없습니다.');
  if (!currentBranch(clone)) {
    throw new Error('detached HEAD 에서는 pull 할 수 없습니다. 먼저 브랜치로 전환하세요.');
  }

  const result = gitPull({ clone, remote, author: state.currentUser });
  useWorld.setState((draft) => {
    draft.localClones[cloneId] = result.clone;
    syncTutorialProgress(draft);
  });

  const m = result.merge;
  return {
    status: m ? m.status : 'noop',
    fetched: result.fetched,
    conflicts: m && m.status === 'conflict' ? m.conflicts : [],
  };
}
