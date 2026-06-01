// src/ui/lib/repoView.ts
//
// RemoteRepo 를 "읽기 전용"으로 들여다보는 셀렉터 모음.
// 엔진(snapshotOf/reachable/diff*) 을 그대로 재사용한다 — git 로직을 새로 짜지 않는다.
// 정본 store/world.ts 는 건드리지 않고, UI 에서 useWorld 로 고른 RemoteRepo 를 인자로 받는다.

import type { RemoteRepo } from '../../store/world';
import type { Commit, FileMap } from '../../engine/types';
import { HEADS_PREFIX } from '../../engine/types';
import { reachable, snapshotOf } from '../../engine/objects';
import { diffLines, diffSnapshots, type LineOp } from '../../engine/diff';

/** 레포의 로컬 브랜치(refs/heads/*) 이름들 — 이름순 */
export function listBranches(repo: RemoteRepo): string[] {
  return Object.keys(repo.refs)
    .filter((r) => r.startsWith(HEADS_PREFIX))
    .map((r) => r.slice(HEADS_PREFIX.length))
    .sort((a, b) => a.localeCompare(b));
}

export function branchTip(repo: RemoteRepo, branch: string): string | undefined {
  return repo.refs[HEADS_PREFIX + branch];
}

/** 특정 브랜치 tip 시점의 평면 파일맵 */
export function filesAt(repo: RemoteRepo, branch: string): FileMap {
  return snapshotOf(repo.objects, branchTip(repo, branch));
}

/** 브랜치에서 도달 가능한 커밋들 — 최신(timestamp 큰) 순 */
export function commitsOf(repo: RemoteRepo, branch: string): Commit[] {
  const tip = branchTip(repo, branch);
  const ids = reachable(repo.objects.commits, tip);
  return [...ids]
    .map((id) => repo.objects.commits[id])
    .filter((c): c is Commit => Boolean(c))
    .sort((a, b) => b.timestamp - a.timestamp);
}

/** 브랜치 tip 의 커밋(없으면 undefined) — "최근 커밋" 박스용 */
export function latestCommit(repo: RemoteRepo, branch: string): Commit | undefined {
  const tip = branchTip(repo, branch);
  return tip ? repo.objects.commits[tip] : undefined;
}

export type FileChangeStatus = 'added' | 'modified' | 'deleted';

export interface FileDiff {
  path: string;
  status: FileChangeStatus;
  ops: LineOp[];
  additions: number;
  deletions: number;
}

export interface CommitDiff {
  commit: Commit;
  /** 첫 부모 대비 변경(머지 커밋도 첫 부모 기준으로 단순화) */
  files: FileDiff[];
  additions: number;
  deletions: number;
}

function countOps(ops: LineOp[]): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const o of ops) {
    if (o.type === 'add') additions++;
    else if (o.type === 'del') deletions++;
  }
  return { additions, deletions };
}

/** 한 커밋이 (첫 부모 대비) 무엇을 바꿨는지 */
export function commitDiff(repo: RemoteRepo, commitId: string): CommitDiff | null {
  const commit = repo.objects.commits[commitId];
  if (!commit) return null;

  const after = snapshotOf(repo.objects, commitId);
  const before = commit.parentIds[0]
    ? snapshotOf(repo.objects, commit.parentIds[0])
    : {};

  const d = diffSnapshots(before, after);
  const files: FileDiff[] = [];

  const pushDiff = (path: string, status: FileChangeStatus, a: string, b: string) => {
    const ops = diffLines(a, b);
    const { additions, deletions } = countOps(ops);
    files.push({ path, status, ops, additions, deletions });
  };

  for (const p of d.added) pushDiff(p, 'added', '', after[p] ?? '');
  for (const p of d.modified) pushDiff(p, 'modified', before[p] ?? '', after[p] ?? '');
  for (const p of d.deleted) pushDiff(p, 'deleted', before[p] ?? '', '');

  files.sort((x, y) => x.path.localeCompare(y.path));

  let additions = 0;
  let deletions = 0;
  for (const f of files) {
    additions += f.additions;
    deletions += f.deletions;
  }

  return { commit, files, additions, deletions };
}

/** 짧은 커밋 해시 표시(이미 7자리지만 방어적으로 slice) */
export function shortSha(id: string): string {
  return id.slice(0, 7);
}
