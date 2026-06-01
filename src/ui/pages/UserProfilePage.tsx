// src/ui/pages/UserProfilePage.tsx
//
// 사용자 프로필: 아바타·bio + 그 사용자가 소유한 저장소 목록.

import { useParams } from 'react-router-dom';

import { useWorld } from '../../store/world';
import Avatar from '../common/Avatar';
import RepoCard from '../common/RepoCard';
import NotFound from './NotFound';

export default function UserProfilePage() {
  const { owner = '' } = useParams();
  const users = useWorld((s) => s.users);
  const repos = useWorld((s) => s.remoteRepos);

  const user = users[owner];
  if (!user) {
    return <NotFound message={`사용자 '${owner}' 를 찾을 수 없습니다.`} />;
  }

  const owned = Object.values(repos)
    .filter((r) => r.owner === owner)
    .sort((a, b) => b.stars - a.stars);

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6">
      <div className="flex items-start gap-4">
        <Avatar seed={user.avatarSeed} size={72} />
        <div>
          <h1 className="text-2xl font-semibold text-fg-default">{user.username}</h1>
          {user.bio && <p className="mt-1 text-sm text-fg-muted">{user.bio}</p>}
          <p className="mt-2 text-xs text-fg-subtle">
            공개 저장소 {owned.length}개
          </p>
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
    </main>
  );
}
