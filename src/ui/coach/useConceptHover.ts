// src/ui/coach/useConceptHover.ts
//
// 전역 mouseover 리스너: data-concept="<id>" 요소에 마우스를 올리면 코칭 패널의
// 현재 개념을 그 id 로 갱신한다(패널이 열려 개념 탭이면 카드가 자동으로 바뀐다).
// 패널을 강제로 열지는 않는다(호버마다 패널이 튀어나오면 거슬리므로).

import { useEffect } from 'react';
import { useCoach } from './coachStore';

export function useConceptHover() {
  useEffect(() => {
    function onOver(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.('[data-concept]');
      if (!el) return;
      const id = el.getAttribute('data-concept');
      if (id && id !== useCoach.getState().conceptId) {
        useCoach.setState({ conceptId: id });
      }
    }
    document.addEventListener('mouseover', onOver);
    return () => document.removeEventListener('mouseover', onOver);
  }, []);
}
