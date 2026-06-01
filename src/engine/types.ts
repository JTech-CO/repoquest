// src/engine/types.ts
//
// Git 객체 모델의 "단일 출처(single source of truth)".
// store/world.ts 는 이 타입들을 import/re-export 해서 쓴다:
//   export type { Blob, Tree, Commit, ObjectStore, Refs, Head, LocalClone } from '../engine/types';
//
// 엔진은 GitHub 도메인(RemoteRepo, PR, Issue)을 모른다. 오직 로컬 저장소(LocalClone)만 다룬다.
// push/pull 같은 서버 연동은 github/ 레이어가 이 엔진 위에서 LocalClone <-> RemoteRepo 를 잇는다.

/** 파일 내용 하나 (content-addressed) */
export interface Blob {
  id: string;
  content: string;
}

/** 디렉터리 한 칸의 항목 */
export interface TreeEntry {
  name: string;
  type: 'blob' | 'tree';
  id: string;
}

/** 디렉터리 스냅샷 */
export interface Tree {
  id: string;
  entries: TreeEntry[];
}

/** 커밋 = "어느 시점의 전체 스냅샷(tree) + 부모(들)" */
export interface Commit {
  id: string;
  treeId: string;
  parentIds: string[]; // 0=최초, 1=일반, 2+=머지 커밋
  author: string;
  message: string;
  timestamp: number;
}

/** 내용 해시로 색인되는 객체 저장소 */
export interface ObjectStore {
  blobs: Record<string, Blob>;
  trees: Record<string, Tree>;
  commits: Record<string, Commit>;
}

export type RefName = string; // 'refs/heads/main', 'refs/remotes/origin/main', 'refs/tags/v1'...
export type Refs = Record<RefName, string /* commitId */>;

/** HEAD: 지금 어디에 있나 */
export type Head =
  | { type: 'branch'; ref: RefName } // 정상 상태
  | { type: 'detached'; commitId: string }; // detached HEAD (가르치기 좋은 상태)

/** 머지 진행 중 상태(충돌 해소 → commit 으로 마무리) */
export interface MergeState {
  theirCommit: string; // 합쳐 들어오는 쪽 커밋
  theirLabel: string; // 표시용 라벨(브랜치명 등)
  message: string; // 머지 커밋 기본 메시지
  conflicts: string[]; // 충돌난 파일 경로
}

/** 사용자가 clone 하면 생기는 로컬 저장소 */
export interface LocalClone {
  id: string;
  remoteRepoId: string; // origin이 가리키는 서버 repo id
  objects: ObjectStore;
  refs: Refs; // refs/heads/* + refs/remotes/origin/*
  head: Head;
  workingDir: Record<string, string>; // 경로 → 내용 (편집 중인 작업본)
  index: Record<string, string>; // 스테이징 영역(다음 커밋 후보)
  mergeState?: MergeState; // 머지 충돌 중에만 존재
}

/** 경로→내용 평면 맵 (작업본/스테이징/스냅샷 공통 표현) */
export type FileMap = Record<string, string>;

export const HEADS_PREFIX = 'refs/heads/';
export const ORIGIN_PREFIX = 'refs/remotes/origin/';
