// src/ui/lib/time.ts — 간단한 상대 시간 표시(한국어)

export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return '방금 전';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}개월 전`;
  const y = Math.floor(mo / 12);
  return `${y}년 전`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
