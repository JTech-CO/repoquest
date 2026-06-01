// src/ui/pages/SearchResultsPage.tsx
//
// 검색 결과. ?q= 로 시드된 레포를 이름/소유자/설명에서 필터.
// 검색을 수행하면 미션 1(둘러보기)의 SearchPerformed 신호를 기록한다.

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useWorld } from '../../store/world';
import { TutorialEvents } from '../../tutorial/missions';
import RepoCard from '../common/RepoCard';

export default function SearchResultsPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const repos = useWorld((s) => s.remoteRepos);
  const recordEvent = useWorld((s) => s.actions.recordEvent);

  const results = useMemo(() => {
    const lower = q.toLowerCase();
    return Object.values(repos)
      .filter((r) => {
        if (!lower) return true;
        return (
          r.name.toLowerCase().includes(lower) ||
          r.owner.toLowerCase().includes(lower) ||
          (r.description ?? '').toLowerCase().includes(lower)
        );
      })
      .sort((a, b) => b.stars - a.stars);
  }, [repos, q]);

  useEffect(() => {
    if (q) recordEvent(TutorialEvents.SearchPerformed);
  }, [q, recordEvent]);

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6">
      <h1 className="text-lg text-fg-default">
        {q ? (
          <>
            <span className="text-fg-muted">검색 결과: </span>
            <strong>{q}</strong>
          </>
        ) : (
          '전체 저장소'
        )}
        <span className="ml-2 text-sm text-fg-muted">{results.length}개</span>
      </h1>

      {results.length === 0 ? (
        <p className="mt-6 text-sm text-fg-muted">
          일치하는 저장소가 없습니다. 다른 검색어를 시도해 보세요 (예: spoon-knife, octocat).
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {results.map((r) => (
            <RepoCard key={r.id} repo={r} />
          ))}
        </div>
      )}
    </main>
  );
}
