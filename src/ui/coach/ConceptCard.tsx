// src/ui/coach/ConceptCard.tsx — 개념 카드(무엇/언제/오해/명령) + 위치 뱃지

import { ArrowLeftIcon } from '@primer/octicons-react';

import { conceptsById, type Concept, type ConceptLocation } from '../../tutorial/concepts';
import { useCoach } from './coachStore';

const LOC: Record<ConceptLocation, { label: string; cls: string }> = {
  local: { label: '로컬', cls: 'border-accent-fg/40 text-accent-fg' },
  remote: { label: '서버', cls: 'border-success-fg/40 text-success-fg' },
  'local→remote': { label: '로컬 → 서버', cls: 'border-attention-fg/40 text-attention-fg' },
  'remote→local': { label: '서버 → 로컬', cls: 'border-attention-fg/40 text-attention-fg' },
};

export function LocationBadge({ location }: { location: ConceptLocation }) {
  const m = LOC[location];
  return (
    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${m.cls}`}>
      {m.label}
    </span>
  );
}

export default function ConceptCard({ concept }: { concept: Concept }) {
  const showConcept = useCoach((s) => s.showConcept);
  return (
    <div>
      <button
        onClick={() => showConcept(null)}
        className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg-default mb-3"
      >
        <ArrowLeftIcon size={14} /> 개념 목록
      </button>

      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold text-fg-default">{concept.title}</h2>
        <LocationBadge location={concept.location} />
      </div>

      <Section title="무엇인가요">
        <p>{concept.whatIsIt}</p>
      </Section>
      <Section title="언제 쓰나요">
        <p>{concept.whenToUse}</p>
      </Section>
      <Section title="흔한 오해">
        <ul className="list-disc pl-4 space-y-1">
          {concept.pitfalls.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </Section>
      {concept.relatedCmd && (
        <Section title="관련 명령">
          <code className="block rounded bg-canvas-inset px-2 py-1 font-mono text-xs text-fg-default">
            {concept.relatedCmd}
          </code>
        </Section>
      )}
      {concept.seeAlso && concept.seeAlso.length > 0 && (
        <Section title="관련 개념">
          <div className="flex flex-wrap gap-1.5">
            {concept.seeAlso.map((id) => {
              const c = conceptsById[id];
              if (!c) return null;
              return (
                <button
                  key={id}
                  onClick={() => showConcept(id)}
                  className="rounded border border-border-default px-2 py-0.5 text-xs text-accent-fg hover:bg-canvas-subtle"
                >
                  {c.title}
                </button>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1">
        {title}
      </h3>
      <div className="text-sm text-fg-default leading-relaxed">{children}</div>
    </div>
  );
}
