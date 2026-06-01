// src/ui/pages/HomePage.tsx
//
// 홈 = 탐색 출발점. 소개 배너 + 시드된 저장소 카드(인기순).

import { useWorld } from '../../store/world';
import RepoCard from '../common/RepoCard';

export default function HomePage() {
  const repos = useWorld((s) => s.remoteRepos);
  const list = Object.values(repos).sort((a, b) => b.stars - a.stars);

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6">
      <section className="rounded border border-border-default bg-canvas-subtle p-6">
        <h1 className="text-2xl font-semibold text-fg-default">
          눌러보며 배우는 Git/GitHub
        </h1>
        <p className="mt-2 text-sm text-fg-muted leading-relaxed">
          저장소를 검색해 열고, <strong className="text-fg-default">fork → clone → commit → push → Pull Request</strong>
          의 흐름을 직접 체험하세요. 위쪽 <strong className="text-fg-default">내 컴퓨터(로컬)</strong> 바와
          본문의 <strong className="text-fg-default">github.com(서버)</strong> 을 구분해서 보는 것이 핵심입니다 —
          데이터가 지금 어디에 있는지가 모든 개념의 출발점입니다.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">
          저장소 둘러보기
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {list.map((r) => (
            <RepoCard key={r.id} repo={r} />
          ))}
        </div>
      </section>
    </main>
  );
}
