// src/ui/repo/CommitDetail.tsx
//
// 커밋 상세 + diff. 커밋이 (첫 부모 대비) 무엇을 바꿨는지 초록(+)/빨강(-) 으로 보여준다.
// "커밋은 diff 가 아니라 스냅샷"이지만, 사람이 읽기 쉽게 부모와의 차이를 계산해 표시한다.

import type { RemoteRepo } from '../../store/world';
import { commitDiff, shortSha } from '../lib/repoView';
import { formatDate } from '../lib/time';
import Avatar from '../common/Avatar';
import FileDiffList from '../common/FileDiffList';
import NotFound from '../pages/NotFound';

export default function CommitDetail({
  repo,
  sha,
}: {
  repo: RemoteRepo;
  sha: string;
}) {
  const d = commitDiff(repo, sha);
  if (!d) return <NotFound message={`커밋 '${sha}' 를 찾을 수 없습니다.`} />;

  const { commit, files, additions, deletions } = d;

  return (
    <div>
      <div className="rounded border border-border-default p-4">
        <p className="font-semibold text-fg-default">{commit.message}</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-fg-muted">
          <Avatar seed={commit.author} size={20} />
          <span className="text-fg-default">{commit.author}</span>
          <span>· {formatDate(commit.timestamp)}</span>
          <span className="ml-auto font-mono">
            commit <span className="text-fg-default">{shortSha(commit.id)}</span>
          </span>
        </div>
        <div className="mt-1 text-xs text-fg-muted">
          부모:{' '}
          {commit.parentIds.length
            ? commit.parentIds.map(shortSha).join(', ')
            : '없음 (최초 커밋)'}
          {commit.parentIds.length >= 2 && ' · 머지 커밋'}
        </div>
        <div className="mt-2 text-xs">
          <span className="text-success-fg">+{additions}</span>{' '}
          <span className="text-danger-fg">-{deletions}</span>
          <span className="text-fg-muted"> · {files.length} files changed</span>
        </div>
      </div>

      <div className="mt-4">
        <FileDiffList files={files} />
      </div>

      {commit.parentIds.length >= 2 && (
        <p className="mt-3 text-xs text-fg-muted">
          ※ 머지 커밋은 첫 번째 부모를 기준으로 변경을 표시합니다.
        </p>
      )}
    </div>
  );
}
