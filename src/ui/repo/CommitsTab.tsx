// src/ui/repo/CommitsTab.tsx
//
// 커밋 히스토리: 브랜치에서 도달 가능한 커밋을 최신순으로. 클릭하면 커밋 diff 로.

import { Link } from 'react-router-dom';

import type { RemoteRepo } from '../../store/world';
import { commitsOf, shortSha } from '../lib/repoView';
import { commitUrl } from '../lib/repoRoute';
import { timeAgo } from '../lib/time';
import Avatar from '../common/Avatar';

export default function CommitsTab({
  repo,
  branch,
}: {
  repo: RemoteRepo;
  branch: string;
}) {
  const commits = commitsOf(repo, branch);

  return (
    <div>
      <h2 className="text-sm text-fg-muted">
        커밋 히스토리 ·{' '}
        <span className="rounded bg-canvas-subtle border border-border-muted px-1.5 py-0.5 text-fg-default">
          {branch}
        </span>
      </h2>

      <ul className="mt-3 rounded border border-border-default divide-y divide-border-muted">
        {commits.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar seed={c.author} size={28} />
            <div className="min-w-0 flex-1">
              <Link
                to={commitUrl(repo.owner, repo.name, c.id)}
                className="block truncate font-semibold text-fg-default hover:text-accent-fg"
              >
                {c.message}
              </Link>
              <div className="text-xs text-fg-muted">
                <Link to={`/${c.author}`} className="hover:text-accent-fg">
                  {c.author}
                </Link>{' '}
                · {timeAgo(c.timestamp)}
                {c.parentIds.length >= 2 && (
                  <span className="ml-2 rounded bg-accent-subtle px-1.5 text-accent-fg">
                    머지 커밋
                  </span>
                )}
              </div>
            </div>
            <Link
              to={commitUrl(repo.owner, repo.name, c.id)}
              className="font-mono text-xs text-fg-muted hover:text-accent-fg"
            >
              {shortSha(c.id)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
