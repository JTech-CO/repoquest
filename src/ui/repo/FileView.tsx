// src/ui/repo/FileView.tsx
//
// 단일 파일 보기. highlight.js 로 확장자 기반 하이라이트(미지원이면 자동 감지).
// 줄 번호 gutter + 코드 본문. README 류 파일을 열면 ReadmeViewed 신호 기록.

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileIcon } from '@primer/octicons-react';

import hljs from '../lib/hljs';

import type { RemoteRepo } from '../../store/world';
import { useWorld } from '../../store/world';
import { TutorialEvents } from '../../tutorial/missions';
import { filesAt } from '../lib/repoView';
import { breadcrumbs } from '../lib/tree';
import { codeUrl } from '../lib/repoRoute';
import NotFound from '../pages/NotFound';

const EXT_LANG: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  html: 'xml',
  xml: 'xml',
  css: 'css',
  md: 'markdown',
  markdown: 'markdown',
  c: 'c',
  h: 'c',
  py: 'python',
  sh: 'bash',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function FileView({
  repo,
  branch,
  path,
}: {
  repo: RemoteRepo;
  branch: string;
  path: string;
}) {
  const files = filesAt(repo, branch);
  const content = files[path];
  const recordEvent = useWorld((s) => s.actions.recordEvent);
  const fileName = path.split('/').pop() ?? path;
  const isReadme = /^readme(\.|$)/i.test(fileName);

  useEffect(() => {
    if (content !== undefined && isReadme) {
      recordEvent(TutorialEvents.ReadmeViewed);
    }
  }, [content, isReadme, recordEvent]);

  if (content === undefined) {
    return <NotFound message={`파일 '${path}' 를 찾을 수 없습니다.`} />;
  }

  const ext = (fileName.includes('.') ? fileName.split('.').pop() : '') ?? '';
  const lang = EXT_LANG[ext.toLowerCase()];
  let html: string;
  try {
    html =
      lang && hljs.getLanguage(lang)
        ? hljs.highlight(content, { language: lang }).value
        : hljs.highlightAuto(content).value;
  } catch {
    html = escapeHtml(content);
  }

  const lines = content.split('\n');
  const crumbs = breadcrumbs(path);

  return (
    <div>
      <div className="text-sm text-fg-muted">
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

      <div className="mt-3 rounded border border-border-default overflow-hidden">
        <div className="flex items-center gap-2 bg-canvas-subtle px-4 py-2 text-xs border-b border-border-default text-fg-muted">
          <FileIcon size={14} />
          <span className="text-fg-default">{fileName}</span>
          <span>· {lines.length} lines</span>
        </div>
        <div className="flex overflow-x-auto text-[13px] font-mono leading-5">
          <div className="select-none shrink-0 text-right py-2 pl-4 pr-3 text-fg-subtle border-r border-border-muted">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="hljs flex-1 py-2 px-4 !bg-transparent">
            <code dangerouslySetInnerHTML={{ __html: html }} />
          </pre>
        </div>
      </div>
    </div>
  );
}
