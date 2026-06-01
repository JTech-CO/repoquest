// src/ui/coach/MissionPanel.tsx — 가이드 미션 진행 + 현재 미션 힌트

import {
  CheckCircleFillIcon,
  CircleIcon,
  LockIcon,
  DotFillIcon,
} from '@primer/octicons-react';

import { useWorld } from '../../store/world';
import {
  missions,
  evaluateMissions,
  getActiveMission,
  isMissionUnlocked,
  overallProgress,
} from '../../tutorial/missions';

export default function MissionPanel() {
  const world = useWorld();
  const evals = evaluateMissions(world);
  const completeById = Object.fromEntries(evals.map((e) => [e.id, e.complete]));
  const active = getActiveMission(world);
  const progress = overallProgress(world);
  const ordered = [...missions].sort((a, b) => a.order - b.order);
  const doneCount = evals.filter((e) => e.complete).length;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
          <span>진행도</span>
          <span>
            {doneCount} / {ordered.length}
          </span>
        </div>
        <div className="h-2 rounded-full bg-canvas-inset overflow-hidden">
          <div
            className="h-full bg-success-emphasis transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        {progress >= 1 && (
          <p className="mt-2 text-sm text-success-fg font-semibold">
            🎉 모든 미션 완료! Git/GitHub 핵심 흐름을 다 익혔습니다.
          </p>
        )}
      </div>

      <ol className="space-y-2">
        {ordered.map((m, idx) => {
          const complete = completeById[m.id];
          const isActive = active?.id === m.id;
          const unlocked = isMissionUnlocked(world, idx) || complete;
          return (
            <li
              key={m.id}
              className={`rounded border p-3 ${
                isActive
                  ? 'border-accent-emphasis bg-accent-subtle'
                  : 'border-border-default bg-canvas-default'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5">
                  {complete ? (
                    <CheckCircleFillIcon size={16} className="text-success-fg" />
                  ) : !unlocked ? (
                    <LockIcon size={16} className="text-fg-subtle" />
                  ) : isActive ? (
                    <DotFillIcon size={16} className="text-accent-fg" />
                  ) : (
                    <CircleIcon size={16} className="text-fg-muted" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-fg-default">
                    {m.order}. {m.title}
                  </div>
                  {(isActive || (!complete && unlocked)) && (
                    <p className="mt-1 text-xs text-fg-muted">{m.brief}</p>
                  )}

                  {isActive && (
                    <ul className="mt-2 space-y-1 text-xs text-fg-muted list-disc pl-4">
                      {m.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  )}

                  {complete && (
                    <p className="mt-1 text-xs text-success-fg">{m.takeaway}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
