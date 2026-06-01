// 엔진 단위 테스트: diff (LCS 기반 줄 단위, 그리고 FileMap 단위)

import { describe, it, expect } from 'vitest';
import { diffLines, diffSnapshots, snapshotsEqual } from '../diff';

describe('diff.ts — diffLines', () => {
  it('완전히 같은 텍스트는 전부 eq', () => {
    const ops = diffLines('a\nb', 'a\nb');
    expect(ops.every((o) => o.type === 'eq')).toBe(true);
    expect(ops.map((o) => o.line)).toEqual(['a', 'b']);
  });

  it('한 줄 추가', () => {
    expect(diffLines('a', 'a\nb')).toEqual([
      { type: 'eq', line: 'a' },
      { type: 'add', line: 'b' },
    ]);
  });

  it('한 줄 삭제', () => {
    expect(diffLines('a\nb', 'a')).toEqual([
      { type: 'eq', line: 'a' },
      { type: 'del', line: 'b' },
    ]);
  });

  it('교체는 del+add 로 표현', () => {
    const ops = diffLines('a', 'b');
    expect(ops.filter((o) => o.type === 'del')).toEqual([{ type: 'del', line: 'a' }]);
    expect(ops.filter((o) => o.type === 'add')).toEqual([{ type: 'add', line: 'b' }]);
  });

  it('가운데 줄만 바뀐 케이스', () => {
    const ops = diffLines('x\nA\ny', 'x\nB\ny');
    expect(ops).toEqual([
      { type: 'eq', line: 'x' },
      { type: 'del', line: 'A' },
      { type: 'add', line: 'B' },
      { type: 'eq', line: 'y' },
    ]);
  });
});

describe('diff.ts — diffSnapshots', () => {
  it('added / modified / deleted 정확 분류', () => {
    const r = diffSnapshots(
      { keep: 'x', change: 'old', remove: 'r' },
      { keep: 'x', change: 'new', add: 'a' },
    );
    expect(r).toEqual({
      added: ['add'],
      modified: ['change'],
      deleted: ['remove'],
    });
  });

  it('완전히 같은 두 맵은 셋 다 빈 배열', () => {
    expect(diffSnapshots({ a: '1' }, { a: '1' })).toEqual({
      added: [],
      modified: [],
      deleted: [],
    });
  });

  it('정렬 보장(deterministic 출력)', () => {
    const r = diffSnapshots(
      {},
      { z: '1', a: '1', m: '1' },
    );
    expect(r.added).toEqual(['a', 'm', 'z']);
  });
});

describe('diff.ts — snapshotsEqual', () => {
  it('같은 키/값이면 true (키 순서 무관)', () => {
    expect(snapshotsEqual({ a: '1', b: '2' }, { b: '2', a: '1' })).toBe(true);
  });

  it('값이 다르면 false', () => {
    expect(snapshotsEqual({ a: '1' }, { a: '2' })).toBe(false);
  });

  it('키 개수가 다르면 false', () => {
    expect(snapshotsEqual({ a: '1' }, { a: '1', b: '2' })).toBe(false);
  });

  it('두 빈 맵은 true', () => {
    expect(snapshotsEqual({}, {})).toBe(true);
  });
});
