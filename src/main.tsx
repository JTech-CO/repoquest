import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { useWorld } from './store/world';
import { seedWorld } from './seed/seedWorld';
import { loadPersisted, setupPersist } from './store/persist';
import 'highlight.js/styles/github-dark.css';
import './index.css';

// 부팅: 저장된 World 가 있으면 복원, 없으면 시드로 시작. 이후 변경은 localStorage 에 자동 저장.
useWorld.getState().actions.reset(loadPersisted() ?? seedWorld());
setupPersist();

// GitHub Pages 의 base('/repoquest/') 아래에서 라우팅이 동작하도록 basename 을 맞춘다.
// dev('/')에서는 빈 문자열 → '/' 로 정규화.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
