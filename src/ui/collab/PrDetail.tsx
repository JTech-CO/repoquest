// src/ui/collab/PrDetail.tsx
//
// PR 상세: Conversation / Commits / Files changed 탭 + 머지(ff/merge commit/squash).
// 충돌이면 머지하지 않고 "로컬에서 pull 로 해결 후 push" 를 안내한다.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GitPullRequestIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
} from '@primer/octicons-react';

import type { RemoteRepo } from '../../store/world';
import { useWorld } from '../../store/world';
import { addPrComment, closePullRequest, mergePr } from '../../store/collabActions';
import { canFastForward, type MergeStrategy } from '../../github/mergePr';
import { comparePr } from '../lib/prCompare';
import { shortSha } from '../lib/repoView';
import { timeAgo } from '../lib/time';
import Avatar from '../common/Avatar';
import FileDiffList from '../common/FileDiffList';
import { CommentBox, CommentList, TimelineItem } from './Timeline';
import NotFound from '../pages/NotFound';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

type DetailTab = 'conversation' | 'commits' | 'files';

export default function PrDetail({
  repo,
  number,
}: {
  repo: RemoteRepo;
  number: number;
}) {
  const repos = useWorld((s) => s.remoteRepos);
  const pr = repo.pullRequests.find((p) => p.number === number);
  const [tab, setTab] = useState<DetailTab>('conversation');
  const [strategy, setStrategy] = useState<MergeStrategy>('merge');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  if (!pr) return <NotFound message={`PR #${number} 를 찾을 수 없습니다.`} />;

  const sourceRepo = repos[pr.sourceRepoId];
  const cmp = sourceRepo
    ? comparePr(sourceRepo, pr.sourceBranch, repo, pr.targetBranch)
    : { commits: [], files: [], additions: 0, deletions: 0, hasChanges: false };
  const open = pr.state === 'open';
  const ffOk =
    sourceRepo && open
      ? canFastForward(repo, sourceRepo, pr.sourceBranch, pr.targetBranch)
      : false;

  const headLabel = sourceRepo
    ? `${sourceRepo.owner}:${pr.sourceBranch}`
    : pr.sourceBranch;

  function doMerge() {
    try {
      const r = mergePr(repo.id, pr!.id, strategy);
      if (r.status === 'conflict') {
        setMsg({
          kind: 'err',
          text: `머지 충돌: ${r.conflicts.join(', ')} — 서버에서 자동 머지할 수 없습니다. 로컬에서 pull 로 해결한 뒤 다시 push 하세요.`,
        });
      } else {
        setMsg({ kind: 'ok', text: `머지 완료 (${r.status}).` });
      }
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e) });
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl text-fg-default">
        {pr.title} <span className="text-fg-muted font-normal">#{pr.number}</span>
      </h1>

      <div className="flex flex-wrap items-center gap-2 mt-2 mb-4">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold text-white ${
            pr.state === 'merged'
              ? 'bg-accent-emphasis'
              : pr.state === 'closed'
                ? 'bg-danger-emphasis'
                : 'bg-success-emphasis'
          }`}
        >
          {pr.state === 'merged' ? (
            <GitMergeIcon size={14} />
          ) : pr.state === 'closed' ? (
            <GitPullRequestClosedIcon size={14} />
          ) : (
            <GitPullRequestIcon size={14} />
          )}
          {pr.state === 'merged' ? 'Merged' : pr.state === 'closed' ? 'Closed' : 'Open'}
        </span>
        <span className="text-sm text-fg-muted">
          {pr.author} 님이{' '}
          <span className="font-mono">{headLabel}</span> →{' '}
          <span className="font-mono">{pr.targetBranch}</span> 병합을 제안했습니다
        </span>
      </div>

      {/* 탭 */}
      <nav className="flex items-center gap-1 border-b border-border-default mb-4 text-sm">
        <TabBtn active={tab === 'conversation'} onClick={() => setTab('conversation')} label="Conversation" />
        <TabBtn active={tab === 'commits'} onClick={() => setTab('commits')} label={`Commits ${cmp.commits.length}`} />
        <TabBtn active={tab === 'files'} onClick={() => setTab('files')} label={`Files changed ${cmp.files.length}`} />
      </nav>

      {tab === 'conversation' && (
        <div className="space-y-3">
          <TimelineItem author={pr.author} body={pr.body} createdAt={pr.createdAt} badge="작성자" />
          <CommentList comments={pr.comments} />

          {open ? (
            <>
              <CommentBox
                onSubmit={(b) => addPrComment(repo.id, pr.id, b)}
                extra={
                  <button
                    onClick={() => closePullRequest(repo.id, pr.id)}
                    className="rounded border border-border-default px-3 py-1.5 text-sm text-fg-default hover:bg-canvas-subtle"
                  >
                    PR 닫기
                  </button>
                }
              />

              {/* 머지 박스 */}
              <div className="rounded border border-success-fg/30 bg-canvas-subtle p-3">
                <div className="flex items-center gap-2 text-sm text-fg-default mb-2">
                  <GitMergeIcon size={16} className="text-success-fg" />
                  이 Pull Request 를 병합
                </div>
                {!cmp.hasChanges ? (
                  <p className="text-xs text-fg-muted">변경이 없어 머지할 내용이 없습니다.</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value as MergeStrategy)}
                      className="bg-canvas-inset border border-border-default rounded px-2 py-1 text-sm text-fg-default"
                    >
                      <option value="merge">Create a merge commit</option>
                      <option value="squash">Squash and merge</option>
                      <option value="ff" disabled={!ffOk}>
                        Fast-forward{ffOk ? '' : ' (불가: 이력이 갈라짐)'}
                      </option>
                    </select>
                    <button
                      onClick={doMerge}
                      className="rounded bg-success-emphasis px-4 py-1.5 text-sm font-semibold text-white hover:brightness-110"
                    >
                      Merge pull request
                    </button>
                    <span className="text-[11px] text-fg-subtle">
                      {strategy === 'merge' && '부모 2개짜리 머지 커밋을 만듭니다.'}
                      {strategy === 'squash' && '변경을 단일 커밋으로 합칩니다.'}
                      {strategy === 'ff' && '새 커밋 없이 포인터만 이동합니다.'}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-fg-muted">
              이 PR 은 {pr.state === 'merged' ? '병합되었습니다.' : '닫혔습니다.'}
            </p>
          )}

          {msg && (
            <div
              className={`text-xs ${msg.kind === 'ok' ? 'text-success-fg' : 'text-danger-fg'}`}
            >
              {msg.text}
            </div>
          )}
        </div>
      )}

      {tab === 'commits' && (
        <ul className="rounded border border-border-default divide-y divide-border-muted">
          {cmp.commits.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-2 text-sm">
              <Avatar seed={c.author} size={20} />
              <span className="text-fg-default truncate flex-1">{c.message}</span>
              <span className="font-mono text-xs text-fg-muted">{shortSha(c.id)}</span>
              <span className="text-xs text-fg-subtle">{timeAgo(c.timestamp)}</span>
            </li>
          ))}
        </ul>
      )}

      {tab === 'files' && (
        <div>
          <div className="text-xs text-fg-muted mb-3">
            <span className="text-success-fg">+{cmp.additions}</span>{' '}
            <span className="text-danger-fg">-{cmp.deletions}</span> · {cmp.files.length} files
          </div>
          <FileDiffList files={cmp.files} />
        </div>
      )}

      <div className="mt-4 text-xs">
        <Link to={`/${repo.owner}/${repo.name}/pulls`} className="text-accent-fg hover:underline">
          ← 모든 PR
        </Link>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 ${
        active
          ? 'border-attention-emphasis text-fg-default font-semibold'
          : 'border-transparent text-fg-muted hover:text-fg-default'
      }`}
    >
      {label}
    </button>
  );
}
