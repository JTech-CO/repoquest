// src/ui/pages/NotFound.tsx

import { Link } from 'react-router-dom';

export default function NotFound({ message }: { message?: string }) {
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-16 text-center">
      <p className="text-5xl font-bold text-fg-muted">404</p>
      <p className="mt-3 text-fg-default">
        {message ?? '페이지를 찾을 수 없습니다.'}
      </p>
      <Link to="/" className="mt-6 inline-block text-accent-fg hover:underline">
        홈으로 돌아가기
      </Link>
    </main>
  );
}
