// src/ui/work/RemotePane.tsx
//
// 워크스페이스 우측 = github.com(origin)의 현재 상태.
// 로컬에서 commit 해도 여기는 변하지 않는다(push 전까지). 그 사실을 ↑ahead 로 보여줘
// "commit ≠ push" 를 시각적으로 드러낸다.

import { Link } from 'react-router-dom';
import { ServerIcon, UploadIcon } from '@primer/octicons-react';

import { useWorld } from '../../store/world';
import { HEADS_PREFIX } from '../../engine/types';
import { aheadBehind, currentBranch } from '../../engine/refs';
import { shortSha } from '../lib/repoView';
import { timeAgo } from '../lib/time';
import Avatar from '../common/Avatar';

export default function RemotePane({ cloneId }: { cloneId: string }) {
  const clone = useWorld((s) => s.localClones[cloneId]);
  const repo = useWorld((s) =>
    clone ? s.remoteRepos[clone.remoteRepoId] : undefined,
  );
  if (!clone || !repo) return null;

  const branch = currentBranch(clone);
  const ab = branch ? aheadBehind(clone, branch) : { ahead: 0, behind: 0 };

  const branches = Object.keys(repo.refs)
    .filter((r) => r.startsWith(HEADS_PREFIX))
    .map((r) => r.slice(HEADS_PREFIX.length))
    .sort();

  return (
    <section className="rounded border border-border-default bg-canvas-overlay flex flex-col">
      <header className="flex items-center gap-2 px-4 py-2 border-b border-border-default bg-canvas-subtle">
        <ServerIcon size={16} className="text-fg-muted" />
        <span className="text-sm font-semibold text-fg-default">github.com</span>
        <span className="text-xs text-fg-subtle">origin · 서버</span>
        <Link
          to={`/${repo.owner}/${repo.name}`}
          className="ml-auto text-xs text-accent-fg hover:underline"
        >
          웹에서 보기 →
        </Link>
      </header>

      <div className="p-4 space-y-3">
        <div className="text-xs text-fg-muted">
          {repo.owner}/{repo.name}
        </div>

        {branch && ab.ahead > 0 && (
          <div className="rounded border border-attention-emphasis/40 bg-attention-subtle px-3 py-2 text-xs text-fg-default">
            <span className="inline-flex items-center gap-1 font-semibold text-attention-fg">
              <UploadIcon size={14} /> ↑{ab.ahead}
            </span>{' '}
            로컬에 origin/{branch} 보다 앞선 커밋이 {ab.ahead}개 있습니다. 아직 서버에는
            없습니다 — 위의 <strong>Push</strong> 버튼으로 origin 에 반영하세요.
          </div>
        )}

        <ul className="rounded border border-border-default divide-y divide-border-muted">
          {branches.map((b) => {
            const tip = repo.refs[HEADS_PREFIX + b];
            const c = repo.objects.commits[tip];
            return (
              <li key={b} className="px-3 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-canvas-subtle border border-border-muted px-1.5 text-fg-default">
                    {b}
                  </span>
                  {b === repo.defaultBranch && (
                    <span className="text-[10px] text-fg-subtle">default</span>
                  )}
                  <span className="ml-auto font-mono text-fg-muted">
                    {shortSha(tip)}
                  </span>
                </div>
                {c && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-fg-muted">
                    <Avatar seed={c.author} size={16} />
                    <span className="truncate">{c.message}</span>
                    <span className="ml-auto whitespace-nowrap">
                      {timeAgo(c.timestamp)}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
