// 엔진 단위 테스트: refs / HEAD / aheadBehind
// "브랜치는 커밋을 가리키는 이름표"라는 학습 명제가 코드로도 성립함을 확인한다.

import { describe, it, expect } from 'vitest';
import type { LocalClone } from '../types';
import { HEADS_PREFIX, ORIGIN_PREFIX } from '../types';
import { buildTreeFromFiles, emptyStore, writeCommit } from '../objects';
import {
  aheadBehind,
  branchTip,
  currentBranch,
  headCommitId,
  listLocalBranches,
  resolveCommittish,
  setBranchTip,
} from '../refs';

function makeClone(overrides: Partial<LocalClone> = {}): LocalClone {
  return {
    id: 'c',
    remoteRepoId: 'r',
    objects: emptyStore(),
    refs: {},
    head: { type: 'branch', ref: HEADS_PREFIX + 'main' },
    workingDir: {},
    index: {},
    ...overrides,
  };
}

function makeCommit(c: LocalClone, parents: string[], ts: number): string {
  const t = buildTreeFromFiles(c.objects, {});
  return writeCommit(c.objects, {
    treeId: t,
    parentIds: parents,
    author: 'me',
    message: `c${ts}`,
    timestamp: ts,
  });
}

describe('refs.ts — headCommitId', () => {
  it('빈 저장소(브랜치만, 가리키는 커밋 없음)는 undefined', () => {
    expect(headCommitId(makeClone())).toBeUndefined();
  });

  it('branch head 는 해당 ref 가 가리키는 커밋', () => {
    const c = makeClone();
    const id = makeCommit(c, [], 1);
    c.refs[HEADS_PREFIX + 'main'] = id;
    expect(headCommitId(c)).toBe(id);
  });

  it('detached HEAD 는 직접 commitId 반환', () => {
    const c = makeClone({ head: { type: 'detached', commitId: 'abc1234' } });
    expect(headCommitId(c)).toBe('abc1234');
  });
});

describe('refs.ts — currentBranch / 목록 / tip', () => {
  it('currentBranch 는 branch 상태에서 이름, detached 면 null', () => {
    expect(currentBranch(makeClone())).toBe('main');
    expect(
      currentBranch(makeClone({ head: { type: 'detached', commitId: 'x' } })),
    ).toBeNull();
  });

  it('listLocalBranches 는 refs/heads/* 만 반환', () => {
    const c = makeClone();
    c.refs[HEADS_PREFIX + 'main'] = 'a';
    c.refs[HEADS_PREFIX + 'feat'] = 'b';
    c.refs[ORIGIN_PREFIX + 'main'] = 'a';
    expect(listLocalBranches(c).sort()).toEqual(['feat', 'main']);
  });

  it('branchTip / setBranchTip 왕복', () => {
    const c = makeClone();
    setBranchTip(c, 'feat', 'abc');
    expect(branchTip(c, 'feat')).toBe('abc');
  });
});

describe('refs.ts — resolveCommittish', () => {
  it('브랜치 이름 → isBranch=true', () => {
    const c = makeClone();
    const id = makeCommit(c, [], 1);
    c.refs[HEADS_PREFIX + 'main'] = id;
    expect(resolveCommittish(c, 'main')).toEqual({ commitId: id, isBranch: true });
  });

  it('커밋 해시 → isBranch=false (detached 대상)', () => {
    const c = makeClone();
    const id = makeCommit(c, [], 1);
    expect(resolveCommittish(c, id)).toEqual({ commitId: id, isBranch: false });
  });

  it('알 수 없는 이름 → commitId 없음', () => {
    expect(resolveCommittish(makeClone(), 'no-such')).toEqual({
      commitId: undefined,
      isBranch: false,
    });
  });
});

describe('refs.ts — aheadBehind', () => {
  it('동기 상태: 양쪽 동일하면 0/0', () => {
    const c = makeClone();
    const a = makeCommit(c, [], 1);
    c.refs[HEADS_PREFIX + 'main'] = a;
    c.refs[ORIGIN_PREFIX + 'main'] = a;
    expect(aheadBehind(c, 'main')).toEqual({ ahead: 0, behind: 0 });
  });

  it('로컬만 앞서면 ahead', () => {
    const c = makeClone();
    const a = makeCommit(c, [], 1);
    const b = makeCommit(c, [a], 2);
    c.refs[HEADS_PREFIX + 'main'] = b;
    c.refs[ORIGIN_PREFIX + 'main'] = a;
    expect(aheadBehind(c, 'main')).toEqual({ ahead: 1, behind: 0 });
  });

  it('원격만 앞서면 behind', () => {
    const c = makeClone();
    const a = makeCommit(c, [], 1);
    const b = makeCommit(c, [a], 2);
    c.refs[HEADS_PREFIX + 'main'] = a;
    c.refs[ORIGIN_PREFIX + 'main'] = b;
    expect(aheadBehind(c, 'main')).toEqual({ ahead: 0, behind: 1 });
  });

  it('갈라지면(diverged) 양쪽 다 카운트', () => {
    const c = makeClone();
    const root = makeCommit(c, [], 1);
    const l = makeCommit(c, [root], 2);
    const r = makeCommit(c, [root], 3);
    c.refs[HEADS_PREFIX + 'main'] = l;
    c.refs[ORIGIN_PREFIX + 'main'] = r;
    expect(aheadBehind(c, 'main')).toEqual({ ahead: 1, behind: 1 });
  });
});
