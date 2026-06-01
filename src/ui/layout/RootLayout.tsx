import { Outlet } from 'react-router-dom';

import Footer from './Footer';
import Header from './Header';
import LocalStatusBar from './LocalStatusBar';
import CoachPanel from '../coach/CoachPanel';
import MissionToast from '../coach/MissionToast';

// 전체 페이지 골격: 헤더 + 로컬 상태바 + 본문(풀폭 Outlet) + 푸터.
// 코칭 패널(우측 슬라이드)과 미션 완료 토스트는 어느 페이지에서나 떠 있다.
export default function RootLayout() {
  return (
    <div className="min-h-full flex flex-col bg-canvas-default">
      <Header />
      <LocalStatusBar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
      <CoachPanel />
      <MissionToast />
    </div>
  );
}
