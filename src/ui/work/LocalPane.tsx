// src/ui/work/LocalPane.tsx
//
// 워크스페이스 좌측 = 내 컴퓨터(로컬). 브랜치 + 세 트리 + 커밋 + 편집기 + 미니 터미널을 조합한다.
// 커밋해도 origin(우측)은 그대로다 — commit ≠ push 를 ↑ahead 배지로 드러낸다.

import { useState } from 'react';
import { DeviceDesktopIcon } from '@primer/octicons-react';

import { useWorld } from '../../store/world';
import { aheadBehind, currentBranch } from '../../engine/refs';
import { status } from '../../engine/commands';
import { TutorialEvents } from '../../tutorial/missions';
import { useTerminal } from './terminalStore';
import ThreeTrees from './ThreeTrees';
import FileEditor from './FileEditor';
import BranchControls from './BranchControls';
import MergeControl from './MergeControl';
import MiniTerminal from './MiniTerminal';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function LocalPane({ cloneId }: { cloneId: string }) {
  const clone = useWorld((s) => s.localClones[cloneId]);
  const commit = useWorld((s) => s.actions.commit);
  const recordEvent = useWorld((s) => s.actions.recordEvent);
  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const [msg, setMsg] = useState('');

  if (!clone) return null;

  const branch = currentBranch(clone);
  const ab = branch ? aheadBehind(clone, branch) : { ahead: 0, behind: 0 };
  const st = status(clone);
  const stagedCount =
    st.staged.added.length + st.staged.modified.length + st.staged.deleted.length;
  const canCommit = stagedCount > 0 || st.merging;

  function doCommit() {
    const wasResolvingConflict = Boolean(clone?.mergeState);
    const m = msg.trim() || (st.merging ? clone?.mergeState?.message ?? '' : '');
    if (!m) {
      useTerminal.getState().fail('git commit', '커밋 메시지를 입력하세요.');
      return;
    }
    try {
      commit(cloneId, m);
      useTerminal
        .getState()
        .run(
          `git commit -m "${m}"`,
          wasResolvingConflict
            ? '충돌을 해소하고 머지를 마무리하는 커밋(부모 2개). 머지 완료!'
            : '스테이징을 스냅샷으로 봉인(로컬). 서버(origin)에는 아직 반영되지 않습니다.',
        );
      if (wasResolvingConflict) recordEvent(TutorialEvents.ConflictResolved);
      setMsg('');
    } catch (e) {
      useTerminal.getState().fail('git commit', errMsg(e));
    }
  }

  return (
    <section className="rounded border border-border-default bg-canvas-overlay flex flex-col">
      <header className="flex items-center gap-2 px-4 py-2 border-b border-border-default bg-canvas-subtle">
        <DeviceDesktopIcon size={16} className="text-fg-muted" />
        <span className="text-sm font-semibold text-fg-default">내 컴퓨터</span>
        <span className="text-xs text-fg-subtle">로컬</span>
        {branch ? (
          <span className="rounded bg-canvas-inset border border-border-muted px-1.5 text-xs text-fg-default">
            {branch}
          </span>
        ) : (
          <span className="text-xs text-attention-fg">detached HEAD</span>
        )}
        {ab.ahead > 0 && <span className="text-xs text-success-fg">↑{ab.ahead}</span>}
        {ab.behind > 0 && <span className="text-xs text-attention-fg">↓{ab.behind}</span>}
      </header>

      {clone.mergeState && (
        <div className="px-3 py-2 bg-danger-subtle border-b border-danger-fg/30 text-xs text-fg-default">
          <strong className="text-danger-fg">머지 충돌 중</strong> ·{' '}
          <span className="font-mono">{clone.mergeState.conflicts.join(', ')}</span> — 각 파일에서
          {' '}<code>{'<<<<<<<'} ======= {'>>>>>>>'}</code> 마커를 정리하고 Add → Commit 하면 머지가 완료됩니다.
        </div>
      )}

      <BranchControls cloneId={cloneId} />
      <MergeControl cloneId={cloneId} />

      <div className="p-3 space-y-3">
        <ThreeTrees
          cloneId={cloneId}
          selectedPath={selectedPath}
          onSelectFile={setSelectedPath}
        />

        <div className="rounded border border-border-default bg-canvas-default p-3">
          <div className="flex items-center gap-2">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canCommit && doCommit()}
              placeholder={
                st.merging
                  ? clone.mergeState?.message ?? '머지 커밋 메시지'
                  : '커밋 메시지'
              }
              className="flex-1 bg-canvas-inset border border-border-default rounded text-sm px-2 py-1.5 text-fg-default outline-none focus:border-accent-emphasis"
            />
            <button
              onClick={doCommit}
              disabled={!canCommit}
              data-concept="commit"
              title={canCommit ? '스테이징을 커밋' : '스테이징된 변경이 없습니다'}
              className="rounded bg-success-emphasis px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Commit
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-fg-subtle">
            {canCommit
              ? `스테이징된 ${stagedCount}개 변경을 커밋합니다. (로컬에만 기록 — 위 SyncBar의 Push로 서버 반영)`
              : 'add 로 스테이징한 변경이 있어야 커밋할 수 있습니다.'}
          </p>
        </div>

        <FileEditor
          cloneId={cloneId}
          selectedPath={selectedPath}
          onSelectFile={setSelectedPath}
        />

        <MiniTerminal />
      </div>
    </section>
  );
}
