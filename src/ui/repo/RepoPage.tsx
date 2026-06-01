// src/ui/repo/RepoPage.tsx
//
// /:owner/:repo/* 의 진입점. 레포를 찾고, splat 을 해석해 알맞은 뷰를 렌더한다.
// 공통 RepoHeader(타이틀·액션·탭)는 항상 보여주고, 그 아래 본문만 바뀐다.

import { useParams } from 'react-router-dom';

import { useWorld } from '../../store/world';
import { parseRepoSplat } from '../lib/repoRoute';
import NotFound from '../pages/NotFound';
import RepoHeader from './RepoHeader';
import CodeTab from './CodeTab';
import FileView from './FileView';
import CommitsTab from './CommitsTab';
import CommitDetail from './CommitDetail';
import IssuesTab from '../collab/IssuesTab';
import NewIssue from '../collab/NewIssue';
import IssueDetail from '../collab/IssueDetail';
import PullsTab from '../collab/PullsTab';
import NewPullRequest from '../collab/NewPullRequest';
import PrDetail from '../collab/PrDetail';

export default function RepoPage() {
  const params = useParams();
  const owner = params.owner ?? '';
  const name = params.repo ?? '';
  const splat = params['*'] ?? '';

  const repo = useWorld((s) =>
    Object.values(s.remoteRepos).find((r) => r.owner === owner && r.name === name),
  );

  if (!repo) {
    return <NotFound message={`저장소 '${owner}/${name}' 를 찾을 수 없습니다.`} />;
  }

  const view = parseRepoSplat(splat, repo);
  const issueViews = ['issues', 'issue-new', 'issue'];
  const pullViews = ['pulls', 'pull-new', 'pull'];
  const activeTab = issueViews.includes(view.kind)
    ? 'issues'
    : pullViews.includes(view.kind)
      ? 'pulls'
      : 'code';

  return (
    <div>
      <RepoHeader repo={repo} activeTab={activeTab} />
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        {view.kind === 'code' && (
          <CodeTab repo={repo} branch={view.branch} path={view.path} />
        )}
        {view.kind === 'blob' && (
          <FileView repo={repo} branch={view.branch} path={view.path} />
        )}
        {view.kind === 'commits' && <CommitsTab repo={repo} branch={view.branch} />}
        {view.kind === 'commit' && <CommitDetail repo={repo} sha={view.sha} />}
        {view.kind === 'issues' && <IssuesTab repo={repo} />}
        {view.kind === 'issue-new' && <NewIssue repo={repo} />}
        {view.kind === 'issue' && <IssueDetail repo={repo} number={view.number} />}
        {view.kind === 'pulls' && <PullsTab repo={repo} />}
        {view.kind === 'pull-new' && <NewPullRequest repo={repo} />}
        {view.kind === 'pull' && <PrDetail repo={repo} number={view.number} />}
        {view.kind === 'notfound' && (
          <NotFound message="레포 내 경로를 해석할 수 없습니다." />
        )}
      </div>
    </div>
  );
}
