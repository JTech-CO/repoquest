// src/ui/lib/tree.ts
//
// 평면 FileMap('a/b/c.txt' → 내용) 을 GitHub 파일 테이블처럼 "한 디렉터리 레벨씩" 보여주기 위한 헬퍼.

import type { FileMap } from '../../engine/types';

export interface DirEntry {
  name: string;
  type: 'dir' | 'file';
  path: string; // 루트 기준 전체 경로
}

/**
 * dirPath('' = 루트) 바로 아래의 항목들.
 * 디렉터리 먼저, 그다음 파일. 각각 이름순(대소문자 무시).
 */
export function listDir(files: FileMap, dirPath: string): DirEntry[] {
  const prefix = dirPath ? dirPath.replace(/\/+$/, '') + '/' : '';
  const dirs = new Set<string>();
  const fileEntries: DirEntry[] = [];

  for (const path of Object.keys(files)) {
    if (prefix && !path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    if (!rest) continue;
    const slash = rest.indexOf('/');
    if (slash === -1) {
      fileEntries.push({ name: rest, type: 'file', path });
    } else {
      dirs.add(rest.slice(0, slash));
    }
  }

  const dirEntries: DirEntry[] = [...dirs].map((name) => ({
    name,
    type: 'dir',
    path: prefix + name,
  }));

  const byName = (a: DirEntry, b: DirEntry) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  dirEntries.sort(byName);
  fileEntries.sort(byName);
  return [...dirEntries, ...fileEntries];
}

export function isDir(files: FileMap, path: string): boolean {
  const prefix = path.replace(/\/+$/, '') + '/';
  return Object.keys(files).some((p) => p.startsWith(prefix));
}

/** 디렉터리 경로를 빵부스러기(breadcrumb) 세그먼트로 분해 */
export function breadcrumbs(path: string): { name: string; path: string }[] {
  if (!path) return [];
  const parts = path.split('/').filter(Boolean);
  const out: { name: string; path: string }[] = [];
  let acc = '';
  for (const p of parts) {
    acc = acc ? `${acc}/${p}` : p;
    out.push({ name: p, path: acc });
  }
  return out;
}

/** README.* 후보 중 첫 번째 경로(루트 우선) */
export function findReadme(files: FileMap, dirPath = ''): string | undefined {
  const prefix = dirPath ? dirPath.replace(/\/+$/, '') + '/' : '';
  const candidates = Object.keys(files)
    .filter((p) => {
      const rest = p.slice(prefix.length);
      return p.startsWith(prefix) && !rest.includes('/') && /^readme(\.md|\.markdown|\.txt)?$/i.test(rest);
    })
    .sort();
  return candidates[0];
}
