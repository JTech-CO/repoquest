// src/ui/coach/MissionToast.tsx — 미션이 새로 완료되면 축하 토스트

import { useEffect, useRef, useState } from 'react';

import { useWorld } from '../../store/world';
import { missionsById } from '../../tutorial/missions';
import { useCoach } from './coachStore';

export default function MissionToast() {
  const completed = useWorld((s) => s.tutorial.completedMissionIds);
  const openPanel = useCoach((s) => s.open_);
  const prev = useRef<string[]>(completed);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const newOnes = completed.filter((id) => !prev.current.includes(id));
    prev.current = completed;
    if (newOnes.length > 0) {
      const m = missionsById[newOnes[newOnes.length - 1]];
      if (m) {
        setToast(`미션 완료: ${m.title}`);
        const t = window.setTimeout(() => setToast(null), 5000);
        return () => window.clearTimeout(t);
      }
    }
  }, [completed]);

  if (!toast) return null;
  return (
    <button
      onClick={() => openPanel('mission')}
      className="fixed bottom-4 right-4 z-50 rounded-lg bg-success-emphasis px-4 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-110"
    >
      🎉 {toast} <span className="opacity-80">— 다음 미션 보기</span>
    </button>
  );
}
