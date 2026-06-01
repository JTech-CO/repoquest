// src/ui/lib/starStore.ts
//
// Star 상태(내가 별을 눌렀는지). 정본 World 를 건드리지 않는 ephemeral UI 상태다.
// 표시 stars = repo.stars + (starred ? 1 : 0). (영속화는 Phase 6 의 범위)

import { create } from 'zustand';

interface StarState {
  starred: Record<string, boolean>;
  toggle: (repoId: string) => void;
}

export const useStars = create<StarState>((set) => ({
  starred: {},
  toggle: (repoId) =>
    set((s) => ({ starred: { ...s.starred, [repoId]: !s.starred[repoId] } })),
}));
