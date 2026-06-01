// src/engine/commands.ts
//
// 엔진의 공개 API. 모든 명령은 순수 함수다: (clone, args) => { clone: 새 clone, ... }.
// 호출부(store)는 반환된 새 clone으로 상태를 교체하면 된다. 원본은 절대 변형되지 않는다.
//
// 대응하는 git 명령(미니 터미널 미러링 참고):
//   stage        → git add
//   commit       → git commit -m
//   createBranch → git branch / git switch -c
//   switchTo     → git switch / git checkout
//   mergeBranch  → git merge
//   status/log   → git status / git log

import type { FileMap, Head, LocalClone } from './types';
import { HEADS_PREFIX } from './types';
import {
  buildTreeFromFiles,
  reachable,
  snapshotOf,
  writeCommit,
} from './objects';
import {
  aheadBehind,
  currentBranch,
  headCommitId,
  resolveCommittish,
} from './refs';
import { diffSnapshots, snapshotsEqual, type SnapshotDiff } from './diff';
import { mergeBase, threeWayMerge } from './merge';

// ── 내부: 명령 시작 시 1회 복제(공개 API 순수성 보장) ─────────────────────────
function cloneState(c: LocalClone): LocalClone {
  return {
    ...c,
    objects: {
      blobs: { ...c.objects.blobs },
      trees: { ...c.objects.trees },
      commits: { ...c.objects.commits },
    },
    refs: { ...c.refs },
    head:
      c.head.type === 'branch'
        ? { type: 'branch', ref: c.head.ref }
        : { type: 'detached', commitId: c.head.commitId },
    workingDir: { ...c.workingDir },
    index: { ...c.index },
    mergeState: c.mergeState
      ? { ...c.mergeState, conflicts: [...c.mergeState.conflicts] }
      : undefined,
  };
}

function setHeadCommit(clone: LocalClone, commitId: string): void {
  if (clone.head.type === 'branch') clone.refs[clone.head.ref] = commitId;
  else clone.head = { type: 'detached', commitId };
}

function headSnapshot(clone: LocalClone): FileMap {
  return snapshotOf(clone.objects, headCommitId(clone));
}

// ── git add: workingDir의 변경을 index(스테이징)로 옮긴다 ──────────────────────
export function stage(
  clone: LocalClone,
  paths?: string[],
): { clone: LocalClone } {
  const c = cloneState(clone);
  const targets =
    paths ?? Array.from(new Set([...Object.keys(c.workingDir), ...Object.keys(c.index)]));
  for (const p of targets) {
    if (p in c.workingDir) c.index[p] = c.workingDir[p];
    else delete c.index[p]; // 작업본에서 지운 파일 → 삭제를 스테이징
  }
  return { clone: c };
}

// ── git commit: index를 스냅샷으로 봉인 ───────────────────────────────────────
export class NothingToCommitError extends Error {
  constructor() {
    super('커밋할 변경이 없습니다 (스테이징된 변경 없음).');
    this.name = 'NothingToCommitError';
  }
}

export function commit(
  clone: LocalClone,
  opts: { author: string; message: string; timestamp?: number },
): { clone: LocalClone; commitId: string } {
  const c = cloneState(clone);
  const parent = headCommitId(c);
  const merging = Boolean(c.mergeState);

  // 머지 중이 아니면서 index가 직전 커밋과 동일하면 커밋 거부
  if (!merging && parent && snapshotsEqual(snapshotOf(c.objects, parent), c.index)) {
    throw new NothingToCommitError();
  }

  const treeId = buildTreeFromFiles(c.objects, c.index);

  const parentIds: string[] = [];
  if (parent) parentIds.push(parent);
  if (c.mergeState) parentIds.push(c.mergeState.theirCommit); // 머지 커밋 = 부모 2개

  const commitId = writeCommit(c.objects, {
    treeId,
    parentIds,
    author: opts.author,
    message: opts.message,
    timestamp: opts.timestamp ?? Date.now(),
  });

  setHeadCommit(c, commitId);
  c.mergeState = undefined; // 머지 마무리
  return { clone: c, commitId };
}

// ── git branch / switch -c ────────────────────────────────────────────────────
export function createBranch(
  clone: LocalClone,
  name: string,
  opts: { startCommit?: string; checkout?: boolean } = {},
): { clone: LocalClone } {
  const c = cloneState(clone);
  if (c.refs[HEADS_PREFIX + name]) {
    throw new Error(`이미 존재하는 브랜치: ${name}`);
  }
  const start = opts.startCommit ?? headCommitId(c);
  if (!start) throw new Error('커밋이 하나도 없어 브랜치를 만들 수 없습니다.');
  c.refs[HEADS_PREFIX + name] = start;
  if (opts.checkout) c.head = { type: 'branch', ref: HEADS_PREFIX + name };
  return { clone: c };
}

// ── git switch / checkout: HEAD 이동 + 작업본 교체 ────────────────────────────
export class DirtyWorkingTreeError extends Error {
  constructor() {
    super('커밋하지 않은 변경이 있어 전환할 수 없습니다. 먼저 커밋하거나 되돌리세요.');
    this.name = 'DirtyWorkingTreeError';
  }
}

function isDirty(clone: LocalClone): boolean {
  // index가 HEAD와 다르거나(스테이징됨), 작업본이 index와 다르면 dirty
  return (
    !snapshotsEqual(headSnapshot(clone), clone.index) ||
    !snapshotsEqual(clone.index, clone.workingDir)
  );
}

export function switchTo(
  clone: LocalClone,
  target: string,
  opts: { force?: boolean } = {},
): { clone: LocalClone; detached: boolean } {
  if (!opts.force && isDirty(clone)) throw new DirtyWorkingTreeError();

  const { commitId, isBranch } = resolveCommittish(clone, target);
  if (!commitId) throw new Error(`알 수 없는 브랜치/커밋: ${target}`);

  const c = cloneState(clone);
  const head: Head = isBranch
    ? { type: 'branch', ref: HEADS_PREFIX + target }
    : { type: 'detached', commitId };
  c.head = head;

  // 작업본과 스테이징을 대상 스냅샷으로 리셋
  const snap = snapshotOf(c.objects, commitId);
  c.workingDir = { ...snap };
  c.index = { ...snap };
  return { clone: c, detached: !isBranch };
}

// ── 작업본 편집(에디터 저장에 해당) ───────────────────────────────────────────
export function writeFile(
  clone: LocalClone,
  path: string,
  content: string,
): { clone: LocalClone } {
  const c = cloneState(clone);
  c.workingDir[path] = content;
  return { clone: c };
}

export function deleteFile(clone: LocalClone, path: string): { clone: LocalClone } {
  const c = cloneState(clone);
  delete c.workingDir[path];
  return { clone: c };
}

// ── git merge ─────────────────────────────────────────────────────────────────
export type MergeOutcome =
  | { status: 'up-to-date'; clone: LocalClone }
  | { status: 'fast-forward'; clone: LocalClone; commitId: string }
  | { status: 'merged'; clone: LocalClone; commitId: string }
  | { status: 'conflict'; clone: LocalClone; conflicts: string[] };

export function mergeBranch(
  clone: LocalClone,
  sourceBranch: string,
  opts: { author: string; timestamp?: number },
): MergeOutcome {
  if (clone.mergeState) {
    throw new Error('이미 머지가 진행 중입니다. 충돌을 해소한 뒤 커밋하세요.');
  }
  const c = cloneState(clone);
  const ours = headCommitId(c);
  const theirs = c.refs[HEADS_PREFIX + sourceBranch];
  if (!theirs) throw new Error(`존재하지 않는 브랜치: ${sourceBranch}`);
  if (!ours) {
    // 빈 브랜치에 머지 → 그냥 상대 위치로 이동(fast-forward)
    setHeadCommit(c, theirs);
    const snap = snapshotOf(c.objects, theirs);
    c.workingDir = { ...snap };
    c.index = { ...snap };
    return { status: 'fast-forward', clone: c, commitId: theirs };
  }

  const base = mergeBase(c.objects, ours, theirs);
  if (base === theirs) return { status: 'up-to-date', clone: c };

  if (base === ours) {
    // 우리는 뒤처져 있고 상대가 앞섬 → 새 커밋 없이 포인터만 전진(fast-forward)
    setHeadCommit(c, theirs);
    const snap = snapshotOf(c.objects, theirs);
    c.workingDir = { ...snap };
    c.index = { ...snap };
    return { status: 'fast-forward', clone: c, commitId: theirs };
  }

  // 진짜 3-way 머지
  const baseFiles = snapshotOf(c.objects, base);
  const ourFiles = snapshotOf(c.objects, ours);
  const theirFiles = snapshotOf(c.objects, theirs);
  const { files, conflicts } = threeWayMerge(
    baseFiles,
    ourFiles,
    theirFiles,
    sourceBranch,
  );

  if (conflicts.length > 0) {
    // 충돌 마커가 든 결과를 작업본에 펼치고, 머지 상태 진입 → 사용자가 해소 후 commit
    c.workingDir = { ...files };
    c.mergeState = {
      theirCommit: theirs,
      theirLabel: sourceBranch,
      message: `Merge branch '${sourceBranch}'`,
      conflicts,
    };
    return { status: 'conflict', clone: c, conflicts };
  }

  // 충돌 없음 → 머지 커밋(부모 2개) 즉시 생성
  c.index = { ...files };
  c.workingDir = { ...files };
  const treeId = buildTreeFromFiles(c.objects, files);
  const commitId = writeCommit(c.objects, {
    treeId,
    parentIds: [ours, theirs],
    author: opts.author,
    message: `Merge branch '${sourceBranch}'`,
    timestamp: opts.timestamp ?? Date.now(),
  });
  setHeadCommit(c, commitId);
  return { status: 'merged', clone: c, commitId };
}

// ── git status ──────────────────────────────────────────────────────────────
export interface StatusReport {
  branch: string | null;
  detached: boolean;
  staged: SnapshotDiff; // HEAD vs index
  unstaged: SnapshotDiff; // index vs workingDir
  ahead: number;
  behind: number;
  merging: boolean;
  conflicts: string[];
}

export function status(clone: LocalClone): StatusReport {
  const branch = currentBranch(clone);
  const ab = branch ? aheadBehind(clone, branch) : { ahead: 0, behind: 0 };
  return {
    branch,
    detached: clone.head.type === 'detached',
    staged: diffSnapshots(headSnapshot(clone), clone.index),
    unstaged: diffSnapshots(clone.index, clone.workingDir),
    ahead: ab.ahead,
    behind: ab.behind,
    merging: Boolean(clone.mergeState),
    conflicts: clone.mergeState?.conflicts ?? [],
  };
}

// ── git log ───────────────────────────────────────────────────────────────────
export function log(clone: LocalClone, fromRef?: string) {
  const start = fromRef
    ? resolveCommittish(clone, fromRef).commitId
    : headCommitId(clone);
  const ids = Array.from(reachable(clone.objects.commits, start));
  return ids
    .map((id) => clone.objects.commits[id])
    .sort((a, b) => b.timestamp - a.timestamp);
}
