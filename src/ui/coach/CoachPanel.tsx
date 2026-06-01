// src/ui/coach/CoachPanel.tsx — 우측 슬라이드 코칭 패널(미션/개념 탭)

import { XIcon } from '@primer/octicons-react';

import { useCoach } from './coachStore';
import { useConceptHover } from './useConceptHover';
import MissionPanel from './MissionPanel';
import ConceptPanel from './ConceptPanel';

export default function CoachPanel() {
  const open = useCoach((s) => s.open);
  const tab = useCoach((s) => s.tab);
  const close = useCoach((s) => s.close);
  const setTab = useCoach((s) => s.setTab);

  useConceptHover();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={close}
          aria-hidden
        />
      )}
      <aside
        className={`fixed right-0 top-0 bottom-0 w-[400px] max-w-[92vw] bg-canvas-overlay border-l border-border-default z-40 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <header className="flex items-center gap-1 px-3 py-2 border-b border-border-default">
          <PanelTab active={tab === 'mission'} onClick={() => setTab('mission')}>
            미션
          </PanelTab>
          <PanelTab active={tab === 'concept'} onClick={() => setTab('concept')}>
            개념
          </PanelTab>
          <button
            onClick={close}
            className="ml-auto rounded p-1 text-fg-muted hover:bg-canvas-subtle"
            aria-label="닫기"
          >
            <XIcon size={16} />
          </button>
        </header>
        <div className="flex-1 overflow-auto p-4">
          {tab === 'mission' ? <MissionPanel /> : <ConceptPanel />}
        </div>
      </aside>
    </>
  );
}

function PanelTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-3 py-1.5 text-sm ${
        active
          ? 'bg-canvas-subtle text-fg-default font-semibold'
          : 'text-fg-muted hover:text-fg-default'
      }`}
    >
      {children}
    </button>
  );
}
