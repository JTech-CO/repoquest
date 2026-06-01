// src/ui/work/terminalStore.ts
//
// 미니 터미널용 ephemeral 상태(영속화 X). "버튼 = 이 git 명령" 미러링을 위해,
// 버튼 핸들러가 동작과 함께 대응 명령을 여기에 기록한다.

import { create } from 'zustand';

export interface TermLine {
  id: number;
  cmd: string;
  /** 명령이 무슨 일을 했는지 한 줄 설명(학습용) */
  note?: string;
  /** 에러로 끝난 명령이면 true */
  error?: boolean;
}

interface TerminalState {
  lines: TermLine[];
  run: (cmd: string, note?: string) => void;
  fail: (cmd: string, note: string) => void;
  clear: () => void;
}

let seq = 0;

export const useTerminal = create<TerminalState>((set) => ({
  lines: [],
  run: (cmd, note) =>
    set((s) => ({ lines: [...s.lines, { id: ++seq, cmd, note }] })),
  fail: (cmd, note) =>
    set((s) => ({ lines: [...s.lines, { id: ++seq, cmd, note, error: true }] })),
  clear: () => set({ lines: [] }),
}));
