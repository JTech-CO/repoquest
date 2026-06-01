import { Route, Routes } from 'react-router-dom';

import RootLayout from './ui/layout/RootLayout';
import HomePage from './ui/pages/HomePage';
import SearchResultsPage from './ui/pages/SearchResultsPage';
import UserProfilePage from './ui/pages/UserProfilePage';
import NotFound from './ui/pages/NotFound';
import RepoPage from './ui/repo/RepoPage';
import WorkspacePage from './ui/work/WorkspacePage';

// 라우팅 개요 (Phase 2 — 읽기 UI)
//   /                      홈(탐색)
//   /search?q=             검색 결과
//   /:owner                사용자 프로필
//   /:owner/:repo/*        저장소 페이지(Code/Commits/파일/커밋 diff) — RepoPage 내부에서 분기
// 정적 경로(search)가 :owner 보다 먼저 선언되어 우선 매칭된다.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchResultsPage />} />
        <Route path="work/:cloneId" element={<WorkspacePage />} />
        <Route path=":owner/:repo/*" element={<RepoPage />} />
        <Route path=":owner" element={<UserProfilePage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
