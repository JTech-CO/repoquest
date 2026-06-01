// src/ui/layout/LocalStatusBar.tsx
//
// "데이터가 어디에 있는지 항상 눈에 보인다"는 SPEC §1 원칙을 상단 바로 축약.
// 로컬(내 컴퓨터)에 clone 한 저장소가 있으면 브랜치와 ↑ahead/↓behind 를 보여주고,
// 없으면 "아직 clone 안 함"을 명시해 commit≠push, fork≠clone 의 경계를 환기한다.

import { DeviceDesktopIcon } from '@primer/octicons-react';

import { useWorld } from '../../store/world';
import { aheadBehind, currentBranch } from '../../engine/refs';

export default function LocalStatusBar() {
  const clones = useWorld((s) => s.localClones);
  const repos = useWorld((s) => s.remoteRepos);
  const list = Object.values(clones);

  return (
    <div className="bg-canvas-inset border-b border-border-default">
      <div className="mx-auto max-w-[1280px] px-4 py-1.5 flex items-center gap-2 text-xs">
        <DeviceDesktopIcon size={14} className="text-fg-muted" />
        <span className="font-semibold text-fg-default">내 컴퓨터</span>
        <span className="text-fg-subtle">로컬</span>

        {list.length === 0 ? (
          <span className="ml-2 text-fg-muted">
            아직 clone 한 저장소가 없습니다 — github.com 을 둘러본 뒤 fork·clone 해보세요.
          </span>
        ) : (
          <div className="ml-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {list.map((c) => {
              const repo = repos[c.remoteRepoId];
              const branch = currentBranch(c);
              const ab = branch ? aheadBehind(c, branch) : { ahead: 0, behind: 0 };
              return (
                <span key={c.id} className="inline-flex items-center gap-1.5">
                  <span className="text-fg-default">
                    {repo ? `${repo.owner}/${repo.name}` : c.id}
                  </span>
                  {branch ? (
                    <span className="rounded bg-canvas-subtle border border-border-muted px-1 text-fg-muted">
                      {branch}
                    </span>
                  ) : (
                    <span className="text-attention-fg">detached</span>
                  )}
                  {ab.ahead > 0 && <span className="text-success-fg">↑{ab.ahead}</span>}
                  {ab.behind > 0 && <span className="text-attention-fg">↓{ab.behind}</span>}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
