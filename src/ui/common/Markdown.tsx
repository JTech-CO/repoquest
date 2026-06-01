// src/ui/common/Markdown.tsx
//
// README 등 마크다운 렌더링. react-markdown + remark-gfm(GFM 표/체크박스/취소선).
// 스타일은 index.css 의 .md-body 에 모아둔다(비개발자도 톤 조정 가능).

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Markdown({ content }: { content: string }) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 링크는 시뮬레이터 내부이므로 새 탭/외부 이동 없이 표시만
          a: ({ children, href }) => (
            <a href={href} onClick={(e) => e.preventDefault()} className="cursor-default">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
