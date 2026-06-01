// src/github/fork.ts
//
// Fork = "GitHub 서버 안에서의" 저장소 복사.
//   - 내 PC로 다운로드되지 않는다(그건 clone 이다).
//   - forkOf 로 원본 repo id 를 기억해 둔다(추후 PR 의 base/upstream 추적용).
//   - issues / pullRequests 는 포함하지 않는다(내 fork 는 새 협업 공간).
//   - stars 는 0 으로 초기화(개인 복사본).

import type { RemoteRepo } from '../store/world';
import { shallowCopyStore } from './_objectCopy';

export interface ForkInput {
  source: RemoteRepo; // 원본 저장소
  intoOwner: string; // 새 소유자(보통 현재 사용자)
  forkRepoId?: string; // 새 RemoteRepo.id (없으면 자동 생성)
  timestamp?: number;
}

export function fork(input: ForkInput): RemoteRepo {
  const { source, intoOwner } = input;
  if (source.owner === intoOwner) {
    throw new Error('자기 자신의 저장소는 fork 할 수 없습니다.');
  }
  const id = input.forkRepoId ?? defaultForkId(intoOwner, source.name);
  return {
    id,
    owner: intoOwner,
    name: source.name,
    description: source.description,
    isPrivate: source.isPrivate,
    defaultBranch: source.defaultBranch,
    forkOf: source.id,
    stars: 0,
    // 객체와 refs 는 원본을 그대로 가져온다(같은 커밋 그래프에서 출발).
    objects: shallowCopyStore(source.objects),
    refs: { ...source.refs },
    issues: [],
    pullRequests: [],
    createdAt: input.timestamp ?? Date.now(),
  };
}

function defaultForkId(owner: string, name: string): string {
  return `repo_${owner}__${name}`;
}
