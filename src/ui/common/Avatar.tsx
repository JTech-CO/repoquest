// src/ui/common/Avatar.tsx
//
// 외부 이미지 의존 없이 seed 문자열에서 결정적 색 + 이니셜 아바타를 만든다(SPEC §10).

interface AvatarProps {
  seed: string;
  size?: number;
  square?: boolean;
  title?: string;
}

function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

export default function Avatar({ seed, size = 32, square = false, title }: AvatarProps) {
  const hue = hashHue(seed || '?');
  const bg = `hsl(${hue} 42% 38%)`;
  const initial = (seed?.[0] ?? '?').toUpperCase();
  return (
    <span
      title={title ?? seed}
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.45) }}
      className={`inline-flex shrink-0 items-center justify-center font-semibold text-white select-none border border-border-muted ${
        square ? 'rounded' : 'rounded-full'
      }`}
    >
      {initial}
    </span>
  );
}
