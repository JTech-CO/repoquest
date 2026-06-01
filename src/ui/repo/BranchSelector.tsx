// src/ui/repo/BranchSelector.tsx
//
// 브랜치 전환 드롭다운. 선택 시 해당 브랜치의 Code 뷰로 이동.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranchIcon,
  TriangleDownIcon,
  CheckIcon,
} from '@primer/octicons-react';

import type { RemoteRepo } from '../../store/world';
import { listBranches } from '../lib/repoView';
import { codeUrl } from '../lib/repoRoute';

export default function BranchSelector({
  repo,
  branch,
}: {
  repo: RemoteRepo;
  branch: string;
}) {
  const branches = listBranches(repo);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="inline-flex items-center gap-2 rounded border border-border-default bg-canvas-subtle px-3 py-1.5 text-sm text-fg-default hover:bg-canvas-inset"
      >
        <GitBranchIcon size={16} className="text-fg-muted" />
        <span className="font-semibold">{branch}</span>
        <TriangleDownIcon size={14} className="text-fg-muted" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-64 rounded border border-border-default bg-canvas-overlay shadow-lg">
          <div className="px-3 py-2 text-xs text-fg-muted border-b border-border-muted">
            브랜치 전환 ({branches.length})
          </div>
          <ul className="max-h-64 overflow-auto py-1">
            {branches.map((b) => (
              <li key={b}>
                <button
                  type="button"
                  onMouseDown={() => {
                    setOpen(false);
                    navigate(codeUrl(repo.owner, repo.name, b));
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-canvas-subtle"
                >
                  <CheckIcon
                    size={14}
                    className={b === branch ? 'text-fg-default' : 'invisible'}
                  />
                  <span className="text-fg-default">{b}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
