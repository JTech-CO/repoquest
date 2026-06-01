// src/ui/work/BranchControls.tsx
//
// 브랜치 생성·전환. 커밋하지 않은 변경이 있으면 switch 가 막히는 것(DirtyWorkingTreeError),
// 커밋 해시로 이동하면 detached HEAD 가 되는 것을 그대로 체험하게 한다.

import { useState } from 'react';
import { GitBranchIcon, AlertIcon } from '@primer/octicons-react';

import { useWorld } from '../../store/world';
import { currentBranch, listLocalBranches } from '../../engine/refs';
import { useTerminal } from './terminalStore';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function BranchControls({ cloneId }: { cloneId: string }) {
  const clone = useWorld((s) => s.localClones[cloneId]);
  const createBranch = useWorld((s) => s.actions.createBranch);
  const switchTo = useWorld((s) => s.actions.switchTo);
  const [name, setName] = useState('');

  if (!clone) return null;
  const branches = listLocalBranches(clone);
  const cur = currentBranch(clone);
  const detached = clone.head.type === 'detached';

  function create() {
    const n = name.trim();
    if (!n) return;
    try {
      createBranch(cloneId, n, true);
      useTerminal.getState().run(`git switch -c ${n}`, '새 브랜치 생성 후 전환');
      setName('');
    } catch (e) {
      useTerminal.getState().fail(`git switch -c ${name}`, errMsg(e));
    }
  }

  function doSwitch(b: string) {
    if (b === cur) return;
    try {
      switchTo(cloneId, b);
      useTerminal
        .getState()
        .run(`git switch ${b}`, '브랜치 전환 — 작업본이 그 브랜치 스냅샷으로 바뀜');
    } catch (e) {
      useTerminal.getState().fail(`git switch ${b}`, errMsg(e));
    }
  }

  return (
    <div className="px-3 py-2 border-b border-border-muted space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <GitBranchIcon size={14} className="text-fg-muted" />
        {branches.map((b) => (
          <button
            key={b}
            onClick={() => doSwitch(b)}
            className={`rounded border px-2 py-0.5 text-xs ${
              b === cur
                ? 'border-accent-emphasis bg-accent-subtle text-fg-default font-semibold'
                : 'border-border-default text-fg-muted hover:bg-canvas-subtle'
            }`}
          >
            {b}
          </button>
        ))}
        <div className="flex items-center gap-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder="새 브랜치"
            className="w-28 bg-canvas-subtle border border-border-default rounded text-xs px-2 py-0.5 text-fg-default outline-none"
          />
          <button
            onClick={create}
            data-concept="branch"
            className="rounded border border-border-default px-2 py-0.5 text-xs text-fg-default hover:bg-canvas-subtle"
          >
            + 생성
          </button>
        </div>
      </div>

      {detached && (
        <div className="flex items-start gap-1.5 rounded bg-attention-subtle px-2 py-1 text-[11px] text-fg-default">
          <AlertIcon size={12} className="mt-0.5 text-attention-fg" />
          <span>
            detached HEAD 상태입니다. 지금 만든 커밋은 어느 브랜치에도 속하지 않아요.
            남기려면 새 브랜치를 만들어 전환하세요.
          </span>
        </div>
      )}
    </div>
  );
}
