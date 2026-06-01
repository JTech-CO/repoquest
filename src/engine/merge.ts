// src/engine/merge.ts
//
// 머지 베이스 탐색 + 3-way 병합 + 충돌 마커 생성.
//
// 단순화 고지: 충돌 판정은 "파일 단위"다(같은 파일을 양쪽이 서로 다르게 바꾸면 충돌).
// 진짜 Git은 파일 안의 hunk(줄 묶음) 단위로 더 똑똑하게 합치지만, 입문 학습에는
// "충돌 마커를 보고 직접 고른 뒤 다시 커밋한다"는 흐름 체험이 핵심이므로 파일 단위로 충분하다.
// 추후 hunk 단위가 필요하면 diff3 알고리즘으로 mergeFile만 교체하면 된다.

import type { Commit, FileMap, ObjectStore } from './types';
import { reachable } from './objects';

/**
 * 두 커밋의 공통 조상(merge base).
 * a의 모든 조상을 모은 뒤, b에서 BFS로 처음 만나는 조상을 반환.
 */
export function mergeBase(
  store: ObjectStore,
  a?: string,
  b?: string,
): string | undefined {
  if (!a || !b) return undefined;
  const ancestorsOfA = reachable(store.commits, a);
  const seen = new Set<string>();
  const queue: string[] = [b];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (ancestorsOfA.has(id)) return id; // 첫 공통 조상
    const c: Commit | undefined = store.commits[id];
    for (const p of c?.parentIds ?? []) queue.push(p);
  }
  return undefined;
}

export interface MergeResult {
  files: FileMap; // 병합 결과(충돌 시 마커 포함)
  conflicts: string[]; // 충돌난 경로
}

function conflictBlock(ours: string, theirs: string, theirLabel: string): string {
  return (
    `<<<<<<< HEAD\n` +
    `${ours}\n` +
    `=======\n` +
    `${theirs}\n` +
    `>>>>>>> ${theirLabel}\n`
  );
}

/**
 * 3-way 병합. base/ours/theirs 세 스냅샷을 합친다.
 * - 한쪽만 바꿨으면 그 변경을 채택
 * - 양쪽이 같게 바꿨으면 그대로
 * - 양쪽이 다르게 바꿨으면 충돌(마커 삽입)
 */
export function threeWayMerge(
  base: FileMap,
  ours: FileMap,
  theirs: FileMap,
  theirLabel: string,
): MergeResult {
  const result: FileMap = {};
  const conflicts: string[] = [];
  const paths = new Set<string>([
    ...Object.keys(base),
    ...Object.keys(ours),
    ...Object.keys(theirs),
  ]);

  for (const p of paths) {
    const b = base[p];
    const o = ours[p];
    const t = theirs[p];

    if (o === t) {
      if (o !== undefined) result[p] = o; // 동일(양쪽 삭제면 결과에서 빠짐)
      continue;
    }
    if (o === b) {
      if (t !== undefined) result[p] = t; // 우리는 그대로 → 상대 변경 채택(삭제 포함)
      continue;
    }
    if (t === b) {
      if (o !== undefined) result[p] = o; // 상대는 그대로 → 우리 변경 채택
      continue;
    }
    // 양쪽 다 base와 다르고 서로도 다름 → 충돌
    conflicts.push(p);
    result[p] = conflictBlock(o ?? '', t ?? '', theirLabel);
  }

  return { files: result, conflicts: conflicts.sort() };
}
