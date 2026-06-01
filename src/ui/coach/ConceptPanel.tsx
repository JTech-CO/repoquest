// src/ui/coach/ConceptPanel.tsx — 개념 사전(목록) ↔ 개념 카드

import { useCoach } from './coachStore';
import { concepts, conceptsById } from '../../tutorial/concepts';
import ConceptCard, { LocationBadge } from './ConceptCard';

export default function ConceptPanel() {
  const conceptId = useCoach((s) => s.conceptId);
  const showConcept = useCoach((s) => s.showConcept);
  const concept = conceptId ? conceptsById[conceptId] : null;

  if (concept) return <ConceptCard concept={concept} />;

  return (
    <div>
      <p className="text-xs text-fg-muted mb-3">
        개념을 클릭하면 자세한 설명을 봅니다. 앱 곳곳의 버튼·요소에 마우스를 올리면 관련 개념이
        여기에 자동으로 표시됩니다.
      </p>
      <ul className="space-y-1">
        {concepts.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => showConcept(c.id)}
              className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-fg-default hover:bg-canvas-subtle"
            >
              <LocationBadge location={c.location} />
              <span>{c.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
