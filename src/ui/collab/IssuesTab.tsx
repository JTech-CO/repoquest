// src/ui/collab/IssuesTab.tsx — 이슈 목록 + 필터 + New issue

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IssueOpenedIcon,
  IssueClosedIcon,
  CommentIcon,
} from '@primer/octicons-react';

import type { RemoteRepo } from '../../store/world';
import { issueUrl, newIssueUrl } from '../lib/repoRoute';
import { timeAgo } from '../lib/time';
import { LabelBadge } from './labels';

export default function IssuesTab({ repo }: { repo: RemoteRepo }) {
  const [filter, setFilter] = useState<'open' | 'closed'>('open');
  const openCount = repo.issues.filter((i) => i.state === 'open').length;
  const closedCount = repo.issues.filter((i) => i.state === 'closed').length;
  const items = repo.issues
    .filter((i) => i.state === filter)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => setFilter('open')}
            className={filter === 'open' ? 'font-semibold text-fg-default' : 'text-fg-muted'}
          >
            <IssueOpenedIcon size={14} className="inline mr-1" />
            Open {openCount}
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={filter === 'closed' ? 'font-semibold text-fg-default' : 'text-fg-muted'}
          >
            <IssueClosedIcon size={14} className="inline mr-1" />
            Closed {closedCount}
          </button>
        </div>
        <Link
          to={newIssueUrl(repo.owner, repo.name)}
          data-concept="issue"
          className="rounded bg-success-emphasis px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
        >
          New issue
        </Link>
      </div>

      <ul className="rounded border border-border-default divide-y divide-border-muted">
        {items.length === 0 ? (
          <li className="px-4 py-6 text-sm text-fg-muted">
            {filter === 'open' ? '열린' : '닫힌'} 이슈가 없습니다.
          </li>
        ) : (
          items.map((it) => (
            <li key={it.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5">
                {it.state === 'open' ? (
                  <IssueOpenedIcon size={16} className="text-success-fg" />
                ) : (
                  <IssueClosedIcon size={16} className="text-accent-fg" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  to={issueUrl(repo.owner, repo.name, it.number)}
                  className="text-fg-default font-medium hover:text-accent-fg"
                >
                  {it.title}
                </Link>
                {it.labels.map((l) => (
                  <span key={l} className="ml-2 align-middle">
                    <LabelBadge label={l} />
                  </span>
                ))}
                <p className="mt-0.5 text-xs text-fg-muted">
                  #{it.number} · {it.author} 님이 {timeAgo(it.createdAt)} 열었습니다
                </p>
              </div>
              {it.comments.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                  <CommentIcon size={14} /> {it.comments.length}
                </span>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
