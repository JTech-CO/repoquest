// src/ui/collab/NewIssue.tsx — 이슈 생성 폼

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { RemoteRepo } from '../../store/world';
import { createIssue } from '../../store/collabActions';
import { issueUrl, issuesUrl } from '../lib/repoRoute';
import { ALL_LABELS, LabelBadge } from './labels';

export default function NewIssue({ repo }: { repo: RemoteRepo }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [labels, setLabels] = useState<string[]>([]);

  function toggle(l: string) {
    setLabels((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  }

  function submit() {
    if (!title.trim()) return;
    const n = createIssue(repo.id, { title: title.trim(), body, labels });
    navigate(issueUrl(repo.owner, repo.name, n));
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-fg-default mb-4">새 이슈</h1>

      <label className="block text-sm text-fg-muted mb-1">제목</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="이슈 제목"
        className="w-full bg-canvas-inset border border-border-default rounded px-3 py-2 text-fg-default outline-none focus:border-accent-emphasis mb-4"
      />

      <label className="block text-sm text-fg-muted mb-1">본문</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="재현 방법 · 기대 동작 · 실제 동작을 구체적으로 적으면 좋습니다 (마크다운 지원)"
        className="w-full h-40 resize-y bg-canvas-inset border border-border-default rounded px-3 py-2 text-fg-default font-mono text-sm outline-none focus:border-accent-emphasis mb-4"
      />

      <div className="mb-4">
        <span className="block text-sm text-fg-muted mb-1">라벨</span>
        <div className="flex flex-wrap gap-2">
          {ALL_LABELS.map((l) => (
            <button
              key={l}
              onClick={() => toggle(l)}
              className={`rounded-full border px-2 py-0.5 text-xs ${
                labels.includes(l)
                  ? 'border-accent-emphasis bg-accent-subtle'
                  : 'border-border-default opacity-60'
              }`}
            >
              <LabelBadge label={l} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={!title.trim()}
          className="rounded bg-success-emphasis px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          이슈 생성
        </button>
        <Link
          to={issuesUrl(repo.owner, repo.name)}
          className="text-sm text-fg-muted hover:text-fg-default"
        >
          취소
        </Link>
      </div>
    </div>
  );
}
