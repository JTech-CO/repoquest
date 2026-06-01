// src/ui/work/MiniTerminal.tsx
//
// 버튼↔명령 미러링 표시. 버튼을 누를 때마다 대응하는 git 명령이 여기 쌓인다.
// "버튼 = 이 명령" 매핑을 눈으로 익히게 한다(SPEC §7.1).

import { TerminalIcon } from '@primer/octicons-react';

import { useTerminal } from './terminalStore';

export default function MiniTerminal() {
  const lines = useTerminal((s) => s.lines);
  const clear = useTerminal((s) => s.clear);

  return (
    <div className="rounded border border-border-default bg-canvas-inset">
      <header className="flex items-center gap-2 px-3 py-1.5 border-b border-border-muted">
        <TerminalIcon size={14} className="text-fg-muted" />
        <span className="text-xs font-semibold text-fg-default">
          터미널 <span className="text-fg-subtle">버튼 = 이 명령</span>
        </span>
        {lines.length > 0 && (
          <button
            onClick={clear}
            className="ml-auto text-[11px] text-fg-muted hover:text-fg-default"
          >
            clear
          </button>
        )}
      </header>
      <div className="p-3 space-y-1.5 max-h-44 overflow-auto font-mono text-xs">
        {lines.length === 0 ? (
          <div className="text-fg-subtle">
            버튼(Add·Commit·Branch 등)을 누르면 대응하는 git 명령이 여기에 표시됩니다.
          </div>
        ) : (
          lines.map((l) => (
            <div key={l.id}>
              <div className={l.error ? 'text-danger-fg' : 'text-fg-default'}>
                <span className="text-fg-subtle select-none">
                  {l.cmd.startsWith('#') ? '' : '$ '}
                </span>
                {l.cmd}
              </div>
              {l.note && <div className="pl-3 text-fg-subtle">{l.note}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
