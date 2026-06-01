// src/store/collabActions.ts
//
// 협업 도메인(Issue / Pull Request) 스토어 액션. 정본 world.ts 를 건드리지 않고
// useWorld.setState 로 RemoteRepo.issues / pullRequests 를 갱신한다.
//
// PR 머지는 객체 복사가 얽히므로 immer 안티패턴을 피해 getState→순수함수→setState 패턴을 쓴다.

import type { RemoteRepo } from './world';
import { useWorld } from './world';
import {
  mergePullRequest as engineMergePr,
  type MergePrResult,
  type MergeStrategy,
} from '../github/mergePr';
import { syncTutorialProgress } from '../tutorial/missions';

function nextNumber(repo: RemoteRepo): number {
  const nums = [
    ...repo.issues.map((i) => i.number),
    ...repo.pullRequests.map((p) => p.number),
  ];
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

// ── Issue ───────────────────────────────────────────────────────────────────
export function createIssue(
  repoId: string,
  data: { title: string; body: string; labels?: string[] },
): number {
  let number = 0;
  useWorld.setState((draft) => {
    const repo = draft.remoteRepos[repoId];
    if (!repo) throw new Error(`알 수 없는 저장소: ${repoId}`);
    number = nextNumber(repo);
    repo.issues.push({
      id: `iss_${repoId}_${number}`,
      number,
      author: draft.currentUser,
      title: data.title,
      body: data.body,
      state: 'open',
      labels: data.labels ?? [],
      comments: [],
      createdAt: Date.now(),
    });
    syncTutorialProgress(draft);
  });
  return number;
}

export function addIssueComment(repoId: string, issueId: string, body: string): void {
  useWorld.setState((draft) => {
    const issue = draft.remoteRepos[repoId]?.issues.find((i) => i.id === issueId);
    if (!issue) return;
    issue.comments.push({
      id: `${issueId}_c${issue.comments.length + 1}`,
      author: draft.currentUser,
      body,
      createdAt: Date.now(),
    });
    syncTutorialProgress(draft);
  });
}

export function setIssueState(
  repoId: string,
  issueId: string,
  state: 'open' | 'closed',
): void {
  useWorld.setState((draft) => {
    const issue = draft.remoteRepos[repoId]?.issues.find((i) => i.id === issueId);
    if (issue) issue.state = state;
    syncTutorialProgress(draft);
  });
}

// ── Pull Request ──────────────────────────────────────────────────────────────
export function createPullRequest(
  targetRepoId: string,
  data: {
    title: string;
    body: string;
    sourceRepoId: string;
    sourceBranch: string;
    targetBranch: string;
  },
): number {
  let number = 0;
  useWorld.setState((draft) => {
    const repo = draft.remoteRepos[targetRepoId];
    if (!repo) throw new Error(`알 수 없는 저장소: ${targetRepoId}`);
    number = nextNumber(repo);
    repo.pullRequests.push({
      id: `pr_${targetRepoId}_${number}`,
      number,
      author: draft.currentUser,
      title: data.title,
      body: data.body,
      state: 'open',
      sourceRepoId: data.sourceRepoId,
      sourceBranch: data.sourceBranch,
      targetBranch: data.targetBranch,
      comments: [],
      createdAt: Date.now(),
    });
    syncTutorialProgress(draft);
  });
  return number;
}

export function addPrComment(repoId: string, prId: string, body: string): void {
  useWorld.setState((draft) => {
    const pr = draft.remoteRepos[repoId]?.pullRequests.find((p) => p.id === prId);
    if (!pr) return;
    pr.comments.push({
      id: `${prId}_c${pr.comments.length + 1}`,
      author: draft.currentUser,
      body,
      createdAt: Date.now(),
    });
    syncTutorialProgress(draft);
  });
}

export function closePullRequest(repoId: string, prId: string): void {
  useWorld.setState((draft) => {
    const pr = draft.remoteRepos[repoId]?.pullRequests.find((p) => p.id === prId);
    if (pr && pr.state === 'open') pr.state = 'closed';
    syncTutorialProgress(draft);
  });
}

/**
 * PR 머지. 충돌이면 머지하지 않고 conflict 를 반환한다.
 * 성공 시 targetRepo 의 객체/refs 갱신 + PR state='merged'.
 */
export function mergePr(
  targetRepoId: string,
  prId: string,
  strategy: MergeStrategy,
): MergePrResult {
  const state = useWorld.getState();
  const targetRepo = state.remoteRepos[targetRepoId];
  if (!targetRepo) throw new Error(`알 수 없는 저장소: ${targetRepoId}`);
  const pr = targetRepo.pullRequests.find((p) => p.id === prId);
  if (!pr) throw new Error(`알 수 없는 PR: ${prId}`);
  if (pr.state !== 'open') throw new Error('이미 닫혔거나 머지된 PR 입니다.');
  const sourceRepo = state.remoteRepos[pr.sourceRepoId];
  if (!sourceRepo) throw new Error('source 저장소를 찾을 수 없습니다.');

  const result = engineMergePr({
    targetRepo,
    sourceRepo,
    sourceBranch: pr.sourceBranch,
    targetBranch: pr.targetBranch,
    strategy,
    author: state.currentUser,
    title: pr.title,
  });

  if (result.status === 'conflict') return result;

  useWorld.setState((draft) => {
    // result.repo 를 통째 할당하면 그 안 pullRequests 가 frozen 이라 state 수정이 막힌다.
    // objects/refs 만 새 값으로 교체하고, PR state 는 draft 원본에서 수정한다.
    const repo = draft.remoteRepos[targetRepoId];
    repo.objects = result.repo.objects;
    repo.refs = result.repo.refs;
    const p = repo.pullRequests.find((x) => x.id === prId);
    if (p) p.state = 'merged';
    syncTutorialProgress(draft);
  });
  return result;
}
