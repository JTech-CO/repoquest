// 엔진 단위 테스트: 객체 모델(blob/tree/commit) + content-addressing + 그래프 도달
// 학습 정확성의 안전망 — 같은 내용이면 같은 id, 평면↔트리 왕복 등.

import { describe, it, expect } from 'vitest';
import {
  buildTreeFromFiles,
  emptyStore,
  hashContent,
  readTree,
  reachable,
  snapshotOf,
  writeBlob,
  writeCommit,
  writeTree,
} from '../objects';

describe('objects.ts — hashContent', () => {
  it('같은 입력은 같은 해시(결정성)', () => {
    expect(hashContent('hello')).toBe(hashContent('hello'));
  });

  it('다른 입력은 다른 해시(일반 케이스)', () => {
    expect(hashContent('hello')).not.toBe(hashContent('world'));
  });

  it('7자리 hex 형태', () => {
    expect(hashContent('x')).toMatch(/^[0-9a-f]{7}$/);
  });
});

describe('objects.ts — writeBlob (content-addressing)', () => {
  it('같은 내용은 같은 id로 dedup', () => {
    const s = emptyStore();
    const a = writeBlob(s, 'hello');
    const b = writeBlob(s, 'hello');
    expect(a).toBe(b);
    expect(s.blobs[a].content).toBe('hello');
  });

  it('다른 내용은 다른 id', () => {
    const s = emptyStore();
    const a = writeBlob(s, 'hello');
    const b = writeBlob(s, 'world');
    expect(a).not.toBe(b);
  });

  it('blob 과 빈 tree 가 다른 namespace로 해시', () => {
    const s = emptyStore();
    const blobId = writeBlob(s, '');
    const treeId = writeTree(s, []);
    expect(blobId).not.toBe(treeId);
  });
});

describe('objects.ts — buildTreeFromFiles / readTree (왕복)', () => {
  it('평면 FileMap → 중첩 tree → 평면 복원이 같다', () => {
    const s = emptyStore();
    const files = {
      'a.txt': 'A',
      'dir/b.txt': 'B',
      'dir/sub/c.txt': 'C',
    };
    const treeId = buildTreeFromFiles(s, files);
    expect(readTree(s, treeId)).toEqual(files);
  });

  it('빈 FileMap → 빈 tree → 빈 FileMap', () => {
    const s = emptyStore();
    const treeId = buildTreeFromFiles(s, {});
    expect(readTree(s, treeId)).toEqual({});
  });

  it('같은 파일 집합은 같은 tree id', () => {
    const s = emptyStore();
    const a = buildTreeFromFiles(s, { 'x.txt': '1' });
    const b = buildTreeFromFiles(s, { 'x.txt': '1' });
    expect(a).toBe(b);
  });
});

describe('objects.ts — reachable', () => {
  it('빈 시작이면 빈 set', () => {
    expect(reachable({}).size).toBe(0);
  });

  it('linear chain 의 모든 조상 포함', () => {
    const s = emptyStore();
    const t = buildTreeFromFiles(s, { 'x': '1' });
    const a = writeCommit(s, { treeId: t, parentIds: [], author: 'me', message: 'a', timestamp: 1 });
    const b = writeCommit(s, { treeId: t, parentIds: [a], author: 'me', message: 'b', timestamp: 2 });
    const c = writeCommit(s, { treeId: t, parentIds: [b], author: 'me', message: 'c', timestamp: 3 });
    expect(reachable(s.commits, c)).toEqual(new Set([a, b, c]));
  });

  it('머지 커밋(부모 2개)을 따라 양쪽 가지 모두 포함', () => {
    const s = emptyStore();
    const t = buildTreeFromFiles(s, { 'x': '1' });
    const a = writeCommit(s, { treeId: t, parentIds: [], author: 'me', message: 'a', timestamp: 1 });
    const b = writeCommit(s, { treeId: t, parentIds: [a], author: 'me', message: 'b', timestamp: 2 });
    const c = writeCommit(s, { treeId: t, parentIds: [a], author: 'me', message: 'c', timestamp: 3 });
    const m = writeCommit(s, { treeId: t, parentIds: [b, c], author: 'me', message: 'm', timestamp: 4 });
    expect(reachable(s.commits, m)).toEqual(new Set([a, b, c, m]));
  });
});

describe('objects.ts — snapshotOf', () => {
  it('커밋 id → 그 시점의 평면 FileMap', () => {
    const s = emptyStore();
    const files = { 'a.txt': 'A', 'd/b.txt': 'B' };
    const treeId = buildTreeFromFiles(s, files);
    const cid = writeCommit(s, { treeId, parentIds: [], author: 'me', message: 'x', timestamp: 1 });
    expect(snapshotOf(s, cid)).toEqual(files);
  });

  it('undefined commit id → 빈 맵', () => {
    expect(snapshotOf(emptyStore(), undefined)).toEqual({});
  });
});
