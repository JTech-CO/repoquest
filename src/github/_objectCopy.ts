// src/github/_objectCopy.ts
//
// github 레이어 내부 헬퍼: 한 ObjectStore 에서 다른 ObjectStore 로
// "커밋이 가리키는 tree/blob 그래프"를 안전하게 복사한다.
//
// 이 헬퍼는 엔진을 우회하지 않는다 — 엔진은 LocalClone 내부 연산만 다루고,
// 객체를 서버↔로컬로 이동시키는 일은 github 레이어 책임이다.

import type { ObjectStore } from '../engine/types';
import { reachable } from '../engine/objects';

/** tree 와 그 안의 blob 들을 from → to 로 dedup 복사 (이미 있으면 skip) */
export function copyTreeClosure(from: ObjectStore, to: ObjectStore, treeId: string): void {
  if (to.trees[treeId]) return;
  const t = from.trees[treeId];
  if (!t) return;
  to.trees[treeId] = t;
  for (const e of t.entries) {
    if (e.type === 'blob') {
      if (!to.blobs[e.id] && from.blobs[e.id]) {
        to.blobs[e.id] = from.blobs[e.id];
      }
    } else {
      copyTreeClosure(from, to, e.id);
    }
  }
}

/**
 * "tip 부터 도달 가능한 모든 커밋 + 그들의 tree/blob"을 from → to 로 복사한다.
 * 이미 to 에 있는 객체는 건너뛰어 자연스럽게 증분 전송이 된다.
 *
 * @returns 새로 추가된 커밋 id 들
 */
export function copyCommitClosure(
  from: ObjectStore,
  to: ObjectStore,
  tip: string | undefined,
): string[] {
  const added: string[] = [];
  if (!tip) return added;
  const reach = reachable(from.commits, tip);
  for (const id of reach) {
    if (!to.commits[id] && from.commits[id]) {
      to.commits[id] = from.commits[id];
      added.push(id);
      copyTreeClosure(from, to, from.commits[id].treeId);
    } else if (from.commits[id]) {
      // 이미 있어도 tree 가 누락된 케이스 방어
      copyTreeClosure(from, to, from.commits[id].treeId);
    }
  }
  return added;
}

/** 얕은 ObjectStore 복제 (안에 있는 객체는 immutable 이라 공유 OK) */
export function shallowCopyStore(s: ObjectStore): ObjectStore {
  return {
    blobs: { ...s.blobs },
    trees: { ...s.trees },
    commits: { ...s.commits },
  };
}
