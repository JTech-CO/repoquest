// src/ui/common/RepoCard.tsx
//
// 검색 결과·홈·프로필에서 재사용하는 저장소 카드.

import { Link } from 'react-router-dom';
import {
  RepoIcon,
  RepoForkedIcon,
  StarIcon,
  LockIcon,
} from '@primer/octicons-react';
import type { RemoteRepo } from '../../store/world';

export default function RepoCard({
  repo,
  forkOwnerLabel,
}: {
  repo: RemoteRepo;
  /** fork 원본 표시용(예: "forked from octocat/spoon-knife") */
  forkOwnerLabel?: string;
}) {
  return (
    <div className="rounded border border-border-default bg-canvas-subtle p-4">
      <div className="flex items-center gap-2">
        {repo.forkOf ? (
          <RepoForkedIcon size={16} className="text-fg-muted" />
        ) : (
          <RepoIcon size={16} className="text-fg-muted" />
        )}
        <Link
          to={`/${repo.owner}/${repo.name}`}
          className="text-accent-fg font-semibold hover:underline"
        >
          {repo.owner}/{repo.name}
        </Link>
        <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-border-default px-2 py-0.5 text-[11px] text-fg-muted">
          {repo.isPrivate ? (
            <>
              <LockIcon size={11} /> Private
            </>
          ) : (
            'Public'
          )}
        </span>
      </div>

      {forkOwnerLabel && (
        <p className="mt-1 text-xs text-fg-muted">forked from {forkOwnerLabel}</p>
      )}

      {repo.description && (
        <p className="mt-2 text-sm text-fg-muted">{repo.description}</p>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-1">
          <StarIcon size={14} /> {repo.stars.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1">
          <RepoForkedIcon size={14} /> {(repo.forks ?? 0).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
