// src/ui/work/FileEditor.tsx
//
// 작업 디렉터리 파일 편집(에디터 저장에 해당). 저장하면 writeFile 로 workingDir 만 바뀐다
// — 아직 git 에 기록된 게 아니라는 점이 핵심(다음은 add → commit).

import { useEffect, useState } from 'react';
import { FileIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';

import { useWorld } from '../../store/world';
import { useTerminal } from './terminalStore';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function FileEditor({
  cloneId,
  selectedPath,
  onSelectFile,
}: {
  cloneId: string;
  selectedPath?: string;
  onSelectFile: (path: string | undefined) => void;
}) {
  const clone = useWorld((s) => s.localClones[cloneId]);
  const writeFile = useWorld((s) => s.actions.writeFile);
  const deleteFile = useWorld((s) => s.actions.deleteFile);

  const [draft, setDraft] = useState('');
  const [newPath, setNewPath] = useState('');

  const content = selectedPath ? clone?.workingDir[selectedPath] : undefined;

  useEffect(() => {
    setDraft(content ?? '');
  }, [selectedPath, content]);

  if (!clone) return null;
  const files = Object.keys(clone.workingDir).sort();

  function save() {
    if (!selectedPath) return;
    writeFile(cloneId, selectedPath, draft);
    useTerminal
      .getState()
      .run(
        `# 편집 저장: ${selectedPath}`,
        '작업 디렉터리 파일 변경(에디터 저장). 아직 git 에 기록되지 않음 — 다음은 add.',
      );
  }

  function createFile() {
    const p = newPath.trim();
    if (!p) return;
    if (clone && p in clone.workingDir) {
      useTerminal.getState().fail(`# new file ${p}`, '이미 존재하는 경로입니다.');
      return;
    }
    writeFile(cloneId, p, '');
    useTerminal.getState().run(`# 새 파일: ${p}`, '작업 디렉터리에 새 파일 생성.');
    setNewPath('');
    onSelectFile(p);
  }

  function removeFile() {
    if (!selectedPath) return;
    try {
      deleteFile(cloneId, selectedPath);
      useTerminal
        .getState()
        .run(`rm ${selectedPath}`, '작업 디렉터리에서 파일 삭제(스테이징하면 삭제가 커밋됨).');
      onSelectFile(undefined);
    } catch (e) {
      useTerminal.getState().fail(`rm ${selectedPath}`, errMsg(e));
    }
  }

  return (
    <div className="rounded border border-border-default bg-canvas-default">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border-muted">
        <FileIcon size={14} className="text-fg-muted" />
        <span className="text-xs font-semibold text-fg-default">파일 편집</span>
        <select
          value={selectedPath ?? ''}
          onChange={(e) => onSelectFile(e.target.value || undefined)}
          className="ml-auto bg-canvas-subtle border border-border-default rounded text-xs px-2 py-1 text-fg-default max-w-[55%]"
        >
          <option value="">파일 선택…</option>
          {files.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="p-3 space-y-2">
        {selectedPath ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-fg-muted truncate">
                {selectedPath}
              </span>
              <button
                onClick={removeFile}
                title="파일 삭제"
                className="text-fg-muted hover:text-danger-fg"
              >
                <TrashIcon size={14} />
              </button>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              className="w-full h-40 resize-y rounded border border-border-default bg-canvas-inset p-2 font-mono text-xs text-fg-default outline-none focus:border-accent-emphasis"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={save}
                disabled={draft === (content ?? '')}
                className="rounded bg-accent-emphasis px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
              >
                저장 (workingDir)
              </button>
              {draft !== (content ?? '') && (
                <span className="text-[11px] text-attention-fg">
                  저장하지 않은 변경
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-fg-subtle">
            왼쪽 세 트리나 위 셀렉터에서 파일을 선택하면 편집할 수 있습니다.
          </p>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border-muted">
          <input
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="새 파일 경로 (예: docs/note.md)"
            className="flex-1 bg-canvas-subtle border border-border-default rounded text-xs px-2 py-1 text-fg-default outline-none"
          />
          <button
            onClick={createFile}
            className="inline-flex items-center gap-1 rounded border border-border-default px-2 py-1 text-xs text-fg-default hover:bg-canvas-subtle"
          >
            <PlusIcon size={12} /> 추가
          </button>
        </div>
      </div>
    </div>
  );
}
