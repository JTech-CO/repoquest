// src/github/mergePr.ts
//
// Pull Request 머지(서버 측). fast-forward / merge commit / squash 세 전략.
// 엔진(mergeBase/threeWayMerge/snapshotOf/buildTreeFromFiles/writeCommit)을 재사용한다.
//
// fork→upstream PR 도 지원: sourceRepo(내 fork)의 브랜치를 targetRepo(원본)로 가져와 합친다.
// 충돌(같은 파일 양쪽 수정)이면 서버 머지는 거부하고 conflict 를 알려준다
// (충돌 해소는 로컬에서 pull/merge 후 다시 push 하는 흐름으로 — 미션 8).

import type { RemoteRepo } from '../store/world';
import { HEADS_PREFIX } from '../engine/types';
import { buildTreeFromFiles, snapshotOf, writeCommit } from '../engine/objects';
import { mergeBase, threeWayMerge } from '../engine/merge';
import { copyCommitClosure, shallowCopyStore } from './_objectCopy';

export type MergeStrategy = 'ff' | 'merge' | 'squash';

export interface MergePrInput {
  targetRepo: RemoteRepo; // PR 을 받는(합쳐지는) 저장소
  sourceRepo: RemoteRepo; // 변경이 출발한 저장소(fork→upstream 이면 다름)
  sourceBranch: string;
  targetBranch: string;
  strategy: MergeStrategy;
  author: string;
  title: string;
  timestamp?: number;
}

export type MergePrResult =
  | { status: 'up-to-date'; repo: RemoteRepo; commitId: string }
  | { status: 'fast-forward'; repo: RemoteRepo; commitId: string }
  | { status: 'merged'; repo: RemoteRepo; commitId: string; squashed: boolean }
  | { status: 'conflict'; conflicts: string[] };

export function mergePullRequest(input: MergePrInput): MergePrResult {
  const { targetRepo, sourceRepo, sourceBranch, targetBranch, strategy, author } = input;
  const ts = input.timestamp ?? Date.now();

  // 1) source 의 커밋/트리/blob 을 target objects 로 복사
  const objects = shallowCopyStore(targetRepo.objects);
  const theirs = sourceRepo.refs[HEADS_PREFIX + sourceBranch];
  if (!theirs) throw new Error(`source 브랜치를 찾을 수 없습니다: ${sourceBranch}`);
  copyCommitClosure(sourceRepo.objects, objects, theirs);

  const ours = targetRepo.refs[HEADS_PREFIX + targetBranch];

  const setBranch = (commitId: string): RemoteRepo => ({
    ...targetRepo,
    objects,
    refs: { ...targetRepo.refs, [HEADS_PREFIX + targetBranch]: commitId },
  });

  // target 이 비어 있으면 그냥 source 로 fast-forward
  if (!ours) {
    return { status: 'fast-forward', repo: setBranch(theirs), commitId: theirs };
  }

  const base = mergeBase(objects, ours, theirs);
  if (base === theirs) {
    return { status: 'up-to-date', repo: targetRepo, commitId: ours };
  }

  // 충돌 검사 (모든 전략 공통)
  const baseFiles = base ? snapshotOf(objects, base) : {};
  const ourFiles = snapshotOf(objects, ours);
  const theirFiles = snapshotOf(objects, theirs);
  const { files, conflicts } = threeWayMerge(baseFiles, ourFiles, theirFiles, sourceBranch);
  if (conflicts.length > 0) {
    return { status: 'conflict', conflicts };
  }

  // fast-forward: 우리가 base 일 때만 가능(이력 갈라지지 않음)
  if (strategy === 'ff' && base === ours) {
    return { status: 'fast-forward', repo: setBranch(theirs), commitId: theirs };
  }

  // squash: source 변경을 target 위 단일 커밋으로(부모 1개)
  if (strategy === 'squash') {
    const treeId = buildTreeFromFiles(objects, files);
    const commitId = writeCommit(objects, {
      treeId,
      parentIds: [ours],
      author,
      message: `${input.title} (squash)`,
      timestamp: ts,
    });
    return { status: 'merged', repo: setBranch(commitId), commitId, squashed: true };
  }

  // merge commit: 부모 2개(ff 불가한 경우도 여기로 fallback)
  const treeId = buildTreeFromFiles(objects, files);
  const commitId = writeCommit(objects, {
    treeId,
    parentIds: [ours, theirs],
    author,
    message: `Merge pull request: ${input.title}`,
    timestamp: ts,
  });
  return { status: 'merged', repo: setBranch(commitId), commitId, squashed: false };
}

/** UI 가 ff 옵션을 노출할지 판단: target 이 비었거나 base===ours 면 ff 가능 */
export function canFastForward(
  targetRepo: RemoteRepo,
  sourceRepo: RemoteRepo,
  sourceBranch: string,
  targetBranch: string,
): boolean {
  const objects = shallowCopyStore(targetRepo.objects);
  const theirs = sourceRepo.refs[HEADS_PREFIX + sourceBranch];
  if (!theirs) return false;
  copyCommitClosure(sourceRepo.objects, objects, theirs);
  const ours = targetRepo.refs[HEADS_PREFIX + targetBranch];
  if (!ours) return true;
  return mergeBase(objects, ours, theirs) === ours;
}
