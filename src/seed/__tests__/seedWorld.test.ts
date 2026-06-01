// 시드 정합성 안전망. 미션 판정과 직접 맞물리는 제약을 회귀로 잡는다.

import { describe, it, expect } from 'vitest';
import { PRACTICE_REPO_ID } from '../../tutorial/missions';
import { seedWorld } from '../seedWorld';
import { HEADS_PREFIX } from '../../engine/types';
import { snapshotOf } from '../../engine/objects';

describe('seedWorld', () => {
  it('PRACTICE_REPO_ID 와 정확히 일치하는 실습용 레포가 존재', () => {
    const w = seedWorld();
    const repo = w.remoteRepos[PRACTICE_REPO_ID];
    expect(repo).toBeDefined();
    expect(repo.owner).toBe('octocat');
    expect(repo.name).toBe('spoon-knife');
  });

  it('현재 사용자 + 가짜 유저들이 등록되어 있다', () => {
    const w = seedWorld('me');
    expect(Object.keys(w.users)).toEqual(
      expect.arrayContaining(['me', 'octocat', 'torvalds', 'monalisa']),
    );
    expect(w.currentUser).toBe('me');
  });

  it('레포 개수는 KICKOFF 가 명시한 3~5 범위 안', () => {
    const w = seedWorld();
    const n = Object.keys(w.remoteRepos).length;
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBeLessThanOrEqual(5);
  });

  it('각 레포의 default branch tip 이 실제 commits 에 존재한다', () => {
    const w = seedWorld();
    for (const repo of Object.values(w.remoteRepos)) {
      const tip = repo.refs[HEADS_PREFIX + repo.defaultBranch];
      expect(tip, `${repo.id} default tip`).toBeDefined();
      expect(repo.objects.commits[tip], `${repo.id} commit object`).toBeDefined();
    }
  });

  it('적어도 하나는 두 개 이상의 브랜치를 가진다(머지·PR 학습용)', () => {
    const w = seedWorld();
    const multi = Object.values(w.remoteRepos).some((r) => {
      const heads = Object.keys(r.refs).filter((k) =>
        k.startsWith(HEADS_PREFIX),
      );
      return heads.length >= 2;
    });
    expect(multi).toBe(true);
  });

  it('적어도 하나는 기존 PR / Issue 가 있다(협업 둘러보기용)', () => {
    const w = seedWorld();
    const hasPr = Object.values(w.remoteRepos).some(
      (r) => r.pullRequests.length > 0,
    );
    const hasIssue = Object.values(w.remoteRepos).some(
      (r) => r.issues.length > 0,
    );
    expect(hasPr && hasIssue).toBe(true);
  });

  it('spoon-knife 의 default tip 에 README.md 가 들어있다(검색·둘러보기 미션의 가시 조건)', () => {
    const w = seedWorld();
    const repo = w.remoteRepos[PRACTICE_REPO_ID];
    const snap = snapshotOf(repo.objects, repo.refs[HEADS_PREFIX + repo.defaultBranch]);
    expect(snap['README.md']).toBeDefined();
    expect(snap['README.md']).toContain('Spoon-Knife');
  });

  it('초기 진행상태는 첫 미션(explore) 이 활성', () => {
    const w = seedWorld();
    expect(w.tutorial.currentMissionId).toBe('explore');
    expect(w.tutorial.completedMissionIds).toEqual([]);
    expect(w.tutorial.events).toEqual([]);
  });

  it('localClones 는 비어 있음(미션 3 에서 사용자가 직접 clone)', () => {
    const w = seedWorld();
    expect(w.localClones).toEqual({});
  });
});
