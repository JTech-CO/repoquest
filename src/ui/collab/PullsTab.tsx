// src/ui/collab/PullsTab.tsx — PR 목록 + 필터 + New pull request

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GitPullRequestIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  CommentIcon,
} from '@primer/octicons-react';

import type { RemoteRepo, PullRequestState } from '../../store/world';
import { useWorld } from '../../store/world';
import { newPullUrl, pullUrl } from '../lib/repoRoute';
import { timeAgo } from '../lib/time';

export default function PullsTab({ repo }: { repo: RemoteRepo }) {
  const [filter, setFilter] = useState<'open' | 'closed'>('open');
  const repos = useWorld((s) => s.remoteRepos);

  const openCount = repo.pullRequests.filter((p) => p.state === 'open').length;
  const closedCount = repo.pullRequests.filter((p) => p.state !== 'open').length;
  const items = repo.pullRequests
    .filter((p) => (filter === 'open' ? p.state === 'open' : p.state !== 'open'))
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => setFilter('open')}
            className={filter === 'open' ? 'font-semibold text-fg-default' : 'text-fg-muted'}
          >
            <GitPullRequestIcon size={14} className="inline mr-1" />
            Open {openCount}
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={filter === 'closed' ? 'font-semibold text-fg-default' : 'text-fg-muted'}
          >
            Closed/Merged {closedCount}
          </button>
        </div>
        <Link
          to={newPullUrl(repo.owner, repo.name)}
          data-concept="pull-request"
          className="rounded bg-success-emphasis px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
        >
          New pull request
        </Link>
      </div>

      <ul className="rounded border border-border-default divide-y divide-border-muted">
        {items.length === 0 ? (
          <li className="px-4 py-6 text-sm text-fg-muted">
            {filter === 'open' ? '열린' : '닫히거나 머지된'} PR 이 없습니다.
          </li>
        ) : (
          items.map((pr) => {
            const sourceRepo = repos[pr.sourceRepoId];
            const headLabel = sourceRepo
              ? `${sourceRepo.owner}:${pr.sourceBranch}`
              : pr.sourceBranch;
            return (
              <li key={pr.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5">{stateIcon(pr.state)}</span>
                <div className="min-w-0 flex-1">
                  <Link
                    to={pullUrl(repo.owner, repo.name, pr.number)}
                    className="text-fg-default font-medium hover:text-accent-fg"
                  >
                    {pr.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    #{pr.number} · {pr.author} · {timeAgo(pr.createdAt)} ·{' '}
                    <span className="font-mono">
                      {headLabel} → {pr.targetBranch}
                    </span>{' '}
                    · {pr.state}
                  </p>
                </div>
                {pr.comments.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                    <CommentIcon size={14} /> {pr.comments.length}
                  </span>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function stateIcon(state: PullRequestState) {
  if (state === 'merged')
    return <GitMergeIcon size={16} className="text-accent-fg" />;
  if (state === 'closed')
    return <GitPullRequestClosedIcon size={16} className="text-danger-fg" />;
  return <GitPullRequestIcon size={16} className="text-success-fg" />;
}
