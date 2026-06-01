// src/ui/collab/labels.tsx — 이슈/PR 라벨 뱃지(색 매핑)

const LABEL_CLASS: Record<string, string> = {
  bug: 'border-danger-fg/40 text-danger-fg',
  enhancement: 'border-accent-fg/40 text-accent-fg',
  question: 'border-attention-fg/40 text-attention-fg',
  documentation: 'border-accent-fg/40 text-accent-fg',
  'good first issue': 'border-success-fg/40 text-success-fg',
};

export const ALL_LABELS = [
  'bug',
  'enhancement',
  'question',
  'documentation',
  'good first issue',
];

export function LabelBadge({ label }: { label: string }) {
  const cls = LABEL_CLASS[label] ?? 'border-border-default text-fg-muted';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${cls}`}>
      {label}
    </span>
  );
}
