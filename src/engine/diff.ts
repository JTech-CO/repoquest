// src/engine/diff.ts
//
// diff 계산. UI의 초록(+)/빨강(-) 렌더링과 status 판정에 쓰인다.
// (UI에서 더 화려한 렌더링이 필요하면 jsdiff로 교체 가능하지만, 엔진 자립을 위해 LCS를 직접 구현)

import type { FileMap } from './types';

export type LineOp =
  | { type: 'eq'; line: string }
  | { type: 'add'; line: string }
  | { type: 'del'; line: string };

/** 두 텍스트의 줄 단위 차이 (LCS 기반) */
export function diffLines(aText: string, bText: string): LineOp[] {
  const a = aText.split('\n');
  const b = bText.split('\n');
  const n = a.length;
  const m = b.length;

  // LCS 길이 테이블
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: LineOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'eq', line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'del', line: a[i] });
      i++;
    } else {
      ops.push({ type: 'add', line: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ type: 'del', line: a[i++] });
  while (j < m) ops.push({ type: 'add', line: b[j++] });
  return ops;
}

export interface SnapshotDiff {
  added: string[];
  modified: string[];
  deleted: string[];
}

/** 두 FileMap(스냅샷) 사이에 어떤 파일이 추가/수정/삭제됐는가 */
export function diffSnapshots(base: FileMap, target: FileMap): SnapshotDiff {
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  for (const p of Object.keys(target)) {
    if (!(p in base)) added.push(p);
    else if (base[p] !== target[p]) modified.push(p);
  }
  for (const p of Object.keys(base)) {
    if (!(p in target)) deleted.push(p);
  }
  return {
    added: added.sort(),
    modified: modified.sort(),
    deleted: deleted.sort(),
  };
}

export function snapshotsEqual(a: FileMap, b: FileMap): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => a[k] === b[k]);
}
