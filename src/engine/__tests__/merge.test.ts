// 엔진 단위 테스트: mergeBase + threeWayMerge
// fast-forward / 진짜 머지 / 충돌의 세 가지 분기를 학습용으로 검증.

import { describe, it, expect } from 'vitest';
import { buildTreeFromFiles, emptyStore, writeCommit } from '../objects';
import { mergeBase, threeWayMerge } from '../merge';

function makeCommit(
  s: ReturnType<typeof emptyStore>,
  parents: string[],
  msg: string,
  ts = parents.length + 1,
): string {
  const treeId = buildTreeFromFiles(s, {});
  return writeCommit(s, {
    treeId,
    parentIds: parents,
    author: 'me',
    message: msg,
    timestamp: ts,
  });
}

describe('merge.ts — mergeBase', () => {
  it('한쪽이 undefined 면 결과도 undefined', () => {
    expect(mergeBase(emptyStore(), undefined, 'x')).toBeUndefined();
    expect(mergeBase(emptyStore(), 'x', undefined)).toBeUndefined();
  });

  it('a 가 b 의 조상이면 base 는 a', () => {
    const s = emptyStore();
    const a = makeCommit(s, [], 'a');
    const b = makeCommit(s, [a], 'b');
    expect(mergeBase(s, a, b)).toBe(a);
    expect(mergeBase(s, b, a)).toBe(a);
  });

  it('두 갈래의 공통 조상', () => {
    const s = emptyStore();
    const a = makeCommit(s, [], 'a');
    const b = makeCommit(s, [a], 'b');
    const c = makeCommit(s, [a], 'c');
    expect(mergeBase(s, b, c)).toBe(a);
  });

  it('공통 조상이 없으면 undefined', () => {
    const s = emptyStore();
    const a = makeCommit(s, [], 'a');
    const b = makeCommit(s, [], 'b');
    expect(mergeBase(s, a, b)).toBeUndefined();
  });
});

describe('merge.ts — threeWayMerge', () => {
  it('양쪽 변경이 동일하면 그대로 채택, 충돌 없음', () => {
    const r = threeWayMerge({ x: '1' }, { x: '2' }, { x: '2' }, 'feat');
    expect(r.conflicts).toEqual([]);
    expect(r.files).toEqual({ x: '2' });
  });

  it('한쪽만 변경 → 그 쪽 채택', () => {
    const r = threeWayMerge({ x: '1' }, { x: '2' }, { x: '1' }, 'feat');
    expect(r.conflicts).toEqual([]);
    expect(r.files).toEqual({ x: '2' });
  });

  it('서로 다른 변경 → 충돌 마커 삽입', () => {
    const r = threeWayMerge({ x: '1' }, { x: '2' }, { x: '3' }, 'feat');
    expect(r.conflicts).toEqual(['x']);
    expect(r.files.x).toContain('<<<<<<< HEAD');
    expect(r.files.x).toContain('=======');
    expect(r.files.x).toContain('>>>>>>> feat');
    expect(r.files.x).toContain('2');
    expect(r.files.x).toContain('3');
  });

  it('양쪽이 서로 다른 파일을 추가 → 둘 다 채택', () => {
    const r = threeWayMerge({}, { a: 'A' }, { b: 'B' }, 'feat');
    expect(r.conflicts).toEqual([]);
    expect(r.files).toEqual({ a: 'A', b: 'B' });
  });

  it('양쪽이 같은 새 파일을 다르게 추가 → 충돌', () => {
    const r = threeWayMerge({}, { n: 'A' }, { n: 'B' }, 'feat');
    expect(r.conflicts).toEqual(['n']);
  });

  it('한쪽 삭제 + 다른쪽 수정 → 충돌', () => {
    const r = threeWayMerge({ x: '1' }, {}, { x: '2' }, 'feat');
    expect(r.conflicts).toEqual(['x']);
  });

  it('양쪽 동일 삭제 → 결과에서 빠짐', () => {
    const r = threeWayMerge({ x: '1' }, {}, {}, 'feat');
    expect(r.conflicts).toEqual([]);
    expect(r.files).toEqual({});
  });
});
