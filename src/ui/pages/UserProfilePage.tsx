// src/ui/pages/UserProfilePage.tsx
//
// 사용자 프로필: 아바타·bio + 그 사용자가 소유한 저장소 목록.
// 본인 프로필이면 하단에 초기화(미션 진행도 + 작성된 데이터 삭제) 섹션을 제공한다.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertIcon } from '@primer/octicons-react';

import { useWorld } from '../../store/world';
import { resetWorld } from '../../store/persist';
import Avatar from '../common/Avatar';
import RepoCard from '../common/RepoCard';
import NotFound from './NotFound';

export default function UserProfilePage() {
  const { owner = '' } = useParams();
  const navigate = useNavigate();
  const users = useWorld((s) => s.users);
  const repos = useWorld((s) => s.remoteRepos);
  const currentUser = useWorld((s) => s.currentUser);
  const [confirming, setConfirming] = useState(false);

  const user = users[owner];
  if (!user) {
    return <NotFound message={`사용자 '${owner}' 를 찾을 수 없습니다.`} />;
  }

  const isMe = owner === currentUser;
  const owned = Object.values(repos)
    .filter((r) => r.owner === owner)
    .sort((a, b) => b.stars - a.stars);

  function doReset() {
    resetWorld(); // 시드 상태로 복귀(미션 진행도 + 작성된 데이터 초기화) + localStorage 클리어
    setConfirming(false);
    navigate('/');
  }

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6">
      <div className="flex items-start gap-4">
        <Avatar seed={user.avatarSeed} size={72} />
        <div>
          <h1 className="text-2xl font-semibold text-fg-default">{user.username}</h1>
          {user.bio && <p className="mt-1 text-sm text-fg-muted">{user.bio}</p>}
          <p className="mt-2 text-xs text-fg-subtle">공개 저장소 {owned.length}개</p>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">
          저장소
        </h2>
        {owned.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">아직 저장소가 없습니다.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {owned.map((r) => (
              <RepoCard key={r.id} repo={r} />
            ))}
          </div>
        )}
      </section>

      {isMe && (
        <section className="mt-10 max-w-xl">
          <h2 className="text-sm font-semibold text-danger-fg uppercase tracking-wider">
            초기화
          </h2>
          <div className="mt-3 rounded border border-danger-fg/40 bg-canvas-subtle p-4">
            {!confirming ? (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm text-fg-muted">
                  미션 진행도와 그동안 작성·복제한 데이터(fork·clone·커밋·PR·Issue)를 모두
                  지우고 처음 상태로 되돌립니다.
                </div>
                <button
                  onClick={() => setConfirming(true)}
                  className="shrink-0 rounded border border-danger-fg/50 px-3 py-1.5 text-sm font-semibold text-danger-fg hover:bg-danger-subtle"
                >
                  초기화
                </button>
              </div>
            ) : (
              <div>
                <p className="flex items-start gap-2 text-sm text-fg-default">
                  <AlertIcon size={16} className="mt-0.5 text-danger-fg" />
                  미션 진행도와 작성된 데이터를 삭제하시겠습니까?
                </p>
                <p className="mt-1 pl-6 text-xs text-fg-subtle">
                  이 동작은 되돌릴 수 없습니다.
                </p>
                <div className="mt-3 flex items-center gap-2 pl-6">
                  <button
                    onClick={doReset}
                    className="rounded bg-danger-emphasis px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
                  >
                    확인
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="rounded border border-border-default px-3 py-1.5 text-sm text-fg-default hover:bg-canvas-inset"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
