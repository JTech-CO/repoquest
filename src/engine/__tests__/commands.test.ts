// 엔진 단위 테스트: 명령(commands)의 통합 시나리오.
// 입문자가 자주 만나는 흐름(세 트리 / 빈 커밋 거부 / 더티 전환 / 머지 분기)을 시나리오 단위로 검증.

import { describe, it, expect } from 'vitest';
import type { LocalClone } from '../types';
import { HEADS_PREFIX } from '../types';
import { emptyStore } from '../objects';
import {
  commit,
  createBranch,
  deleteFile,
  DirtyWorkingTreeError,
  log,
  mergeBranch,
  NothingToCommitError,
  stage,
  status,
  switchTo,
  writeFile,
} from '../commands';

function emptyClone(): LocalClone {
  return {
    id: 'c',
    remoteRepoId: 'r',
    objects: emptyStore(),
    refs: {},
    head: { type: 'branch', ref: HEADS_PREFIX + 'main' },
    workingDir: {},
    index: {},
  };
}

function initial(files: Record<string, string>, message = 'init', timestamp = 1) {
  let c: LocalClone = emptyClone();
  for (const [p, v] of Object.entries(files)) {
    c = writeFile(c, p, v).clone;
  }
  c = stage(c).clone;
  const r = commit(c, { author: 'me', message, timestamp });
  return r;
}

describe('commands — writeFile / stage / commit (세 트리)', () => {
  it('write 는 workingDir 에만, stage 후 index 동기화, commit 후 HEAD 갱신', () => {
    let c = emptyClone();
    c = writeFile(c, 'a.txt', 'A').clone;
    expect(c.workingDir).toEqual({ 'a.txt': 'A' });
    expect(c.index).toEqual({}); // 아직 스테이징 전

    c = stage(c).clone;
    expect(c.index).toEqual({ 'a.txt': 'A' });

    const r = commit(c, { author: 'me', message: 'first', timestamp: 1 });
    c = r.clone;
    expect(c.objects.commits[r.commitId].message).toBe('first');
    expect(c.refs[HEADS_PREFIX + 'main']).toBe(r.commitId);
  });

  it('스테이징된 변경이 없으면 NothingToCommitError', () => {
    const c0 = initial({ 'a.txt': 'A' }).clone;
    expect(() =>
      commit(c0, { author: 'me', message: 'noop', timestamp: 2 }),
    ).toThrow(NothingToCommitError);
  });

  it('순수성: 원본 clone 은 변형되지 않는다', () => {
    const c = emptyClone();
    writeFile(c, 'a.txt', 'A');
    expect(c.workingDir).toEqual({}); // 변하면 안 됨
  });
});

describe('commands — createBranch / switchTo', () => {
  it('새 브랜치는 현재 HEAD 가 가리키던 커밋을 가리킨다', () => {
    let c = initial({ 'a.txt': 'A' }).clone;
    const tip = c.refs[HEADS_PREFIX + 'main'];
    c = createBranch(c, 'feat', { checkout: true }).clone;
    expect(c.refs[HEADS_PREFIX + 'feat']).toBe(tip);
    expect(c.head).toEqual({ type: 'branch', ref: HEADS_PREFIX + 'feat' });
  });

  it('이미 있는 브랜치 이름은 에러', () => {
    let c = initial({ 'a.txt': 'A' }).clone;
    c = createBranch(c, 'feat', {}).clone;
    expect(() => createBranch(c, 'feat', {})).toThrow();
  });

  it('dirty 작업본에서 switch 하면 DirtyWorkingTreeError', () => {
    let c = initial({ 'a.txt': 'A' }).clone;
    c = createBranch(c, 'feat', {}).clone;
    c = writeFile(c, 'a.txt', 'X').clone; // workingDir 만 변경, stage 안 함
    expect(() => switchTo(c, 'feat')).toThrow(DirtyWorkingTreeError);
  });

  it('force 옵션이면 dirty 여도 switch 허용', () => {
    let c = initial({ 'a.txt': 'A' }).clone;
    c = createBranch(c, 'feat', {}).clone;
    c = writeFile(c, 'a.txt', 'X').clone;
    expect(() => switchTo(c, 'feat', { force: true })).not.toThrow();
  });

  it('커밋 해시로 switch 하면 detached', () => {
    const r = initial({ 'a.txt': 'A' });
    let c = r.clone;
    c = writeFile(c, 'a.txt', 'A2').clone;
    c = stage(c).clone;
    c = commit(c, { author: 'me', message: 'second', timestamp: 2 }).clone;
    const result = switchTo(c, r.commitId);
    expect(result.detached).toBe(true);
    expect(result.clone.head.type).toBe('detached');
  });

  it('알 수 없는 대상은 에러', () => {
    const c = initial({ 'a.txt': 'A' }).clone;
    expect(() => switchTo(c, 'no-such')).toThrow();
  });
});

describe('commands — mergeBranch (네 가지 결과 분기)', () => {
  it('up-to-date: 상대가 우리 조상이거나 같으면 새 커밋 없이 종료', () => {
    let c = initial({ 'a.txt': 'A' }).clone;
    c = createBranch(c, 'feat', {}).clone; // 같은 커밋을 가리킴
    const r = mergeBranch(c, 'feat', { author: 'me', timestamp: 2 });
    expect(r.status).toBe('up-to-date');
  });

  it('fast-forward: 우리가 base, 상대만 앞섰음', () => {
    let c = initial({ 'a.txt': 'A' }).clone;
    c = createBranch(c, 'feat', { checkout: true }).clone;
    c = writeFile(c, 'a.txt', 'B').clone;
    c = stage(c).clone;
    c = commit(c, { author: 'me', message: 'on feat', timestamp: 2 }).clone;

    c = switchTo(c, 'main').clone;
    const r = mergeBranch(c, 'feat', { author: 'me', timestamp: 3 });
    expect(r.status).toBe('fast-forward');
  });

  it('진짜 머지: 양쪽이 다른 파일을 바꾸면 부모 2개짜리 머지 커밋', () => {
    let c = initial({ 'a.txt': 'A', 'b.txt': 'B' }).clone;
    c = createBranch(c, 'feat', { checkout: true }).clone;
    c = writeFile(c, 'a.txt', 'A2').clone;
    c = stage(c).clone;
    c = commit(c, { author: 'me', message: 'feat a', timestamp: 2 }).clone;

    c = switchTo(c, 'main').clone;
    c = writeFile(c, 'b.txt', 'B2').clone;
    c = stage(c).clone;
    c = commit(c, { author: 'me', message: 'main b', timestamp: 3 }).clone;

    const r = mergeBranch(c, 'feat', { author: 'me', timestamp: 4 });
    expect(r.status).toBe('merged');
    if (r.status === 'merged') {
      const m = r.clone.objects.commits[r.commitId];
      expect(m.parentIds.length).toBe(2);
    }
  });

  it('충돌: 같은 파일을 다르게 바꾸면 mergeState 진입 + 작업본에 마커', () => {
    let c = initial({ 'x.txt': 'one' }).clone;
    c = createBranch(c, 'feat', { checkout: true }).clone;
    c = writeFile(c, 'x.txt', 'feat-version').clone;
    c = stage(c).clone;
    c = commit(c, { author: 'me', message: 'feat x', timestamp: 2 }).clone;

    c = switchTo(c, 'main').clone;
    c = writeFile(c, 'x.txt', 'main-version').clone;
    c = stage(c).clone;
    c = commit(c, { author: 'me', message: 'main x', timestamp: 3 }).clone;

    const r = mergeBranch(c, 'feat', { author: 'me', timestamp: 4 });
    expect(r.status).toBe('conflict');
    if (r.status === 'conflict') {
      expect(r.conflicts).toEqual(['x.txt']);
      expect(r.clone.workingDir['x.txt']).toContain('<<<<<<<');
      expect(r.clone.workingDir['x.txt']).toContain('>>>>>>> feat');
      expect(r.clone.mergeState).toBeDefined();
      expect(r.clone.mergeState?.conflicts).toEqual(['x.txt']);
    }
  });
});

describe('commands — status / log', () => {
  it('status 는 현재 브랜치와 staged/unstaged 변화를 반영한다', () => {
    let c = initial({ 'a.txt': 'A' }).clone;
    c = writeFile(c, 'a.txt', 'A2').clone;
    const s1 = status(c);
    expect(s1.branch).toBe('main');
    expect(s1.unstaged.modified).toContain('a.txt');

    c = stage(c).clone;
    const s2 = status(c);
    expect(s2.staged.modified).toContain('a.txt');
    expect(s2.unstaged.modified).not.toContain('a.txt');
  });

  it('log 는 timestamp 내림차순으로 정렬된다', () => {
    let c = initial({ 'a.txt': 'A' }, 'init', 1).clone;
    c = writeFile(c, 'a.txt', 'A2').clone;
    c = stage(c).clone;
    c = commit(c, { author: 'me', message: 'second', timestamp: 10 }).clone;
    expect(log(c).map((e) => e.message)).toEqual(['second', 'init']);
  });
});

describe('commands — deleteFile', () => {
  it('workingDir 에서 제거, stage 후 index 에서도 제거', () => {
    let c = initial({ 'a.txt': 'A' }).clone;
    c = deleteFile(c, 'a.txt').clone;
    expect(c.workingDir).toEqual({});
    c = stage(c).clone;
    expect(c.index).toEqual({});
  });
});
