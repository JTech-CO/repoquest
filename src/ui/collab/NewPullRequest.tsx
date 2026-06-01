// src/ui/collab/NewPullRequest.tsx
//
// PR 생성/비교. fork 저장소면 base=upstream(forkOf), compare=현재 fork 로 자동 설정한다.
// 두 브랜치의 차이(커밋/파일)를 미리 보여주고, 제목·본문을 적어 생성한다.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GitPullRequestIcon, ArrowLeftIcon } from '@primer/octicons-react';

import type { RemoteRepo } from '../../store/world';
import { useWorld } from '../../store/world';
import { createPullRequest } from '../../store/collabActions';
import { listBranches } from '../lib/repoView';
import { comparePr } from '../lib/prCompare';
import { pullUrl, pullsUrl } from '../lib/repoRoute';
import NotFound from '../pages/NotFound';

export default function NewPullRequest({ repo }: { repo: RemoteRepo }) {
  const navigate = useNavigate();
  const repos = useWorld((s) => s.remoteRepos);

  const isFork = Boolean(repo.forkOf);
  const baseRepo: RemoteRepo | undefined = isFork ? repos[repo.forkOf!] : repo;
  const headRepo = repo;

  const [baseBranch, setBaseBranch] = useState(baseRepo?.defaultBranch ?? 'main');
  const [headBranch, setHeadBranch] = useState(repo.defaultBranch);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  if (!baseRepo) {
    return <NotFound message="원본(upstream) 저장소를 찾을 수 없습니다." />;
  }

  const cmp = comparePr(headRepo, headBranch, baseRepo, baseBranch);
  const sameRepo = baseRepo.id === headRepo.id;
  const sameRef = sameRepo && baseBranch === headBranch;

  function submit() {
    const t = title.trim() || cmp.commits[0]?.message || `${headBranch} → ${baseBranch}`;
    const n = createPullRequest(baseRepo!.id, {
      title: t,
      body,
      sourceRepoId: headRepo.id,
      sourceBranch: headBranch,
      targetBranch: baseBranch,
    });
    navigate(pullUrl(baseRepo!.owner, baseRepo!.name, n));
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-fg-default mb-1">새 Pull Request</h1>
      <p className="text-sm text-fg-muted mb-4">
        <strong className="text-fg-default">base</strong>(합쳐질 쪽)와{' '}
        <strong className="text-fg-default">compare</strong>(변경한 쪽)를 고르세요.
      </p>

      <div className="flex flex-wrap items-center gap-2 rounded border border-border-default bg-canvas-subtle px-3 py-2 text-sm mb-4">
        <span className="text-fg-muted">base:</span>
        <span className="font-mono text-fg-default">{baseRepo.owner}/{baseRepo.name}</span>
        <select
          value={baseBranch}
          onChange={(e) => setBaseBranch(e.target.value)}
          className="bg-canvas-inset border border-border-default rounded px-2 py-1 text-fg-default"
        >
          {listBranches(baseRepo).map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <ArrowLeftIcon size={16} className="text-fg-muted mx-1" />

        <span className="text-fg-muted">compare:</span>
        <span className="font-mono text-fg-default">{headRepo.owner}/{headRepo.name}</span>
        <select
          value={headBranch}
          onChange={(e) => setHeadBranch(e.target.value)}
          className="bg-canvas-inset border border-border-default rounded px-2 py-1 text-fg-default"
        >
          {listBranches(headRepo).map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {isFork && (
        <p className="text-xs text-fg-muted mb-4">
          fork → upstream PR: <span className="font-mono">{headRepo.owner}:{headBranch}</span>{' '}
          의 변경을 <span className="font-mono">{baseRepo.owner}:{baseBranch}</span> 에 합치자고 제안합니다.
        </p>
      )}

      {sameRef ? (
        <p className="text-sm text-fg-muted">같은 브랜치입니다. base 와 compare 를 다르게 선택하세요.</p>
      ) : !cmp.hasChanges ? (
        <p className="text-sm text-fg-muted">두 브랜치에 차이가 없습니다 — 비교할 변경이 없습니다.</p>
      ) : (
        <>
          <div className="rounded border border-border-default bg-canvas-subtle px-3 py-2 text-xs text-fg-muted mb-4">
            <GitPullRequestIcon size={14} className="inline mr-1 text-success-fg" />
            커밋 <strong className="text-fg-default">{cmp.commits.length}</strong>개 · 파일{' '}
            <strong className="text-fg-default">{cmp.files.length}</strong>개 ·{' '}
            <span className="text-success-fg">+{cmp.additions}</span>{' '}
            <span className="text-danger-fg">-{cmp.deletions}</span>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={cmp.commits[0]?.message ?? 'PR 제목'}
            className="w-full bg-canvas-inset border border-border-default rounded px-3 py-2 text-fg-default outline-none focus:border-accent-emphasis mb-3"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="이 변경이 무엇이고 왜 필요한지 설명하세요 (마크다운 지원)"
            className="w-full h-32 resize-y bg-canvas-inset border border-border-default rounded px-3 py-2 text-fg-default font-mono text-sm outline-none focus:border-accent-emphasis mb-3"
          />
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={submit}
              className="rounded bg-success-emphasis px-4 py-1.5 text-sm font-semibold text-white hover:brightness-110"
            >
              Create pull request
            </button>
            <Link
              to={pullsUrl(repo.owner, repo.name)}
              className="text-sm text-fg-muted hover:text-fg-default"
            >
              취소
            </Link>
          </div>

          <ul className="rounded border border-border-default divide-y divide-border-muted text-xs">
            {cmp.commits.map((c) => (
              <li key={c.id} className="flex items-center gap-2 px-3 py-1.5">
                <span className="font-mono text-fg-muted">{c.id.slice(0, 7)}</span>
                <span className="text-fg-default truncate">{c.message}</span>
                <span className="ml-auto text-fg-subtle">{c.author}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
