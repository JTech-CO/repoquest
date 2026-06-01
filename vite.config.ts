/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// vitest 3은 vite 6을 peerDep로 받아 nested 사본을 만들지 않으므로,
// vitest/config 의 defineConfig 하나로 build·test 옵션을 함께 다룬다.
//
// base: GitHub Pages 는 https://<user>.github.io/repoquest/ 로 호스팅되므로
//   프로덕션 빌드에서만 '/repoquest/' 를 base 로 둔다. dev/test 는 '/' 유지.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/repoquest/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      // ESM 호환: __dirname 대신 import.meta.url 사용(한글/공백 경로에서도 안전).
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  test: {
    globals: true,
    // 엔진 테스트는 DOM 무관. UI 컴포넌트 테스트가 들어오면 jsdom 으로 올린다.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}));
