// src/ui/repo/CodeTab.tsx
//
// 저장소 Code 탭: 브랜치 셀렉터 + Code(clone) 버튼 + breadcrumb + 파일 테이블 + README.
// 현재 디렉터리에 README 가 보이면 미션 1 의 ReadmeViewed 신호를 기록한다.

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CodeIcon,
  DeviceDesktopIcon,
  FileDirectoryFillIcon,
  FileIcon,
  HistoryIcon,
} from '@primer/octicons-react';

import type { RemoteRepo } from '../../store/world';
import { useWorld } from '../../store/world';
import { cloneRepo } from '../../store/githubActions';
import { TutorialEvents } from '../../tutorial/missions';
import { commitsOf, filesAt, latestCommit, shortSha } from '../lib/repoView';
import { breadcrumbs, findReadme, listDir } from '../lib/tree';
import { blobUrl, codeUrl, commitUrl, commitsUrl } from '../lib/repoRoute';
import { timeAgo } from '../lib/time';
import { useTerminal } from '../work/terminalStore';
import Avatar from '../common/Avatar';
import Markdown from '../common/Markdown';
import BranchSelector from './BranchSelector';

export default function CodeTab({
  repo,
  branch,
  path,
}: {
  repo: RemoteRepo;
  branch: string;
  path: string;
}) {
  const files = filesAt(repo, branch);
  const entries = listDir(files, path);
  const last = latestCommit(repo, branch);
  const crumbs = breadcrumbs(path);
  const readmePath = findReadme(files, path);
  const commitCount = commitsOf(repo, branch).length;
  const recordEvent = useWorld((s) => s.actions.recordEvent);
  const navigate = useNavigate();
  const existingCloneId = useWorld(
    (s) =>
      Object.values(s.localClones).find((c) => c.remoteRepoId === repo.id)?.id,
  );

  useEffect(() => {
    if (readmePath) recordEvent(TutorialEvents.ReadmeViewed);
  }, [readmePath, recordEvent]);

  const parentPath = path.includes('/')
    ? path.slice(0, path.lastIndexOf('/'))
    : '';

  function handleClone() {
    if (existingCloneId) {
      navigate(`/work/${existingCloneId}`);
      return;
    }
    const id = cloneRepo(repo.id);
    useTerminal
      .getState()
      .run(
        `git clone https://repoquest.local/${repo.owner}/${repo.name}.git`,
        '서버(origin) → 내 컴퓨터로 복제: 객체·전체 이력을 받아오고 origin 추적을 설정합니다.',
      );
    navigate(`/work/${id}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BranchSelector repo={repo} branch={branch} />
          <Link
            to={commitsUrl(repo.owner, repo.name, branch)}
            className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-fg-muted hover:text-accent-fg"
          >
            <HistoryIcon size={16} />
            커밋 <span className="font-semibold text-fg-default">{commitCount}</span>개
          </Link>
        </div>
        <button
          type="button"
          onClick={handleClone}
          data-concept="clone"
          title={
            existingCloneId
              ? '이미 clone 한 저장소를 내 컴퓨터에서 엽니다'
              : '이 저장소를 내 컴퓨터로 clone 합니다'
          }
          className="inline-flex items-center gap-1.5 rounded bg-success-emphasis px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
        >
          {existingCloneId ? <DeviceDesktopIcon size={16} /> : <CodeIcon size={16} />}
          {existingCloneId ? '내 컴퓨터에서 열기' : 'Code'}
        </button>
      </div>

      {path && (
        <div className="mt-3 text-sm text-fg-muted">
          <Link
            to={codeUrl(repo.owner, repo.name, branch)}
            className="text-accent-fg hover:underline"
          >
            {repo.name}
          </Link>
          {crumbs.map((c, i) => (
            <span key={c.path}>
              <span className="mx-1">/</span>
              {i < crumbs.length - 1 ? (
                <Link
                  to={codeUrl(repo.owner, repo.name, branch, c.path)}
                  className="text-accent-fg hover:underline"
                >
                  {c.name}
                </Link>
              ) : (
                <span className="text-fg-default font-semibold">{c.name}</span>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 rounded border border-border-default overflow-hidden">
        {last && (
          <div className="flex items-center gap-2 bg-canvas-subtle px-4 py-2 text-xs border-b border-border-default">
            <Avatar seed={last.author} size={20} />
            <Link
              to={`/${last.author}`}
              className="font-semibold text-fg-default hover:text-accent-fg"
            >
              {last.author}
            </Link>
            <span className="text-fg-muted truncate">{last.message}</span>
            <Link
              to={commitUrl(repo.owner, repo.name, last.id)}
              className="ml-auto font-mono text-fg-muted hover:text-accent-fg"
            >
              {shortSha(last.id)}
            </Link>
            <span className="text-fg-muted whitespace-nowrap">
              {timeAgo(last.timestamp)}
            </span>
          </div>
        )}

        {entries.length === 0 ? (
          <div className="px-4 py-6 text-sm text-fg-muted">빈 디렉터리입니다.</div>
        ) : (
          <ul className="divide-y divide-border-muted">
            {path && (
              <li>
                <Link
                  to={codeUrl(repo.owner, repo.name, branch, parentPath)}
                  className="flex items-center gap-2 px-4 py-1.5 text-sm text-fg-muted hover:bg-canvas-subtle"
                >
                  ..
                </Link>
              </li>
            )}
            {entries.map((e) => (
              <li key={e.path}>
                <Link
                  to={
                    e.type === 'dir'
                      ? codeUrl(repo.owner, repo.name, branch, e.path)
                      : blobUrl(repo.owner, repo.name, branch, e.path)
                  }
                  className="flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-canvas-subtle"
                >
                  {e.type === 'dir' ? (
                    <FileDirectoryFillIcon size={16} className="text-accent-fg" />
                  ) : (
                    <FileIcon size={16} className="text-fg-muted" />
                  )}
                  <span className="text-fg-default">{e.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {readmePath && (
        <div className="mt-4 rounded border border-border-default">
          <div className="flex items-center gap-2 bg-canvas-subtle px-4 py-2 text-sm border-b border-border-default text-fg-muted">
            <FileIcon size={14} />
            {readmePath.split('/').pop()}
          </div>
          <div className="p-6">
            <Markdown content={files[readmePath] ?? ''} />
          </div>
        </div>
      )}
    </div>
  );
}
