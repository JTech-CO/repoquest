// src/ui/work/ThreeTrees.tsx
//
// 세 트리(Three Trees) 시각화 — 입문자가 가장 어려워하는 부분.
//   작업 디렉터리(편집 중) ──git add──▶ 스테이징(다음 커밋 후보) ──git commit──▶ HEAD(마지막 커밋)
// 변경 파일이 어느 영역에 있는지 컬럼으로 보여주고, add 로 작업본→스테이징 이동을 직접 누르게 한다.

import { ArrowRightIcon, FileIcon, PlusIcon } from '@primer/octicons-react';

import { useWorld } from '../../store/world';
import { status } from '../../engine/commands';
import { headCommitId } from '../../engine/refs';
import { snapshotOf } from '../../engine/objects';
import { useTerminal } from './terminalStore';

type ChangeKind = 'A' | 'M' | 'D';
interface Change {
  path: string;
  kind: ChangeKind;
}

const KIND_COLOR: Record<ChangeKind, string> = {
  A: 'text-success-fg',
  M: 'text-attention-fg',
  D: 'text-danger-fg',
};

function toChanges(diff: { added: string[]; modified: string[]; deleted: string[] }): Change[] {
  return [
    ...diff.added.map((path) => ({ path, kind: 'A' as const })),
    ...diff.modified.map((path) => ({ path, kind: 'M' as const })),
    ...diff.deleted.map((path) => ({ path, kind: 'D' as const })),
  ].sort((a, b) => a.path.localeCompare(b.path));
}

export default function ThreeTrees({
  cloneId,
  onSelectFile,
  selectedPath,
}: {
  cloneId: string;
  onSelectFile?: (path: string) => void;
  selectedPath?: string;
}) {
  const clone = useWorld((s) => s.localClones[cloneId]);
  const stage = useWorld((s) => s.actions.stage);
  if (!clone) return null;

  const st = status(clone);
  const working = toChanges(st.unstaged);
  const staged = toChanges(st.staged);
  const headFiles = Object.keys(snapshotOf(clone.objects, headCommitId(clone))).sort();

  function addOne(path: string) {
    stage(cloneId, [path]);
    useTerminal.getState().run(`git add ${path}`, '작업 디렉터리의 변경을 스테이징으로 이동');
  }
  function addAll() {
    stage(cloneId);
    useTerminal.getState().run('git add .', '모든 변경을 스테이징으로 이동');
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-2">
      {/* 작업 디렉터리 */}
      <TreeColumn
        title="작업 디렉터리"
        subtitle="편집 중 (Working)"
        count={working.length}
        action={
          working.length > 0 ? (
            <button
              onClick={addAll}
              data-concept="staging"
              className="text-[11px] rounded border border-border-default px-1.5 py-0.5 text-fg-muted hover:bg-canvas-subtle"
            >
              + 전체 Add
            </button>
          ) : null
        }
      >
        {working.length === 0 ? (
          <Empty>변경 없음</Empty>
        ) : (
          working.map((c) => (
            <FileRow
              key={c.path}
              change={c}
              active={c.path === selectedPath}
              onClick={() => onSelectFile?.(c.path)}
              trailing={
                <button
                  title="git add"
                  onClick={(e) => {
                    e.stopPropagation();
                    addOne(c.path);
                  }}
                  className="text-fg-muted hover:text-success-fg"
                >
                  <PlusIcon size={14} />
                </button>
              }
            />
          ))
        )}
      </TreeColumn>

      <Connector label="git add" />

      {/* 스테이징 */}
      <TreeColumn title="스테이징" subtitle="커밋 후보 (Index)" count={staged.length}>
        {staged.length === 0 ? (
          <Empty>비어 있음</Empty>
        ) : (
          staged.map((c) => (
            <FileRow
              key={c.path}
              change={c}
              active={c.path === selectedPath}
              onClick={() => onSelectFile?.(c.path)}
            />
          ))
        )}
      </TreeColumn>

      <Connector label="git commit" />

      {/* HEAD */}
      <TreeColumn
        title="HEAD"
        subtitle="마지막 커밋"
        count={headFiles.length}
      >
        {headFiles.length === 0 ? (
          <Empty>아직 커밋 없음</Empty>
        ) : (
          headFiles.map((p) => (
            <div
              key={p}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-fg-muted"
            >
              <FileIcon size={12} />
              <span className="truncate">{p}</span>
            </div>
          ))
        )}
      </TreeColumn>
    </div>
  );
}

function TreeColumn({
  title,
  subtitle,
  count,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-border-default bg-canvas-default flex flex-col min-w-0">
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-border-muted">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-fg-default truncate">
            {title} <span className="text-fg-subtle">({count})</span>
          </div>
          <div className="text-[10px] text-fg-subtle">{subtitle}</div>
        </div>
        {action}
      </div>
      <div className="flex-1 overflow-auto max-h-48 py-1">{children}</div>
    </div>
  );
}

function FileRow({
  change,
  active,
  onClick,
  trailing,
}: {
  change: Change;
  active?: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer hover:bg-canvas-subtle ${
        active ? 'bg-canvas-subtle' : ''
      }`}
    >
      <span className={`font-mono font-bold ${KIND_COLOR[change.kind]}`}>
        {change.kind}
      </span>
      <span className="truncate text-fg-default flex-1">{change.path}</span>
      {trailing}
    </div>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <div className="hidden md:flex flex-col items-center justify-center px-1 text-fg-subtle">
      <ArrowRightIcon size={16} />
      <span className="mt-1 text-[10px] font-mono whitespace-nowrap">{label}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-2 py-3 text-xs text-fg-subtle">{children}</div>;
}
