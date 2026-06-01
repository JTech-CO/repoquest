// src/github/push.ts
//
// Push = 로컬→서버 전송.
//   - 현재(또는 지정한) 브랜치의 tip 으로부터 도달 가능한 커밋·tree·blob 을 서버로 복사.
//   - 성공 시 서버의 refs/heads/<branch> 와 로컬의 refs/remotes/origin/<branch> 를 동시에 갱신.
//     (= 로컬은 push 직후 그 브랜치 기준 ahead=0 이 된다 → 배지가 사라지는 시각 신호)
//
// 거부 조건(중요한 학습 포인트):
//   - 원격 tip 이 로컬 tip 에서 도달 불가 → "non-fast-forward" 로 거부.
//     이때 사용자에게 pull 후 다시 push 하라고 안내한다.
//   - force: true 면 무시하고 덮어쓴다("force push 의 위험" 학습용 — 동료 커밋이 사라질 수 있음).

import type { LocalClone } from '../engine/types';
import { HEADS_PREFIX, ORIGIN_PREFIX } from '../engine/types';
import { reachable } from '../engine/objects';
import { currentBranch } from '../engine/refs';
import type { RemoteRepo } from '../store/world';
import { copyCommitClosure, shallowCopyStore } from './_objectCopy';

export class NonFastForwardError extends Error {
  constructor(public branch: string) {
    super(
      `push 가 거부되었습니다: 원격이 더 앞서거나 갈라졌습니다. ` +
        `먼저 pull 로 합친 뒤 다시 push 하세요. (브랜치: ${branch})`,
    );
    this.name = 'NonFastForwardError';
  }
}

export class DetachedPushError extends Error {
  constructor() {
    super('detached HEAD 에서는 push 할 브랜치를 알 수 없습니다.');
    this.name = 'DetachedPushError';
  }
}

export interface PushInput {
  clone: LocalClone;
  remote: RemoteRepo;
  /** 기본: 현재 브랜치 */
  branch?: string;
  force?: boolean;
}

export interface PushOutcome {
  /** origin/<branch> 가 갱신된 로컬 */
  clone: LocalClone;
  /** refs/heads/<branch> 가 갱신되고 새 객체가 추가된 원격 */
  remote: RemoteRepo;
  /** 새로 서버에 추가된 커밋 id 들 */
  pushed: string[];
  branch: string;
}

export function push(input: PushInput): PushOutcome {
  const branch = input.branch ?? currentBranch(input.clone) ?? '';
  if (!branch) throw new DetachedPushError();

  const localTip = input.clone.refs[HEADS_PREFIX + branch];
  if (!localTip) throw new Error(`로컬에 없는 브랜치: ${branch}`);

  const remoteTip = input.remote.refs[HEADS_PREFIX + branch];

  // 원격이 이미 있고, 로컬 tip 에서 도달 불가능하면 non-fast-forward.
  if (remoteTip && !input.force) {
    const localReach = reachable(input.clone.objects.commits, localTip);
    if (!localReach.has(remoteTip)) {
      throw new NonFastForwardError(branch);
    }
  }

  // 객체 복사: 로컬 → 원격
  const newRemoteObjects = shallowCopyStore(input.remote.objects);
  const pushed = copyCommitClosure(input.clone.objects, newRemoteObjects, localTip);

  const newRemote: RemoteRepo = {
    ...input.remote,
    objects: newRemoteObjects,
    refs: { ...input.remote.refs, [HEADS_PREFIX + branch]: localTip },
  };

  const newClone: LocalClone = {
    ...input.clone,
    refs: { ...input.clone.refs, [ORIGIN_PREFIX + branch]: localTip },
  };

  return { clone: newClone, remote: newRemote, pushed, branch };
}
