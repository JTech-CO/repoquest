// src/ui/work/SyncBar.tsx
//
// 로컬 ↔ origin 동기화 바. push(로컬→서버) / fetch·pull(서버→로컬) 의 "방향"을 화살표로 보여준다.
// ahead/behind 배지로 왜 push·pull 이 필요한지 스스로 깨닫게 한다(SPEC §6).

import { useState } from 'react';
import {
  DeviceDesktopIcon,
  ServerIcon,
  UploadIcon,
  DownloadIcon,
  SyncIcon,
} from '@primer/octicons-react';

import { useWorld } from '../../store/world';
import { aheadBehind, currentBranch } from '../../engine/refs';
import {
  pushBranch,
  fetchRemote,
  pullRemote,
  PushPermissionError,
  NonFastForwardError,
} from '../../store/githubActions';
import { useTerminal } from './terminalStore';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

type Flow = 'idle' | 'push' | 'pull';

export default function SyncBar({ cloneId }: { cloneId: string }) {
  const clone = useWorld((s) => s.localClones[cloneId]);
  const repo = useWorld((s) =>
    clone ? s.remoteRepos[clone.remoteRepoId] : undefined,
  );
  const [flow, setFlow] = useState<Flow>('idle');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  if (!clone || !repo) return null;
  const branch = currentBranch(clone);
  const ab = branch ? aheadBehind(clone, branch) : { ahead: 0, behind: 0 };

  function flash(kind: 'ok' | 'err', text: string) {
    setMsg({ kind, text });
    window.setTimeout(() => setMsg(null), 5000);
  }
  function animate(f: Flow) {
    setFlow(f);
    window.setTimeout(() => setFlow('idle'), 1200);
  }

  function doPush() {
    if (!branch) return;
    try {
      const r = pushBranch(cloneId, branch);
      useTerminal
        .getState()
        .run(
          `git push origin ${branch}`,
          `${r.pushed.length}개 커밋을 서버로 업로드 — 이제 이 브랜치는 origin 과 동기화됨(ahead=0).`,
        );
      animate('push');
      flash('ok', `push 완료: 커밋 ${r.pushed.length}개가 origin/${branch} 에 반영됐습니다.`);
    } catch (e) {
      useTerminal.getState().fail(`git push origin ${branch}`, errMsg(e));
      if (e instanceof PushPermissionError) {
        flash('err', errMsg(e));
      } else if (e instanceof NonFastForwardError) {
        flash('err', '원격이 더 앞서 있어 push 가 거부됐습니다. 먼저 Pull 로 합치세요.');
      } else {
        flash('err', errMsg(e));
      }
    }
  }

  function doFetch() {
    try {
      const r = fetchRemote(cloneId);
      useTerminal
        .getState()
        .run(
          'git fetch origin',
          `원격 추적 브랜치만 갱신(작업본은 그대로). 새 커밋 ${r.fetched.length}개.`,
        );
      animate('pull');
      flash('ok', `fetch 완료: 새 커밋 ${r.fetched.length}개를 받아왔습니다(아직 merge 전).`);
    } catch (e) {
      flash('err', errMsg(e));
    }
  }

  function doPull() {
    if (!branch) return;
    try {
      const r = pullRemote(cloneId);
      useTerminal
        .getState()
        .run(`git pull origin ${branch}`, `fetch + merge 결과: ${r.status}.`);
      animate('pull');
      if (r.status === 'conflict') {
        flash('err', `머지 충돌: ${r.conflicts.join(', ')} — 충돌을 해소하고 다시 커밋하세요.`);
      } else if (r.status === 'noop') {
        flash('ok', '원격에 해당 브랜치가 없어 변경이 없습니다.');
      } else {
        flash('ok', `pull 완료: ${r.status}`);
      }
    } catch (e) {
      flash('err', errMsg(e));
    }
  }

  return (
    <div className="mb-4 rounded border border-border-default bg-canvas-overlay px-4 py-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <DeviceDesktopIcon size={16} className="text-fg-muted" />
          <span className="text-fg-default font-semibold">로컬</span>
          {branch && (
            <span className="rounded bg-canvas-inset border border-border-muted px-1.5 text-xs text-fg-default">
              {branch}
            </span>
          )}
          {ab.ahead > 0 && <span className="text-xs text-success-fg">↑{ab.ahead}</span>}
          {ab.behind > 0 && <span className="text-xs text-attention-fg">↓{ab.behind}</span>}
          {ab.ahead === 0 && ab.behind === 0 && (
            <span className="text-xs text-fg-subtle">동기화됨</span>
          )}
        </div>

        <FlowArrow flow={flow} />

        <div className="flex items-center gap-2">
          <button
            onClick={doPush}
            disabled={ab.ahead === 0}
            data-concept="push"
            title={ab.ahead === 0 ? 'push 할 로컬 커밋이 없습니다' : '로컬 커밋을 origin 으로'}
            className="inline-flex items-center gap-1.5 rounded bg-success-emphasis px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <UploadIcon size={14} /> Push{ab.ahead > 0 ? ` ↑${ab.ahead}` : ''}
          </button>
          <button
            onClick={doFetch}
            data-concept="fetch"
            title="원격 변경을 가져오기만(작업본 불변)"
            className="inline-flex items-center gap-1.5 rounded border border-border-default px-3 py-1.5 text-sm text-fg-default hover:bg-canvas-subtle"
          >
            <SyncIcon size={14} /> Fetch
          </button>
          <button
            onClick={doPull}
            disabled={ab.behind === 0}
            data-concept="pull"
            title={ab.behind === 0 ? '가져올 원격 커밋이 없습니다' : 'fetch + merge'}
            className="inline-flex items-center gap-1.5 rounded border border-border-default px-3 py-1.5 text-sm text-fg-default hover:bg-canvas-subtle disabled:opacity-40"
          >
            <DownloadIcon size={14} /> Pull{ab.behind > 0 ? ` ↓${ab.behind}` : ''}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`mt-2 text-xs ${
            msg.kind === 'ok' ? 'text-success-fg' : 'text-danger-fg'
          }`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}

function FlowArrow({ flow }: { flow: Flow }) {
  if (flow === 'idle') {
    return (
      <div className="flex items-center gap-2 text-xs text-fg-subtle min-w-[140px] justify-center">
        <DeviceDesktopIcon size={14} />
        <span className="tracking-widest">· · ·</span>
        <ServerIcon size={14} />
      </div>
    );
  }
  const toServer = flow === 'push';
  return (
    <div className="flex items-center gap-2 text-accent-fg min-w-[140px] justify-center">
      {toServer ? <DeviceDesktopIcon size={14} /> : <ServerIcon size={14} />}
      <span className="font-mono animate-pulse tracking-widest">
        {toServer ? '→→→' : '←←←'}
      </span>
      {toServer ? <ServerIcon size={14} /> : <DeviceDesktopIcon size={14} />}
    </div>
  );
}
