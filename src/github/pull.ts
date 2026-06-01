// src/github/pull.ts
//
// Pull = fetch + merge. 현재 브랜치에 대해 origin/<branch> 를 합친다.
//
// 구현 메모:
//   엔진의 mergeBranch 는 "로컬 브랜치 이름" 으로 합칠 대상을 지정한다.
//   pull 은 원격추적 브랜치(refs/remotes/origin/<name>) 를 머지하고 싶으므로,
//   잠깐 동안 그 커밋을 가리키는 임시 로컬 브랜치(__pull__<name>) 를 만들어 머지한 뒤,
//   임시 브랜치를 정리한다. 엔진은 손대지 않는다.
//
//   detached HEAD 에서는 pull 할 브랜치를 알 수 없어 거부한다.

import type { LocalClone, Refs } from '../engine/types';
import { HEADS_PREFIX, ORIGIN_PREFIX } from '../engine/types';
import { mergeBranch, type MergeOutcome } from '../engine/commands';
import { currentBranch } from '../engine/refs';
import type { RemoteRepo } from '../store/world';
import { fetch as gitFetch } from './fetch';

export class DetachedPullError extends Error {
  constructor() {
    super('detached HEAD 에서는 pull 할 수 없습니다. 먼저 브랜치로 전환하세요.');
    this.name = 'DetachedPullError';
  }
}

export interface PullInput {
  clone: LocalClone;
  remote: RemoteRepo;
  author: string; // 머지 커밋이 만들어질 경우의 작성자
  timestamp?: number;
}

export interface PullOutcome {
  clone: LocalClone;
  fetched: string[];
  /** merge 가 일어나지 않은 경우(원격에 해당 브랜치 없음) null */
  merge: MergeOutcome | null;
  branch: string;
}

export function pull(input: PullInput): PullOutcome {
  const branch = currentBranch(input.clone);
  if (!branch) throw new DetachedPullError();

  // 1) fetch: origin/* 갱신 + 객체 다운로드
  const f = gitFetch({ clone: input.clone, remote: input.remote });

  const originRef = ORIGIN_PREFIX + branch;
  const originTip = f.clone.refs[originRef];
  if (!originTip) {
    // 원격에 해당 브랜치가 없으면 fetch 까지만 의미 있음
    return { clone: f.clone, fetched: f.fetched, merge: null, branch };
  }

  // 2) 임시 브랜치로 머지 (엔진 mergeBranch 시그니처 변경 없이)
  const tempName = `__pull__${branch}`;
  const withTemp: LocalClone = {
    ...f.clone,
    refs: { ...f.clone.refs, [HEADS_PREFIX + tempName]: originTip },
  };

  const m = mergeBranch(withTemp, tempName, {
    author: input.author,
    timestamp: input.timestamp,
  });

  // 3) 임시 브랜치 정리 + mergeState 라벨을 사용자에게 보일 origin/<branch> 로 교체
  const cleanedRefs: Refs = { ...m.clone.refs };
  delete cleanedRefs[HEADS_PREFIX + tempName];

  const cleanedMergeState = m.clone.mergeState
    ? { ...m.clone.mergeState, theirLabel: `origin/${branch}` }
    : m.clone.mergeState;

  const cleanedClone: LocalClone = {
    ...m.clone,
    refs: cleanedRefs,
    mergeState: cleanedMergeState,
  };

  // PullOutcome 의 merge 도 동일하게 정리해 두면 호출부에서 라벨이 일관됨
  const cleanedMerge: MergeOutcome =
    m.status === 'conflict' ? { ...m, clone: cleanedClone } : { ...m, clone: cleanedClone };

  return {
    clone: cleanedClone,
    fetched: f.fetched,
    merge: cleanedMerge,
    branch,
  };
}
