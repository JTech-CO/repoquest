// src/engine/objects.ts
//
// blob/tree/commit 의 생성과 내용 해싱.
//
// ⚠️ 순수성 규칙: 이 파일의 write* 함수들은 전달받은 ObjectStore를 "직접 변경(mutate)"한다.
//    객체는 내용 해시로 색인되어 사실상 불변(immutable)이므로, 같은 내용을 다시 써도 같은 id가 나와
//    덮어쓰기가 안전하다(= 진짜 Git의 content-addressing 학습 포인트).
//    상위 commands.ts 는 명령 시작 시 store를 복제하므로, 공개 API 경계에서는 순수성이 유지된다.

import type {
  Commit,
  ObjectStore,
  TreeEntry,
  FileMap,
} from './types';

// ──────────────────────────────────────────────────────────────────────────
// 해시: 실제 Git은 SHA-1/256을 쓰지만, 학습 가독성을 위해 짧은 결정적 해시(7 hex)를 쓴다.
// 내용이 같으면 id도 같다 — 이것이 핵심(중복 객체 자동 dedup).
// ──────────────────────────────────────────────────────────────────────────
function fnv1a(input: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 결정적 7자리 hex id */
export function hashContent(payload: string): string {
  const a = fnv1a(payload, 0x811c9dc5);
  const b = fnv1a(payload + '\u0001', 0x12345678);
  // 두 패스를 섞어 충돌 확률을 낮춘 뒤 앞 7자리만 사용
  const hex = (a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0'));
  return hex.slice(0, 7);
}

export function emptyStore(): ObjectStore {
  return { blobs: {}, trees: {}, commits: {} };
}

// ── 객체 writer (store mutate) ──────────────────────────────────────────────
export function writeBlob(store: ObjectStore, content: string): string {
  const id = hashContent('blob\u0000' + content);
  store.blobs[id] = { id, content };
  return id;
}

function serializeTree(entries: TreeEntry[]): string {
  return entries
    .slice()
    .sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0))
    .map((e) => `${e.type} ${e.id} ${e.name}`)
    .join('\n');
}

export function writeTree(store: ObjectStore, entries: TreeEntry[]): string {
  const sorted = entries
    .slice()
    .sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
  const id = hashContent('tree\u0000' + serializeTree(sorted));
  store.trees[id] = { id, entries: sorted };
  return id;
}

export function writeCommit(
  store: ObjectStore,
  c: Omit<Commit, 'id'>,
): string {
  const payload =
    'commit\u0000' +
    c.treeId +
    '\u0000' +
    c.parentIds.join(',') +
    '\u0000' +
    c.author +
    '\u0000' +
    c.message +
    '\u0000' +
    c.timestamp;
  const id = hashContent(payload);
  store.commits[id] = { id, ...c };
  return id;
}

// ── 평면 FileMap <-> 중첩 Tree 변환 ──────────────────────────────────────────
// workingDir/index 는 'a/b/c.js' 같은 평면 경로 맵이라 편집이 쉽다.
// 하지만 커밋에는 진짜 Git처럼 중첩 tree(디렉터리)로 저장해, 객체 인스펙터에서 blob→tree→commit 그래프를 보여준다.

interface TreeNode {
  blobs: Record<string, string>; // name → content
  dirs: Record<string, TreeNode>;
}
function newNode(): TreeNode {
  return { blobs: {}, dirs: {} };
}

export function buildTreeFromFiles(store: ObjectStore, files: FileMap): string {
  const root = newNode();
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/').filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      node.dirs[dir] ??= newNode();
      node = node.dirs[dir];
    }
    node.blobs[parts[parts.length - 1]] = content;
  }
  return writeTreeNode(store, root);
}

function writeTreeNode(store: ObjectStore, node: TreeNode): string {
  const entries: TreeEntry[] = [];
  for (const [name, content] of Object.entries(node.blobs)) {
    entries.push({ name, type: 'blob', id: writeBlob(store, content) });
  }
  for (const [name, sub] of Object.entries(node.dirs)) {
    entries.push({ name, type: 'tree', id: writeTreeNode(store, sub) });
  }
  return writeTree(store, entries);
}

/** tree id → 평면 FileMap 복원 */
export function readTree(
  store: ObjectStore,
  treeId: string | undefined,
  prefix = '',
): FileMap {
  const out: FileMap = {};
  if (!treeId) return out;
  const tree = store.trees[treeId];
  if (!tree) return out;
  for (const e of tree.entries) {
    const p = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.type === 'blob') {
      out[p] = store.blobs[e.id]?.content ?? '';
    } else {
      Object.assign(out, readTree(store, e.id, p));
    }
  }
  return out;
}

/** 커밋 id → 그 시점의 평면 FileMap */
export function snapshotOf(store: ObjectStore, commitId?: string): FileMap {
  if (!commitId) return {};
  return readTree(store, store.commits[commitId]?.treeId);
}

// ── 커밋 그래프 헬퍼 ─────────────────────────────────────────────────────────
/** start 에서 부모를 따라 도달 가능한 모든 커밋 id */
export function reachable(
  commits: Record<string, Commit>,
  start?: string,
): Set<string> {
  const seen = new Set<string>();
  if (!start) return seen;
  const stack = [start];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    const c = commits[id];
    if (!c) continue;
    seen.add(id);
    for (const p of c.parentIds ?? []) stack.push(p);
  }
  return seen;
}
