// src/store/persist.ts
//
// World 영속화(localStorage). MVP 단계라 localStorage 로 시작한다(SPEC: 추후 Dexie 마이그레이션 가능).
// actions(함수)는 직렬화 대상이 아니므로 제외하고 데이터만 저장한다.

import { useWorld, type World } from './world';
import { seedWorld } from '../seed/seedWorld';

const KEY = 'repoquest-world-v1';

export function loadPersisted(): World | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as World;
    // 최소 정합성 체크
    if (!data || typeof data !== 'object' || !data.remoteRepos) return null;
    return data;
  } catch {
    return null;
  }
}

export function persistNow(): void {
  try {
    const { actions: _actions, ...data } = useWorld.getState();
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 용량 초과 등은 조용히 무시(학습앱)
  }
}

let timer: number | undefined;
export function setupPersist(): void {
  useWorld.subscribe(() => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(persistNow, 300);
  });
}

export function clearPersisted(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

/** 실험 리셋: 시드 상태로 복귀(저장본도 갱신됨). */
export function resetWorld(): void {
  clearPersisted();
  useWorld.getState().actions.reset(seedWorld());
}
