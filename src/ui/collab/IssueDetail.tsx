// src/ui/collab/IssueDetail.tsx — 이슈 상세: 본문 + 코멘트 타임라인 + 라벨 + open/close

import { IssueOpenedIcon, IssueClosedIcon } from '@primer/octicons-react';

import type { RemoteRepo } from '../../store/world';
import { addIssueComment, setIssueState } from '../../store/collabActions';
import { CommentBox, CommentList, TimelineItem } from './Timeline';
import { LabelBadge } from './labels';
import NotFound from '../pages/NotFound';

export default function IssueDetail({
  repo,
  number,
}: {
  repo: RemoteRepo;
  number: number;
}) {
  const issue = repo.issues.find((i) => i.number === number);
  if (!issue) {
    return <NotFound message={`이슈 #${number} 를 찾을 수 없습니다.`} />;
  }
  const open = issue.state === 'open';

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl text-fg-default">
        {issue.title} <span className="text-fg-muted font-normal">#{issue.number}</span>
      </h1>

      <div className="flex flex-wrap items-center gap-2 mt-2 mb-5">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold text-white ${
            open ? 'bg-success-emphasis' : 'bg-accent-emphasis'
          }`}
        >
          {open ? <IssueOpenedIcon size={14} /> : <IssueClosedIcon size={14} />}
          {open ? 'Open' : 'Closed'}
        </span>
        <span className="text-sm text-fg-muted">
          {issue.author} 님이 이 이슈를 열었습니다
        </span>
        <span className="flex gap-1">
          {issue.labels.map((l) => (
            <LabelBadge key={l} label={l} />
          ))}
        </span>
      </div>

      <div className="space-y-3">
        <TimelineItem
          author={issue.author}
          body={issue.body}
          createdAt={issue.createdAt}
          badge="작성자"
        />
        <CommentList comments={issue.comments} />
        <CommentBox
          onSubmit={(b) => addIssueComment(repo.id, issue.id, b)}
          extra={
            <button
              onClick={() =>
                setIssueState(repo.id, issue.id, open ? 'closed' : 'open')
              }
              className="rounded border border-border-default px-3 py-1.5 text-sm text-fg-default hover:bg-canvas-subtle"
            >
              {open ? '이슈 닫기' : '다시 열기'}
            </button>
          }
        />
      </div>
    </div>
  );
}
