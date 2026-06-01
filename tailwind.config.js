/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // GitHub 공식 다크 모드 토큰 (Primer Primitives functional/themes/dark.json).
      // 라이트 톤은 사용하지 않는다 — 앱 전체가 다크만 사용한다.
      colors: {
        canvas: {
          default: '#0d1117',
          subtle: '#161b22',
          inset: '#010409',
          overlay: '#161b22',
        },
        border: {
          default: '#30363d',
          muted: '#21262d',
        },
        fg: {
          default: '#e6edf3',
          muted: '#9198a1',
          subtle: '#6e7681',
          onEmphasis: '#ffffff',
        },
        accent: {
          fg: '#4493f8',
          emphasis: '#1f6feb',
          subtle: '#143461',
        },
        success: {
          fg: '#3fb950',
          emphasis: '#238636',
          subtle: '#103325',
        },
        danger: {
          fg: '#f85149',
          emphasis: '#da3633',
          subtle: '#3a1d1d',
        },
        attention: {
          fg: '#d29922',
          emphasis: '#9e6a03',
          subtle: '#341a04',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Noto Sans KR"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
};
