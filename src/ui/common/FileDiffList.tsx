// src/ui/common/FileDiffList.tsx
//
// 파일별 diff 렌더(초록 +/빨강 -). 커밋 상세·PR Files changed 탭 공용.

import type { FileDiff } from '../lib/repoView';

const STATUS_META: Record<FileDiff['status'], { label: string; cls: string }> = {
  added: { label: 'added', cls: 'text-success-fg' },
  modified: { label: 'modified', cls: 'text-attention-fg' },
  deleted: { label: 'deleted', cls: 'text-danger-fg' },
};

export default function FileDiffList({ files }: { files: FileDiff[] }) {
  if (files.length === 0) {
    return <p className="text-sm text-fg-muted">변경된 파일이 없습니다.</p>;
  }
  return (
    <div className="space-y-4">
      {files.map((f) => (
        <FileDiffView key={f.path} f={f} />
      ))}
    </div>
  );
}

function FileDiffView({ f }: { f: FileDiff }) {
  const meta = STATUS_META[f.status];
  return (
    <div className="rounded border border-border-default overflow-hidden">
      <div className="flex items-center gap-2 bg-canvas-subtle px-4 py-2 text-sm border-b border-border-default">
        <span className={`text-xs uppercase tracking-wide ${meta.cls}`}>
          {meta.label}
        </span>
        <span className="font-mono text-fg-default">{f.path}</span>
        <span className="ml-auto text-xs">
          <span className="text-success-fg">+{f.additions}</span>{' '}
          <span className="text-danger-fg">-{f.deletions}</span>
        </span>
      </div>
      <div className="font-mono text-[13px] leading-5 overflow-x-auto">
        {f.ops.map((op, i) => (
          <div
            key={i}
            className={
              op.type === 'add'
                ? 'bg-success-subtle'
                : op.type === 'del'
                  ? 'bg-danger-subtle'
                  : ''
            }
          >
            <span className="select-none inline-block w-6 text-center text-fg-subtle">
              {op.type === 'add' ? '+' : op.type === 'del' ? '-' : ' '}
            </span>
            <span className="whitespace-pre text-fg-default">{op.line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
