// src/ui/work/WorkspacePage.tsx
//
// /work/:cloneId — 로컬 작업 공간. 좌(내 컴퓨터) 2/3 + 우(origin) 1/3 분할.
// 좌측에서 편집·add·commit 해도 우측(서버)은 그대로라는 점이 Phase 3 의 핵심 학습이다.

import { Link, useParams } from 'react-router-dom';

import { useWorld } from '../../store/world';
import LocalPane from './LocalPane';
import RemotePane from './RemotePane';
import SyncBar from './SyncBar';
import NotFound from '../pages/NotFound';

export default function WorkspacePage() {
  const { cloneId = '' } = useParams();
  const clone = useWorld((s) => s.localClones[cloneId]);
  const repo = useWorld((s) =>
    clone ? s.remoteRepos[clone.remoteRepoId] : undefined,
  );

  if (!clone || !repo) {
    return <NotFound message="작업 공간(clone)을 찾을 수 없습니다. 먼저 저장소를 clone 하세요." />;
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-4">
      <div className="mb-3 text-sm text-fg-muted">
        <Link
          to={`/${repo.owner}/${repo.name}`}
          className="text-accent-fg hover:underline"
        >
          {repo.owner}/{repo.name}
        </Link>{' '}
        · 로컬 작업 공간
      </div>

      <SyncBar cloneId={cloneId} />

      <div className="grid gap-4 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <LocalPane cloneId={cloneId} />
        </div>
        <div className="lg:col-span-1">
          <RemotePane cloneId={cloneId} />
        </div>
      </div>
    </main>
  );
}
