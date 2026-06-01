// src/github/fetch.ts
//
// Fetch = 서버→로컬, "가져오기만" 한다.
//   - 작업본/HEAD/로컬 브랜치는 절대 건드리지 않는다.
//   - 서버의 모든 refs/heads/* 를 로컬의 refs/remotes/origin/* 로 갱신하고,
//     그에 도달 가능한 객체를 로컬로 복사한다.
//
// 학습 포인트: fetch 만 했을 때 작업본이 안 바뀌고, origin/<branch> 만 앞서면서
// ↑↓ 배지가 등장 → "지금 합치고 싶으면 merge 하세요" 신호가 됨.

import type { LocalClone, Refs } from '../engine/types';
import { HEADS_PREFIX, ORIGIN_PREFIX } from '../engine/types';
import type { RemoteRepo } from '../store/world';
import { copyCommitClosure, shallowCopyStore } from './_objectCopy';

export interface FetchInput {
  clone: LocalClone;
  remote: RemoteRepo;
}

export interface FetchOutcome {
  clone: LocalClone;
  /** 이번 fetch 로 새로 받아온 커밋 id 들 */
  fetched: string[];
  /** 갱신된 원격 추적 브랜치 (origin/<name> → commit) */
  updated: Record<string, string>;
}

export function fetch(input: FetchInput): FetchOutcome {
  const { clone, remote } = input;
  const newObjects = shallowCopyStore(clone.objects);
  const newRefs: Refs = { ...clone.refs };
  const fetched: string[] = [];
  const updated: Record<string, string> = {};

  for (const [ref, cid] of Object.entries(remote.refs)) {
    if (!ref.startsWith(HEADS_PREFIX)) continue;
    const name = ref.slice(HEADS_PREFIX.length);

    // 원격이 가리키는 커밋과 그 closure 를 로컬로 복사
    const added = copyCommitClosure(remote.objects, newObjects, cid);
    fetched.push(...added);

    const originRef = ORIGIN_PREFIX + name;
    if (newRefs[originRef] !== cid) {
      newRefs[originRef] = cid;
      updated[name] = cid;
    }
  }

  return {
    clone: { ...clone, objects: newObjects, refs: newRefs },
    fetched,
    updated,
  };
}
