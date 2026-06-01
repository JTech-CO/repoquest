// src/seed/seedWorld.ts
//
// 앱 부팅 시 World 의 초기 상태를 만든다. KICKOFF §3-(2):
//   - 실습용 원본 저장소 id 는 정확히 'repo_spoon-knife' (missions.PRACTICE_REPO_ID 와 일치)
//   - 가짜 유저 + 현재 사용자
//   - 가짜 레포 3~5개(README·여러 파일·여러 커밋·브랜치·기존 PR/Issue 포함)
//   - 최소 하나는 fork·PR 실습용
//   - 객체는 buildTreeFromFiles / writeCommit 으로만 생성(직접 손으로 만들지 말 것)
//
// main.tsx 에서 부팅 직후 useWorld.getState().actions.reset(seedWorld()) 로 주입한다.

import type {
  Comment,
  Issue,
  PullRequest,
  RemoteRepo,
  User,
  World,
} from '../store/world';
import type { FileMap, ObjectStore } from '../engine/types';
import { HEADS_PREFIX } from '../engine/types';
import {
  buildTreeFromFiles,
  emptyStore,
  writeCommit,
} from '../engine/objects';

// ───────────────────────────────────────────────────────────────────────────
// 결정적 시드 (매번 같은 결과가 나오도록 Date.UTC + 작은 헬퍼만 사용)
// ───────────────────────────────────────────────────────────────────────────
function T(y: number, m: number, d: number, hh = 9, mm = 0): number {
  return Date.UTC(y, m, d, hh, mm);
}

/** "한 줄짜리 작업본" 시리즈를 부모로 연결해 commit chain 을 만든다. */
interface CommitSpec {
  files: FileMap;
  author: string;
  message: string;
  timestamp: number;
}

function commitChain(
  store: ObjectStore,
  specs: CommitSpec[],
): string[] {
  const ids: string[] = [];
  let parent: string | undefined;
  for (const s of specs) {
    const treeId = buildTreeFromFiles(store, s.files);
    const cid = writeCommit(store, {
      treeId,
      parentIds: parent ? [parent] : [],
      author: s.author,
      message: s.message,
      timestamp: s.timestamp,
    });
    ids.push(cid);
    parent = cid;
  }
  return ids;
}

function comment(
  id: string,
  author: string,
  body: string,
  ts: number,
): Comment {
  return { id, author, body, createdAt: ts };
}

// ───────────────────────────────────────────────────────────────────────────
// 시드 레포 정의 (4개 — KICKOFF "3~5개" 범위)
//
//   1) repo_spoon-knife (octocat)  — 실습 원본. 미션 2·3·5 의 대상.
//   2) repo_hello-world (octocat) — 둘러보기·README 위주.
//   3) repo_linux       (torvalds)— 인기 레포 검색 결과 흉내, 브랜치 2개.
//   4) repo_octo-notes  (octocat) — 기존 PR·Issue 가 살아있는 협업 레포 학습용.
// ───────────────────────────────────────────────────────────────────────────

function buildSpoonKnife(): RemoteRepo {
  const objects = emptyStore();
  const chain = commitChain(objects, [
    {
      files: {
        'README.md':
          '# Spoon-Knife\n\nThis is a practice repository.\n\nFork → Clone → Edit → Pull Request 의 흐름을 익히는 데 사용하세요.',
        'index.html':
          '<!doctype html>\n<title>Spoon-Knife</title>\n<h1>Fork me 🍴🔪</h1>',
      },
      author: 'octocat',
      message: 'Initial commit',
      timestamp: T(2024, 0, 1),
    },
    {
      files: {
        'README.md':
          '# Spoon-Knife\n\nThis is a practice repository.\n\nFork → Clone → Edit → Pull Request 의 흐름을 익히는 데 사용하세요.\n\n## How to contribute\n1. Fork this repo.\n2. Clone your fork.\n3. Make a change on a new branch.\n4. Push and open a Pull Request.',
        'index.html':
          '<!doctype html>\n<title>Spoon-Knife</title>\n<h1>Fork me 🍴🔪</h1>',
        'CONTRIBUTING.md':
          '# Contributing\n\nWelcome! 이 레포는 학습용입니다. 자유롭게 fork 하고 PR 을 열어보세요.',
      },
      author: 'octocat',
      message: 'Add CONTRIBUTING and expand README',
      timestamp: T(2024, 0, 15),
    },
  ]);
  return {
    id: 'repo_spoon-knife', // ⚠️ missions.PRACTICE_REPO_ID 와 정확히 일치해야 함
    owner: 'octocat',
    name: 'spoon-knife',
    description: 'A repository for practicing GitHub flow.',
    isPrivate: false,
    defaultBranch: 'main',
    stars: 12_487,
    forks: 9_512,
    objects,
    refs: { [HEADS_PREFIX + 'main']: chain[chain.length - 1] },
    issues: [],
    pullRequests: [],
    createdAt: T(2024, 0, 1),
  };
}

function buildHelloWorld(): RemoteRepo {
  const objects = emptyStore();
  const chain = commitChain(objects, [
    {
      files: {
        'README.md':
          '# Hello, World!\n\n첫 번째 저장소. 간단한 README 만 들어 있습니다.',
      },
      author: 'octocat',
      message: 'First commit',
      timestamp: T(2023, 5, 11),
    },
    {
      files: {
        'README.md':
          '# Hello, World!\n\n첫 번째 저장소. 간단한 README 만 들어 있습니다.\n\n## 이 레포는 무엇인가요?\n- GitHub 의 가장 기본적인 모양을 보여주기 위한 시드 데이터입니다.\n- 파일 트리·커밋 히스토리·README 렌더링을 둘러보세요.',
        'index.js': 'console.log("Hello, world!");\n',
      },
      author: 'octocat',
      message: 'Add JS hello + expand README',
      timestamp: T(2023, 6, 3),
    },
    {
      files: {
        'README.md':
          '# Hello, World!\n\n첫 번째 저장소. 간단한 README 만 들어 있습니다.\n\n## 이 레포는 무엇인가요?\n- GitHub 의 가장 기본적인 모양을 보여주기 위한 시드 데이터입니다.\n- 파일 트리·커밋 히스토리·README 렌더링을 둘러보세요.\n\n## License\nMIT',
        'index.js': 'console.log("Hello, world!");\n',
        'LICENSE': 'MIT License\n\nCopyright (c) octocat\n',
      },
      author: 'octocat',
      message: 'Add LICENSE',
      timestamp: T(2023, 7, 20),
    },
  ]);
  return {
    id: 'repo_hello-world',
    owner: 'octocat',
    name: 'Hello-World',
    description: 'My first repository on GitHub!',
    isPrivate: false,
    defaultBranch: 'main',
    stars: 2_038,
    forks: 1_204,
    objects,
    refs: { [HEADS_PREFIX + 'main']: chain[chain.length - 1] },
    issues: [],
    pullRequests: [],
    createdAt: T(2023, 5, 11),
  };
}

function buildLinux(): RemoteRepo {
  const objects = emptyStore();
  // main 브랜치
  const main = commitChain(objects, [
    {
      files: {
        'README':
          'Linux kernel\n============\n\nThis is a tiny demo seed (not the real kernel).',
        'COPYING':
          'GPL-2.0\n',
        'MAINTAINERS':
          'Linus Torvalds  <torvalds@example.com>  M:  K:\n',
      },
      author: 'torvalds',
      message: 'Linux: initial seed (demo)',
      timestamp: T(2023, 0, 5),
    },
    {
      files: {
        'README':
          'Linux kernel\n============\n\nThis is a tiny demo seed (not the real kernel).\nSee MAINTAINERS for contacts.',
        'COPYING':
          'GPL-2.0\n',
        'MAINTAINERS':
          'Linus Torvalds  <torvalds@example.com>  M:  K:\n',
        'fs/file.c':
          '/* fs/file.c — demo */\nint open(void) { return 0; }\n',
      },
      author: 'torvalds',
      message: 'fs: add demo file.c',
      timestamp: T(2023, 1, 14),
    },
    {
      files: {
        'README':
          'Linux kernel\n============\n\nThis is a tiny demo seed (not the real kernel).\nSee MAINTAINERS for contacts.',
        'COPYING':
          'GPL-2.0\n',
        'MAINTAINERS':
          'Linus Torvalds  <torvalds@example.com>  M:  K:\n',
        'fs/file.c':
          '/* fs/file.c — demo */\nint open(void) { return 0; }\nint close(void) { return 0; }\n',
      },
      author: 'torvalds',
      message: 'fs: close() stub',
      timestamp: T(2023, 2, 2),
    },
  ]);
  // experimental 브랜치: main 두 번째 커밋에서 갈라져 나가는 가짜 실험 브랜치
  const experimentalBranchPoint = main[1];
  // experimental 의 커밋은 별도 chain 으로 만들되, 첫 부모를 experimentalBranchPoint 로 직접 셋업.
  const exp1TreeId = buildTreeFromFiles(objects, {
    'README':
      'Linux kernel\n============\n\nThis is a tiny demo seed (not the real kernel).\nSee MAINTAINERS for contacts.',
    'COPYING':
      'GPL-2.0\n',
    'MAINTAINERS':
      'Linus Torvalds  <torvalds@example.com>  M:  K:\n',
    'fs/file.c':
      '/* fs/file.c — demo */\nint open(void) { return 0; }\n',
    'experimental/note.md':
      '실험용 변경 — fast-forward 가 아닌 머지를 보여주기 위한 갈래입니다.',
  });
  const exp1 = writeCommit(objects, {
    treeId: exp1TreeId,
    parentIds: [experimentalBranchPoint],
    author: 'torvalds',
    message: 'experimental: explore alternate path',
    timestamp: T(2023, 1, 28),
  });

  return {
    id: 'repo_linux',
    owner: 'torvalds',
    name: 'linux',
    description: 'Linux kernel source tree (demo seed, not the real thing).',
    isPrivate: false,
    defaultBranch: 'main',
    stars: 175_320,
    forks: 53_870,
    objects,
    refs: {
      [HEADS_PREFIX + 'main']: main[main.length - 1],
      [HEADS_PREFIX + 'experimental']: exp1,
    },
    issues: [],
    pullRequests: [],
    createdAt: T(2023, 0, 5),
  };
}

function buildOctoNotes(): RemoteRepo {
  const objects = emptyStore();
  const main = commitChain(objects, [
    {
      files: {
        'README.md':
          '# octo-notes\n\n간단한 메모 앱입니다. 다크 모드 추가 작업 중.',
        'src/app.ts': 'export const greet = () => "hi";\n',
      },
      author: 'octocat',
      message: 'init notes app',
      timestamp: T(2024, 2, 5),
    },
    {
      files: {
        'README.md':
          '# octo-notes\n\n간단한 메모 앱입니다. 다크 모드 추가 작업 중.\n\n## Roadmap\n- [x] greet 함수\n- [ ] 다크 모드',
        'src/app.ts': 'export const greet = () => "hi, world";\n',
      },
      author: 'octocat',
      message: 'tweak greet, update roadmap',
      timestamp: T(2024, 2, 18),
    },
  ]);
  // feature/dark-mode 브랜치: 두 번째 main 커밋에서 갈라져 다른 사람이 작업 중
  const featTreeId = buildTreeFromFiles(objects, {
    'README.md':
      '# octo-notes\n\n간단한 메모 앱입니다. 다크 모드 추가 작업 중.\n\n## Roadmap\n- [x] greet 함수\n- [ ] 다크 모드',
    'src/app.ts': 'export const greet = () => "hi, world";\n',
    'src/theme.ts':
      'export type Theme = "dark";\nexport const DEFAULT_THEME: Theme = "dark";\n',
  });
  const feat = writeCommit(objects, {
    treeId: featTreeId,
    parentIds: [main[main.length - 1]],
    author: 'monalisa',
    message: 'feat: dark mode scaffold',
    timestamp: T(2024, 3, 2),
  });

  const issues: Issue[] = [
    {
      id: 'iss_octo-notes_1',
      number: 1,
      author: 'monalisa',
      title: '다크 모드를 추가해주세요',
      body: '안녕하세요, 야간에 눈이 부셔서요. 다크 테마가 있으면 좋겠습니다 🌙',
      state: 'open',
      labels: ['enhancement', 'good first issue'],
      comments: [
        comment(
          'iss_octo-notes_1_c1',
          'octocat',
          '좋은 제안 감사합니다! 작업 시작했어요 — feature/dark-mode 브랜치 참고.',
          T(2024, 3, 2, 10),
        ),
      ],
      createdAt: T(2024, 3, 1),
    },
    {
      id: 'iss_octo-notes_2',
      number: 2,
      author: 'octocat',
      title: 'greet() 가 영어만 반환합니다',
      body: '여러 언어 지원을 검토.',
      state: 'closed',
      labels: ['enhancement'],
      comments: [],
      createdAt: T(2024, 2, 20),
    },
  ];

  const pullRequests: PullRequest[] = [
    {
      id: 'pr_octo-notes_3',
      number: 3,
      author: 'monalisa',
      title: 'feat: dark mode scaffold',
      body: 'Issue #1 의 첫 단계로 다크 테마 토큰을 추가합니다. 추가 리뷰 부탁드려요.',
      state: 'open',
      sourceRepoId: 'repo_octo-notes',
      sourceBranch: 'feature/dark-mode',
      targetBranch: 'main',
      comments: [
        comment(
          'pr_octo-notes_3_c1',
          'octocat',
          '잘 봤습니다. Theme 타입을 union 으로 두는 게 더 확장성 있을 것 같아요.',
          T(2024, 3, 3, 14),
        ),
      ],
      createdAt: T(2024, 3, 2, 11),
    },
  ];

  return {
    id: 'repo_octo-notes',
    owner: 'octocat',
    name: 'octo-notes',
    description: '학습용 협업 레포 — 기존 PR/Issue 가 살아있습니다.',
    isPrivate: false,
    defaultBranch: 'main',
    stars: 87,
    forks: 12,
    objects,
    refs: {
      [HEADS_PREFIX + 'main']: main[main.length - 1],
      [HEADS_PREFIX + 'feature/dark-mode']: feat,
    },
    issues,
    pullRequests,
    createdAt: T(2024, 2, 5),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 최종 시드
// ───────────────────────────────────────────────────────────────────────────
export function seedWorld(currentUser = 'me'): World {
  const users: Record<string, User> = {
    [currentUser]: {
      username: currentUser,
      avatarSeed: currentUser,
      bio: '학습 중인 사용자',
    },
    octocat: {
      username: 'octocat',
      avatarSeed: 'octocat',
      bio: 'GitHub 의 마스코트. 학습용 레포의 owner.',
    },
    torvalds: {
      username: 'torvalds',
      avatarSeed: 'torvalds',
      bio: '리눅스 커널 데모 시드의 작성자.',
    },
    monalisa: {
      username: 'monalisa',
      avatarSeed: 'monalisa',
      bio: 'octo-notes 의 리뷰어/기여자.',
    },
  };

  const repoList = [
    buildSpoonKnife(),
    buildHelloWorld(),
    buildLinux(),
    buildOctoNotes(),
  ];
  const remoteRepos: Record<string, RemoteRepo> = {};
  for (const r of repoList) remoteRepos[r.id] = r;

  return {
    currentUser,
    users,
    remoteRepos,
    localClones: {},
    tutorial: {
      currentMissionId: 'explore',
      completedMissionIds: [],
      events: [],
    },
    ui: { activePane: 'web', currentRoute: '/' },
  };
}
