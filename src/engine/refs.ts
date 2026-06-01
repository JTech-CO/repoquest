// src/engine/refs.ts
//
// 참조(refs)와 HEAD 조작. 브랜치는 "커밋을 가리키는 이름표"일 뿐임을 코드로도 드러낸다.

import type { LocalClone } from './types';
import { HEADS_PREFIX, ORIGIN_PREFIX } from './types';
import { reachable } from './objects';

/** 현재 HEAD가 가리키는 커밋 id (없으면 undefined = 빈 저장소) */
export function headCommitId(clone: LocalClone): string | undefined {
  if (clone.head.type === 'detached') return clone.head.commitId;
  return clone.refs[clone.head.ref];
}

/** 현재 체크아웃된 브랜치 이름 (detached면 null) */
export function currentBranch(clone: LocalClone): string | null {
  if (clone.head.type !== 'branch') return null;
  return clone.head.ref.slice(HEADS_PREFIX.length);
}

export function listLocalBranches(clone: LocalClone): string[] {
  return Object.keys(clone.refs)
    .filter((r) => r.startsWith(HEADS_PREFIX))
    .map((r) => r.slice(HEADS_PREFIX.length));
}

export function branchTip(clone: LocalClone, name: string): string | undefined {
  return clone.refs[HEADS_PREFIX + name];
}

export function setBranchTip(clone: LocalClone, name: string, commitId: string): void {
  clone.refs[HEADS_PREFIX + name] = commitId;
}

/**
 * 이름을 커밋으로 해석한다. 로컬 브랜치명이면 브랜치, 아니면 커밋 해시로 간주(→ detached 대상).
 */
export function resolveCommittish(
  clone: LocalClone,
  name: string,
): { commitId?: string; isBranch: boolean } {
  const asBranch = clone.refs[HEADS_PREFIX + name];
  if (asBranch) return { commitId: asBranch, isBranch: true };
  if (clone.objects.commits[name]) return { commitId: name, isBranch: false };
  return { commitId: undefined, isBranch: false };
}

/**
 * 로컬 브랜치가 origin/<branch> 대비 얼마나 앞서/뒤처졌는가.
 * push/pull 필요성을 보여주는 ↑ahead / ↓behind 배지의 근거.
 */
export function aheadBehind(
  clone: LocalClone,
  branch: string,
): { ahead: number; behind: number } {
  const commits = clone.objects.commits;
  const local = reachable(commits, clone.refs[HEADS_PREFIX + branch]);
  const remote = reachable(commits, clone.refs[ORIGIN_PREFIX + branch]);
  let ahead = 0;
  let behind = 0;
  for (const id of local) if (!remote.has(id)) ahead++;
  for (const id of remote) if (!local.has(id)) behind++;
  return { ahead, behind };
}
