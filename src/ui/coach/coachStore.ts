// src/ui/coach/coachStore.ts — 코칭 패널 열림/탭/선택 개념 상태(ephemeral UI)

import { create } from 'zustand';

export type CoachTab = 'mission' | 'concept';

interface CoachState {
  open: boolean;
  tab: CoachTab;
  conceptId: string | null;
  toggle: () => void;
  open_: (tab?: CoachTab) => void;
  close: () => void;
  setTab: (tab: CoachTab) => void;
  /** 개념 카드 표시(패널을 열고 개념 탭으로 전환). null 이면 목록으로. */
  showConcept: (id: string | null) => void;
}

export const useCoach = create<CoachState>((set) => ({
  open: false,
  tab: 'mission',
  conceptId: null,
  toggle: () => set((s) => ({ open: !s.open })),
  open_: (tab) => set((s) => ({ open: true, tab: tab ?? s.tab })),
  close: () => set({ open: false }),
  setTab: (tab) => set({ tab }),
  showConcept: (id) =>
    set({ open: true, tab: 'concept', conceptId: id }),
}));
