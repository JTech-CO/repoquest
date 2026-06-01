// src/ui/work/MergeControl.tsx
//
// 로컬 브랜치 머지(engine mergeBranch). 같은 파일 같은 줄을 양쪽이 다르게 고쳤으면
// 충돌이 나고, 작업본에 충돌 마커가 들어간다(미션 8). 충돌은 사람이 해소 후 다시 커밋한다.

import { useState } from 'react';
import { GitMergeIcon } from '@primer/octicons-react';

import { useWorld } from '../../store/world';
import { currentBranch, listLocalBranches } from '../../engine/refs';
import { TutorialEvents } from '../../tutorial/missions';
import { useTerminal } from './terminalStore';

export default function MergeControl({ cloneId }: { cloneId: string }) {
  const clone = useWorld((s) => s.localClones[cloneId]);
  const merge = useWorld((s) => s.actions.merge);
  const recordEvent = useWorld((s) => s.actions.recordEvent);
  const [src, setSrc] = useState('');

  if (!clone || clone.mergeState) return null; // 머지 충돌 중엔 배너가 안내하므로 숨김
  const cur = currentBranch(clone);
  const others = listLocalBranches(clone).filter((b) => b !== cur);
  if (!cur || others.length === 0) return null;

  const chosen = src || others[0];

  function doMerge() {
    const r = merge(cloneId, chosen);
    if (r.outcome === 'conflict') {
      recordEvent(TutorialEvents.ConflictEncountered);
      useTerminal
        .getState()
        .fail(
          `git merge ${chosen}`,
          `충돌: ${r.conflicts.join(', ')} — 파일에서 <<<<<<< ======= >>>>>>> 마커를 정리하고 add → commit 하세요.`,
        );
    } else {
      useTerminal
        .getState()
        .run(`git merge ${chosen}`, `머지 결과: ${r.outcome}`);
    }
  }

  return (
    <div className="px-3 py-2 border-b border-border-muted flex flex-wrap items-center gap-2 text-sm">
      <GitMergeIcon size={14} className="text-fg-muted" />
      <select
        value={chosen}
        onChange={(e) => setSrc(e.target.value)}
        className="bg-canvas-subtle border border-border-default rounded px-2 py-0.5 text-xs text-fg-default"
      >
        {others.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <span className="text-xs text-fg-muted">
        → <span className="text-fg-default font-semibold">{cur}</span> 에 머지
      </span>
      <button
        onClick={doMerge}
        data-concept="merge"
        className="rounded border border-border-default px-2 py-0.5 text-xs text-fg-default hover:bg-canvas-subtle"
      >
        Merge
      </button>
    </div>
  );
}
