// src/ui/repo/RepoHeader.tsx
//
// 저장소 상단: owner/repo 타이틀 + Watch/Star/Fork 액션(Phase 4 에서 동작) + 탭.
// Phase 2 는 Code 탭만 실질 동작하고, Issues/Pull requests 는 개수만 보여준 뒤 placeholder.

import { Link, useNavigate } from 'react-router-dom';
import {
  RepoIcon,
  RepoForkedIcon,
  StarIcon,
  EyeIcon,
  CodeIcon,
  IssueOpenedIcon,
  GitPullRequestIcon,
  LockIcon,
} from '@primer/octicons-react';

import type { RemoteRepo } from '../../store/world';
import { useWorld } from '../../store/world';
import { forkRepo } from '../../store/githubActions';
import { useStars } from '../lib/starStore';
import { useTerminal } from '../work/terminalStore';

type Tab = 'code' | 'issues' | 'pulls';

export default function RepoHeader({
  repo,
  activeTab,
}: {
  repo: RemoteRepo;
  activeTab: Tab;
}) {
  const navigate = useNavigate();
  const me = useWorld((s) => s.currentUser);
  const myFork = useWorld((s) =>
    Object.values(s.remoteRepos).find(
      (r) => r.owner === me && r.forkOf === repo.id,
    ),
  );
  const upstream = useWorld((s) =>
    repo.forkOf ? s.remoteRepos[repo.forkOf] : undefined,
  );
  const isMine = repo.owner === me;

  const starred = useStars((s) => Boolean(s.starred[repo.id]));
  const toggleStar = useStars((s) => s.toggle);
  const displayStars = repo.stars + (starred ? 1 : 0);

  const openIssues = repo.issues.filter((i) => i.state === 'open').length;
  const openPrs = repo.pullRequests.filter((p) => p.state === 'open').length;

  function handleFork() {
    if (isMine) return;
    if (myFork) {
      navigate(`/${myFork.owner}/${myFork.name}`);
      return;
    }
    const id = forkRepo(repo.id);
    const f = useWorld.getState().remoteRepos[id];
    useTerminal
      .getState()
      .run(
        `# Fork: ${repo.owner}/${repo.name} → ${me}/${repo.name}`,
        'GitHub 서버 안에서의 복사입니다. 내 PC에는 아직 없습니다 — 다음은 clone.',
      );
    if (f) navigate(`/${f.owner}/${f.name}`);
  }

  return (
    <div className="bg-canvas-overlay border-b border-border-default">
      <div className="mx-auto max-w-[1280px] px-4 pt-4">
        {/* 타이틀 줄 */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="flex items-center gap-2 text-lg">
            {repo.forkOf ? (
              <RepoForkedIcon size={16} className="text-fg-muted" />
            ) : (
              <RepoIcon size={16} className="text-fg-muted" />
            )}
            <Link to={`/${repo.owner}`} className="text-accent-fg hover:underline">
              {repo.owner}
            </Link>
            <span className="text-fg-muted">/</span>
            <Link
              to={`/${repo.owner}/${repo.name}`}
              className="text-accent-fg font-semibold hover:underline"
            >
              {repo.name}
            </Link>
            <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-border-default px-2 py-0.5 text-[11px] text-fg-muted">
              {repo.isPrivate ? (
                <>
                  <LockIcon size={11} /> Private
                </>
              ) : (
                'Public'
              )}
            </span>
          </h1>

          <div className="flex items-center gap-2 text-xs">
            <ActionButton icon={<EyeIcon size={14} />} label="Watch" count={0} />
            <ActionButton
              icon={<StarIcon size={14} />}
              label={starred ? 'Starred' : 'Star'}
              count={displayStars}
              onClick={() => toggleStar(repo.id)}
              active={starred}
              dataConcept="star"
              hint={starred ? '스타 취소' : '이 저장소에 스타'}
            />
            <ActionButton
              icon={<RepoForkedIcon size={14} />}
              label={myFork ? 'Forked' : 'Fork'}
              count={repo.forks ?? 0}
              onClick={handleFork}
              disabled={isMine}
              dataConcept="fork"
              hint={
                isMine
                  ? '자기 저장소는 fork 할 수 없습니다'
                  : myFork
                    ? '내 fork 로 이동'
                    : '내 계정으로 복사(서버 안에서만)'
              }
            />
          </div>
        </div>

        {repo.forkOf && (
          <p className="mt-1 text-xs text-fg-muted">
            forked from{' '}
            {upstream ? (
              <Link
                to={`/${upstream.owner}/${upstream.name}`}
                className="text-accent-fg hover:underline"
              >
                {upstream.owner}/{upstream.name}
              </Link>
            ) : (
              <span className="text-fg-subtle">(삭제된 원본)</span>
            )}
          </p>
        )}

        {/* 탭 */}
        <nav className="mt-3 flex items-center gap-1 text-sm">
          <TabLink to={`/${repo.owner}/${repo.name}`} active={activeTab === 'code'} icon={<CodeIcon size={16} />} label="Code" />
          <TabLink
            to={`/${repo.owner}/${repo.name}/issues`}
            active={activeTab === 'issues'}
            icon={<IssueOpenedIcon size={16} />}
            label="Issues"
            count={openIssues}
          />
          <TabLink
            to={`/${repo.owner}/${repo.name}/pulls`}
            active={activeTab === 'pulls'}
            icon={<GitPullRequestIcon size={16} />}
            label="Pull requests"
            count={openPrs}
          />
        </nav>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  count,
  hint,
  onClick,
  disabled,
  active,
  dataConcept,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  hint?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  dataConcept?: string;
}) {
  return (
    <button
      type="button"
      title={hint}
      onClick={onClick}
      disabled={disabled}
      data-concept={dataConcept}
      className={`inline-flex items-center gap-1 rounded border bg-canvas-subtle px-2 py-1 disabled:opacity-50 enabled:hover:bg-canvas-inset ${
        active
          ? 'border-attention-emphasis text-attention-fg'
          : 'border-border-default text-fg-default'
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className="ml-1 rounded-full bg-canvas-inset px-1.5 text-fg-muted">
        {count.toLocaleString()}
      </span>
    </button>
  );
}

function TabLink({
  to,
  active,
  icon,
  label,
  count,
}: {
  to: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <Link
      to={to}
      className={`-mb-px inline-flex items-center gap-2 rounded-t border-b-2 px-3 py-2 ${
        active
          ? 'border-attention-emphasis text-fg-default font-semibold'
          : 'border-transparent text-fg-muted hover:text-fg-default hover:border-border-default'
      }`}
    >
      <span className={active ? 'text-fg-default' : 'text-fg-muted'}>{icon}</span>
      {label}
      {typeof count === 'number' && (
        <span className="rounded-full bg-canvas-inset px-1.5 text-[11px] text-fg-muted">
          {count}
        </span>
      )}
    </Link>
  );
}
