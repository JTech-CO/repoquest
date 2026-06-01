// src/github/clone.ts
//
// Clone = 서버 → 내 PC 복제.
//   - 서버의 모든 객체(blob/tree/commit) 를 로컬로 복사.
//   - 서버의 모든 refs/heads/* 를 로컬에 동일 이름으로 만든다.
//   - 동시에 refs/remotes/origin/* 트래킹 ref 도 셋업한다(같은 커밋을 가리킴).
//   - HEAD 는 defaultBranch 로 두고, workingDir/index 는 그 tip 의 스냅샷으로 체크아웃.

import type { RemoteRepo } from '../store/world';
import type { LocalClone, Refs } from '../engine/types';
import { HEADS_PREFIX, ORIGIN_PREFIX } from '../engine/types';
import { snapshotOf } from '../engine/objects';
import { shallowCopyStore } from './_objectCopy';

export interface CloneInput {
  source: RemoteRepo;
  cloneId?: string;
}

export function clone(input: CloneInput): LocalClone {
  const { source } = input;
  const id = input.cloneId ?? defaultCloneId(source.owner, source.name);

  const objects = shallowCopyStore(source.objects);

  // refs/heads/* → 로컬 refs/heads/* + refs/remotes/origin/*
  const refs: Refs = {};
  for (const [ref, cid] of Object.entries(source.refs)) {
    if (ref.startsWith(HEADS_PREFIX)) {
      const name = ref.slice(HEADS_PREFIX.length);
      refs[HEADS_PREFIX + name] = cid;
      refs[ORIGIN_PREFIX + name] = cid;
    }
  }

  const defaultBranch = source.defaultBranch || 'main';
  const headRef = HEADS_PREFIX + defaultBranch;
  if (!refs[headRef]) {
    // 서버에 default branch 가 없는(=빈) 저장소도 학습용으로 허용.
    // HEAD 는 미래에 만들 브랜치 이름표만 가진다(아직 가리키는 커밋 없음).
    return {
      id,
      remoteRepoId: source.id,
      objects,
      refs,
      head: { type: 'branch', ref: headRef },
      workingDir: {},
      index: {},
    };
  }

  const tip = refs[headRef];
  const snap = snapshotOf(objects, tip);

  return {
    id,
    remoteRepoId: source.id,
    objects,
    refs,
    head: { type: 'branch', ref: headRef },
    workingDir: { ...snap },
    index: { ...snap },
  };
}

function defaultCloneId(owner: string, name: string): string {
  return `clone_${owner}__${name}`;
}
