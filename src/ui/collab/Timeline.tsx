// src/ui/collab/Timeline.tsx — 이슈/PR 공통 코멘트 타임라인 아이템 + 입력 박스

import { useState } from 'react';

import type { Comment } from '../../store/world';
import Avatar from '../common/Avatar';
import Markdown from '../common/Markdown';
import { timeAgo } from '../lib/time';

export function TimelineItem({
  author,
  body,
  createdAt,
  badge,
}: {
  author: string;
  body: string;
  createdAt: number;
  badge?: string;
}) {
  return (
    <div className="rounded border border-border-default">
      <div className="flex items-center gap-2 bg-canvas-subtle px-3 py-1.5 border-b border-border-default text-xs text-fg-muted">
        <Avatar seed={author} size={20} />
        <span className="font-semibold text-fg-default">{author}</span>
        <span>· {timeAgo(createdAt)}</span>
        {badge && (
          <span className="ml-auto rounded-full bg-canvas-inset px-2 text-[11px]">
            {badge}
          </span>
        )}
      </div>
      <div className="px-3 py-2">
        {body.trim() ? (
          <Markdown content={body} />
        ) : (
          <span className="text-xs text-fg-subtle">내용 없음</span>
        )}
      </div>
    </div>
  );
}

export function CommentList({ comments }: { comments: Comment[] }) {
  return (
    <>
      {comments.map((c) => (
        <TimelineItem
          key={c.id}
          author={c.author}
          body={c.body}
          createdAt={c.createdAt}
        />
      ))}
    </>
  );
}

export function CommentBox({
  onSubmit,
  extra,
}: {
  onSubmit: (body: string) => void;
  extra?: React.ReactNode;
}) {
  const [body, setBody] = useState('');
  return (
    <div className="rounded border border-border-default">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="코멘트 남기기 (마크다운 지원)"
        className="w-full h-24 resize-y bg-canvas-inset rounded-t px-3 py-2 text-sm text-fg-default outline-none"
      />
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-border-default">
        {extra}
        <button
          onClick={() => {
            if (!body.trim()) return;
            onSubmit(body.trim());
            setBody('');
          }}
          disabled={!body.trim()}
          className="rounded bg-success-emphasis px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Comment
        </button>
      </div>
    </div>
  );
}
