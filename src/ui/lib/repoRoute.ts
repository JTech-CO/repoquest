// src/ui/lib/repoRoute.ts
//
// /:owner/:repo/* 의 splat 을 레포 내부 뷰로 해석한다.
// 브랜치 이름에 슬래시가 있을 수 있으므로(예: feature/dark-mode),
// "가장 긴 브랜치 우선" 매칭으로 branch 와 path 를 분리한다(GitHub 과 동일한 접근).

import type { RemoteRepo } from '../../store/world';
import { listBranches } from './repoView';

export type RepoView =
  | { kind: 'code'; branch: string; path: string }
  | { kind: 'blob'; branch: string; path: string }
  | { kind: 'commits'; branch: string }
  | { kind: 'commit'; sha: string }
  | { kind: 'issues' }
  | { kind: 'issue-new' }
  | { kind: 'issue'; number: number }
  | { kind: 'pulls' }
  | { kind: 'pull-new' }
  | { kind: 'pull'; number: number }
  | { kind: 'notfound' };

export function parseRepoSplat(splat: string, repo: RemoteRepo): RepoView {
  const seg = splat.split('/').filter(Boolean);
  const def = repo.defaultBranch;
  if (seg.length === 0) return { kind: 'code', branch: def, path: '' };

  const [head, ...rest] = seg;
  const restStr = rest.join('/');

  if (head === 'tree' || head === 'blob') {
    const { branch, path } = splitBranchPath(restStr, repo);
    return head === 'tree'
      ? { kind: 'code', branch, path }
      : { kind: 'blob', branch, path };
  }
  if (head === 'commits') {
    const branch = rest.length ? splitBranchPath(restStr, repo).branch : def;
    return { kind: 'commits', branch };
  }
  if (head === 'commit') {
    return rest[0] ? { kind: 'commit', sha: rest[0] } : { kind: 'notfound' };
  }
  if (head === 'issues') {
    if (rest[0] === 'new') return { kind: 'issue-new' };
    if (rest[0] && /^\d+$/.test(rest[0])) return { kind: 'issue', number: Number(rest[0]) };
    return { kind: 'issues' };
  }
  if (head === 'pulls') {
    if (rest[0] && /^\d+$/.test(rest[0])) return { kind: 'pull', number: Number(rest[0]) };
    return { kind: 'pulls' };
  }
  if (head === 'compare') return { kind: 'pull-new' };
  return { kind: 'notfound' };
}

function splitBranchPath(
  s: string,
  repo: RemoteRepo,
): { branch: string; path: string } {
  const branches = listBranches(repo).sort((a, b) => b.length - a.length);
  for (const b of branches) {
    if (s === b) return { branch: b, path: '' };
    if (s.startsWith(b + '/')) return { branch: b, path: s.slice(b.length + 1) };
  }
  // 매칭 실패: 첫 세그먼트를 브랜치로 간주
  const i = s.indexOf('/');
  if (i === -1) return { branch: s, path: '' };
  return { branch: s.slice(0, i), path: s.slice(i + 1) };
}

// URL 빌더 (브랜치/경로를 안전하게 인코딩하지 않고 그대로 — 시드 데이터는 ASCII 경로)
export function codeUrl(owner: string, repo: string, branch: string, path = ''): string {
  const base = `/${owner}/${repo}/tree/${branch}`;
  return path ? `${base}/${path}` : base;
}
export function blobUrl(owner: string, repo: string, branch: string, path: string): string {
  return `/${owner}/${repo}/blob/${branch}/${path}`;
}
export function commitsUrl(owner: string, repo: string, branch: string): string {
  return `/${owner}/${repo}/commits/${branch}`;
}
export function commitUrl(owner: string, repo: string, sha: string): string {
  return `/${owner}/${repo}/commit/${sha}`;
}
export function issuesUrl(owner: string, repo: string): string {
  return `/${owner}/${repo}/issues`;
}
export function newIssueUrl(owner: string, repo: string): string {
  return `/${owner}/${repo}/issues/new`;
}
export function issueUrl(owner: string, repo: string, n: number): string {
  return `/${owner}/${repo}/issues/${n}`;
}
export function pullsUrl(owner: string, repo: string): string {
  return `/${owner}/${repo}/pulls`;
}
export function newPullUrl(owner: string, repo: string): string {
  return `/${owner}/${repo}/compare`;
}
export function pullUrl(owner: string, repo: string, n: number): string {
  return `/${owner}/${repo}/pulls/${n}`;
}
