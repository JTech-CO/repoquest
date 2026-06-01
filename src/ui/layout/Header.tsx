import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GitBranchIcon, SearchIcon, MortarBoardIcon } from '@primer/octicons-react';

import { useWorld } from '../../store/world';
import { resetWorld } from '../../store/persist';
import { evaluateMissions } from '../../tutorial/missions';
import { useCoach } from '../coach/coachStore';
import Avatar from '../common/Avatar';

// 글로벌 헤더.
// - 좌측: 독자 브랜드(RepoQuest) + 비공식 배지 — GitHub 로고/이름을 그대로 쓰지 않는다.
// - 가운데: 검색창(Enter → /search?q=).
// - 우측: 미션 진행 배지(코칭 패널 토글) · 리셋 · 내 프로필 아바타.
export default function Header() {
  const navigate = useNavigate();
  const currentUser = useWorld((s) => s.currentUser);
  const world = useWorld();
  const toggleCoach = useCoach((s) => s.toggle);
  const [q, setQ] = useState('');

  const evals = evaluateMissions(world);
  const done = evals.filter((e) => e.complete).length;
  const total = evals.length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  }

  function doReset() {
    if (
      window.confirm(
        '실험 리셋: 모든 진행(레포·커밋·로컬 작업·미션)을 초기 시드 상태로 되돌립니다. 계속할까요?',
      )
    ) {
      resetWorld();
      navigate('/');
    }
  }

  return (
    <header className="sticky top-0 z-10 bg-canvas-overlay border-b border-border-default">
      <div className="mx-auto max-w-[1280px] flex items-center gap-4 px-4 h-14">
        <Link
          to="/"
          className="flex items-center gap-2 text-fg-default hover:text-accent-fg transition-colors"
        >
          <GitBranchIcon size={20} />
          <span className="font-semibold tracking-tight">RepoQuest</span>
        </Link>
        <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-fg-muted border border-border-default rounded px-1.5 py-0.5">
          학습용 비공식
        </span>

        <form onSubmit={submit} className="flex-1 max-w-xl">
          <label className="flex items-center gap-2 h-8 px-3 rounded border border-border-default bg-canvas-subtle text-fg-muted text-sm focus-within:border-accent-emphasis">
            <SearchIcon size={14} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="저장소 검색 (예: spoon-knife)"
              className="bg-transparent outline-none w-full text-fg-default placeholder:text-fg-muted"
            />
          </label>
        </form>

        <button
          onClick={toggleCoach}
          data-concept="repository"
          title="학습 미션 & 개념 패널 열기"
          className="inline-flex items-center gap-1.5 rounded border border-border-default bg-canvas-subtle px-2.5 py-1 text-xs text-fg-default hover:bg-canvas-inset"
        >
          <MortarBoardIcon size={14} className="text-accent-fg" />
          <span className="hidden sm:inline">미션</span>
          <span className="rounded-full bg-canvas-inset px-1.5 text-fg-muted">
            {done}/{total}
          </span>
        </button>

        <button
          onClick={doReset}
          title="실험 리셋(시드로 복귀)"
          className="hidden sm:inline text-xs text-fg-muted hover:text-danger-fg"
        >
          리셋
        </button>

        <Link
          to={`/${currentUser}`}
          className="rounded-full hover:ring-2 hover:ring-border-default"
          aria-label="내 프로필"
        >
          <Avatar seed={currentUser} size={28} />
        </Link>
      </div>
    </header>
  );
}
