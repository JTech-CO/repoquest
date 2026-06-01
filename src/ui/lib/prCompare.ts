// src/ui/lib/prCompare.ts
//
// PR 비교: source 브랜치가 target 브랜치보다 무엇을(커밋/파일) 앞서는지 계산.
// fork→upstream 도 지원 — fork 의 objects 는 clone 시점에 upstream 객체를 포함하므로
// source.objects 하나로 양쪽 tip 을 모두 해석할 수 있다.

import type { RemoteRepo } from '../../store/world';
import type { Commit } from '../../engine/types';
import { HEADS_PREFIX } from '../../engine/types';
import { reachable, snapshotOf } from '../../engine/objects';
import { mergeBase } from '../../engine/merge';
import { diffLines, diffSnapshots } from '../../engine/diff';
import type { FileDiff } from './repoView';

export interface PrComparison {
  commits: Commit[];
  files: FileDiff[];
  additions: number;
  deletions: number;
  hasChanges: boolean;
}

export function comparePr(
  sourceRepo: RemoteRepo,
  sourceBranch: string,
  targetRepo: RemoteRepo,
  targetBranch: string,
): PrComparison {
  const objs = sourceRepo.objects;
  const sTip = sourceRepo.refs[HEADS_PREFIX + sourceBranch];
  const tTip = targetRepo.refs[HEADS_PREFIX + targetBranch];

  if (!sTip) {
    return { commits: [], files: [], additions: 0, deletions: 0, hasChanges: false };
  }

  const base = (tTip && mergeBase(objs, sTip, tTip)) || tTip;
  const sReach = reachable(objs.commits, sTip);
  const bReach = base ? reachable(objs.commits, base) : new Set<string>();
  const commits = [...sReach]
    .filter((id) => !bReach.has(id))
    .map((id) => objs.commits[id])
    .filter((c): c is Commit => Boolean(c))
    .sort((a, b) => b.timestamp - a.timestamp);

  const before = base ? snapshotOf(objs, base) : {};
  const after = snapshotOf(objs, sTip);
  const d = diffSnapshots(before, after);

  const files: FileDiff[] = [];
  let additions = 0;
  let deletions = 0;
  const push = (path: string, status: FileDiff['status'], a: string, b: string) => {
    const ops = diffLines(a, b);
    let ai = 0;
    let di = 0;
    for (const o of ops) {
      if (o.type === 'add') ai++;
      else if (o.type === 'del') di++;
    }
    additions += ai;
    deletions += di;
    files.push({ path, status, ops, additions: ai, deletions: di });
  };
  d.added.forEach((p) => push(p, 'added', '', after[p] ?? ''));
  d.modified.forEach((p) => push(p, 'modified', before[p] ?? '', after[p] ?? ''));
  d.deleted.forEach((p) => push(p, 'deleted', before[p] ?? '', ''));
  files.sort((x, y) => x.path.localeCompare(y.path));

  return {
    commits,
    files,
    additions,
    deletions,
    hasChanges: commits.length > 0 || files.length > 0,
  };
}
