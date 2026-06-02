// src/seed/seedWorld.ts
//
// 앱 부팅 시 World 의 초기 상태를 만든다. KICKOFF §3-(2):
//   - 실습용 원본 저장소 id 는 정확히 'repo_spoon-knife' (missions.PRACTICE_REPO_ID 와 일치)
//   - 가짜 유저 + 현재 사용자
//   - 가짜 레포 여러 개(README·여러 파일·여러 커밋·브랜치·기존 PR/Issue 포함)
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

function commitChain(store: ObjectStore, specs: CommitSpec[]): string[] {
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

function comment(id: string, author: string, body: string, ts: number): Comment {
  return { id, author, body, createdAt: ts };
}

// ───────────────────────────────────────────────────────────────────────────
// 1) repo_spoon-knife (octocat) — 실습 원본. 미션 2·3·5 의 대상.
// ───────────────────────────────────────────────────────────────────────────
function buildSpoonKnife(): RemoteRepo {
  const objects = emptyStore();

  const README_1 =
    '# Spoon-Knife\n\nThis is a practice repository.\n\nFork → Clone → Edit → Pull Request 의 흐름을 익히는 데 사용하세요.';
  const README_2 =
    '# Spoon-Knife\n\nThis is a practice repository.\n\nFork → Clone → Edit → Pull Request 의 흐름을 익히는 데 사용하세요.\n\n## How to contribute\n1. Fork this repo.\n2. Clone your fork.\n3. Make a change on a new branch.\n4. Push and open a Pull Request.';
  const INDEX_HTML =
    '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>Spoon-Knife</title>\n    <link rel="stylesheet" href="styles.css" />\n  </head>\n  <body>\n    <h1>Well hello there!</h1>\n    <p>This is GitHub\'s Spoon-Knife practice repository.</p>\n  </body>\n</html>';
  const STYLES =
    'body {\n  font-family: -apple-system, "Segoe UI", sans-serif;\n  max-width: 640px;\n  margin: 4rem auto;\n  line-height: 1.6;\n  color: #1f2328;\n}\nh1 {\n  color: #0969da;\n}';
  const CONTRIBUTING =
    '# Contributing\n\nWelcome! 이 레포는 학습용입니다. 자유롭게 fork 하고 PR 을 열어보세요.\n\n- 작은 변경이라도 환영합니다.\n- 커밋 메시지는 무엇을 왜 바꿨는지 적어주세요.';
  const GITIGNORE = 'node_modules/\n.DS_Store\n*.log\ndist/';

  const chain = commitChain(objects, [
    {
      files: { 'README.md': README_1, 'index.html': INDEX_HTML },
      author: 'octocat',
      message: 'Initial commit',
      timestamp: T(2024, 0, 1),
    },
    {
      files: {
        'README.md': README_1,
        'index.html': INDEX_HTML,
        'styles.css': STYLES,
      },
      author: 'octocat',
      message: 'Add stylesheet',
      timestamp: T(2024, 0, 8),
    },
    {
      files: {
        'README.md': README_2,
        'index.html': INDEX_HTML,
        'styles.css': STYLES,
        'CONTRIBUTING.md': CONTRIBUTING,
        '.gitignore': GITIGNORE,
      },
      author: 'octocat',
      message: 'Add CONTRIBUTING, .gitignore and expand README',
      timestamp: T(2024, 0, 15),
    },
  ]);

  return {
    id: 'repo_spoon-knife', // ⚠️ missions.PRACTICE_REPO_ID 와 정확히 일치해야 함
    owner: 'octocat',
    name: 'spoon-knife',
    description: 'A repository for practicing the GitHub flow.',
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

// ───────────────────────────────────────────────────────────────────────────
// 2) repo_hello-world (octocat) — 둘러보기·README 위주(코드 보강).
// ───────────────────────────────────────────────────────────────────────────
function buildHelloWorld(): RemoteRepo {
  const objects = emptyStore();

  const PKG =
    '{\n  "name": "hello-world",\n  "version": "1.0.0",\n  "description": "My first repository on GitHub!",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js",\n    "test": "node test.js"\n  },\n  "license": "MIT"\n}';
  const INDEX_JS =
    'const { greet } = require("./greet");\n\nconst names = process.argv.slice(2);\nif (names.length === 0) names.push("world");\n\nfor (const name of names) {\n  console.log(greet(name));\n}';
  const GREET_JS =
    '/**\n * 이름을 받아 인사 문자열을 돌려준다.\n * @param {string} name\n * @returns {string}\n */\nfunction greet(name) {\n  if (!name) throw new Error("name is required");\n  return `Hello, ${name}!`;\n}\n\nmodule.exports = { greet };';
  const TEST_JS =
    'const assert = require("node:assert");\nconst { greet } = require("./greet");\n\nassert.strictEqual(greet("world"), "Hello, world!");\nassert.strictEqual(greet("GitHub"), "Hello, GitHub!");\nassert.throws(() => greet(""));\n\nconsole.log("all tests passed");';
  const LICENSE = 'MIT License\n\nCopyright (c) 2023 octocat\n';
  const README_FULL =
    '# Hello, World!\n\n첫 번째 저장소. GitHub 의 가장 기본적인 모양을 보여주기 위한 시드 데이터입니다.\n\n## 사용법\n```bash\nnpm start            # Hello, world!\nnpm start GitHub     # Hello, GitHub!\nnpm test             # 간단한 assert 테스트\n```\n\n## 구성\n- `index.js` — 진입점(CLI 인자로 이름을 받음)\n- `greet.js` — 인사 로직\n- `test.js` — assert 기반 테스트\n\n## License\nMIT';

  const chain = commitChain(objects, [
    {
      files: { 'README.md': '# Hello, World!\n\n첫 번째 저장소.' },
      author: 'octocat',
      message: 'First commit',
      timestamp: T(2023, 5, 11),
    },
    {
      files: {
        'README.md': '# Hello, World!\n\n첫 번째 저장소.',
        'index.js': 'console.log("Hello, world!");\n',
        'package.json': PKG,
      },
      author: 'octocat',
      message: 'Add JS entry point and package.json',
      timestamp: T(2023, 6, 3),
    },
    {
      files: {
        'README.md': '# Hello, World!\n\n첫 번째 저장소.',
        'index.js': INDEX_JS,
        'greet.js': GREET_JS,
        'package.json': PKG,
      },
      author: 'octocat',
      message: 'Extract greet() and accept CLI names',
      timestamp: T(2023, 6, 20),
    },
    {
      files: {
        'README.md': README_FULL,
        'index.js': INDEX_JS,
        'greet.js': GREET_JS,
        'test.js': TEST_JS,
        'package.json': PKG,
        'LICENSE': LICENSE,
      },
      author: 'octocat',
      message: 'Add tests, LICENSE and full README',
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

// ───────────────────────────────────────────────────────────────────────────
// 3) repo_linux (torvalds) — 인기 레포 + 브랜치 2개(코드 보강, 데모 시드).
// ───────────────────────────────────────────────────────────────────────────
function buildLinux(): RemoteRepo {
  const objects = emptyStore();

  const README =
    'Linux kernel\n============\n\nThis is a tiny demo seed (not the real kernel) used by RepoQuest.\nSee MAINTAINERS for contacts and Documentation/ for notes.';
  const COPYING = 'SPDX-License-Identifier: GPL-2.0\n\nThe Linux kernel is provided under GPL-2.0.\n';
  const MAINTAINERS =
    'List of maintainers\n===================\n\nLINUX KERNEL (DEMO)\nM: Linus Torvalds <torvalds@example.com>\nS: Maintained\nF: fs/\nF: kernel/\n';
  const FILE_C =
    '// SPDX-License-Identifier: GPL-2.0\n/* fs/file.c — file descriptor table (demo) */\n#include "file.h"\n\nstruct file *fget(unsigned int fd)\n{\n\tstruct files_struct *files = current->files;\n\tif (fd >= files->max_fds)\n\t\treturn NULL;\n\treturn files->fd_array[fd];\n}\n\nint get_unused_fd(void)\n{\n\treturn find_first_zero_bit(current->files->open_fds, NR_OPEN);\n}';
  const FILE_H =
    '// SPDX-License-Identifier: GPL-2.0\n#ifndef _DEMO_FS_FILE_H\n#define _DEMO_FS_FILE_H\n\n#define NR_OPEN 1024\n\nstruct file {\n\tunsigned int f_flags;\n\tlong f_pos;\n};\n\nstruct file *fget(unsigned int fd);\nint get_unused_fd(void);\n\n#endif /* _DEMO_FS_FILE_H */';
  const SCHED_C =
    '// SPDX-License-Identifier: GPL-2.0\n/* kernel/sched.c — round-robin scheduler (demo) */\n#include "sched.h"\n\nstatic struct task_struct *run_queue;\n\nvoid schedule(void)\n{\n\tstruct task_struct *prev = current;\n\tcurrent = prev->next ? prev->next : run_queue;\n\tswitch_to(prev, current);\n}';

  const main = commitChain(objects, [
    {
      files: { 'README': README, 'COPYING': COPYING, 'MAINTAINERS': MAINTAINERS },
      author: 'torvalds',
      message: 'Linux: initial demo seed',
      timestamp: T(2023, 0, 5),
    },
    {
      files: {
        'README': README,
        'COPYING': COPYING,
        'MAINTAINERS': MAINTAINERS,
        'fs/file.h': FILE_H,
        'fs/file.c': FILE_C,
      },
      author: 'torvalds',
      message: 'fs: add file descriptor table',
      timestamp: T(2023, 1, 14),
    },
    {
      files: {
        'README': README,
        'COPYING': COPYING,
        'MAINTAINERS': MAINTAINERS,
        'fs/file.h': FILE_H,
        'fs/file.c': FILE_C,
        'kernel/sched.c': SCHED_C,
      },
      author: 'torvalds',
      message: 'kernel: add round-robin scheduler',
      timestamp: T(2023, 2, 2),
    },
  ]);

  // experimental 브랜치: main 두 번째 커밋에서 분기(fast-forward 아닌 머지 데모용)
  const branchPoint = main[1];
  const expTreeId = buildTreeFromFiles(objects, {
    'README': README,
    'COPYING': COPYING,
    'MAINTAINERS': MAINTAINERS,
    'fs/file.h': FILE_H,
    'fs/file.c': FILE_C,
    'Documentation/experimental.md':
      '# Experimental\n\nfast-forward 가 아닌 머지를 보여주기 위한 갈래입니다.\nmain 과 따로 진행됩니다.',
  });
  const exp1 = writeCommit(objects, {
    treeId: expTreeId,
    parentIds: [branchPoint],
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

// ───────────────────────────────────────────────────────────────────────────
// 4) repo_signal-toolbox (lbianchi, 이탈리아) — MATLAB 신호처리 툴박스.
//    기존 협업 흔적(PR/Issue)을 여기로 옮겨 둘러보기 학습용으로 유지한다.
// ───────────────────────────────────────────────────────────────────────────
function buildSignalToolbox(): RemoteRepo {
  const objects = emptyStore();

  const README =
    '# signal-toolbox\n\nA MATLAB toolbox for signal processing: FFT analysis, FIR filtering and spectrograms.\n\n## Functions\n- `fft_analyze` — single-sided amplitude spectrum\n- `fir_filter` — windowed-sinc low-pass FIR filter\n- `spectrogram_plot` — STFT spectrogram\n\n## Example\n```matlab\nFs = 1000;\nt = 0:1/Fs:1-1/Fs;\nx = sin(2*pi*50*t) + 0.5*sin(2*pi*120*t);\n[f, amp] = fft_analyze(x, Fs);\nplot(f, amp);\n```';
  const FFT =
    'function [f, amp] = fft_analyze(x, Fs)\n%FFT_ANALYZE Single-sided amplitude spectrum.\n%   [f, amp] = fft_analyze(x, Fs)\n    x = x(:).\';\n    N = length(x);\n    X = fft(x);\n    P2 = abs(X / N);\n    P1 = P2(1:floor(N/2)+1);\n    P1(2:end-1) = 2 * P1(2:end-1);\n    f = Fs * (0:floor(N/2)) / N;\n    amp = P1;\nend';
  const FIR =
    'function y = fir_filter(x, cutoff, Fs, order)\n%FIR_FILTER Windowed-sinc low-pass FIR filter.\n    if nargin < 4, order = 64; end\n    fc = cutoff / (Fs / 2);\n    n = 0:order;\n    h = sinc(fc * (n - order/2)) * fc;\n    h = h .* hamming(order + 1)\';\n    h = h / sum(h);\n    y = conv(x, h, \'same\');\nend';
  const SPEC =
    'function spectrogram_plot(x, Fs, win, hop)\n%SPECTROGRAM_PLOT STFT-based spectrogram.\n    if nargin < 3, win = 256; end\n    if nargin < 4, hop = win / 2; end\n    frames = 1 + floor((length(x) - win) / hop);\n    S = zeros(win, frames);\n    w = hann_window(win);\n    for k = 1:frames\n        seg = x((k-1)*hop + (1:win)) .* w;\n        S(:, k) = abs(fft(seg));\n    end\n    imagesc(20*log10(S(1:win/2, :) + eps));\n    axis xy; xlabel(\'Frame\'); ylabel(\'Frequency bin\');\nend';
  const HANN =
    'function w = hann_window(N)\n%HANN_WINDOW Hann window of length N.\n    n = 0:N-1;\n    w = 0.5 * (1 - cos(2*pi*n / (N-1)));\n    w = w(:);\nend';
  const DEMO =
    '% examples/demo.m — spectrum of a two-tone signal\nFs = 1000;\nt = 0:1/Fs:1-1/Fs;\nx = sin(2*pi*50*t) + 0.5*sin(2*pi*120*t);\n\n[f, amp] = fft_analyze(x, Fs);\nfigure; plot(f, amp); title(\'Single-Sided Amplitude Spectrum\');\nxlabel(\'f (Hz)\'); ylabel(\'|P1(f)|\');';
  const LICENSE = 'MIT License\n\nCopyright (c) 2022 Lorenzo Bianchi\n';

  const main = commitChain(objects, [
    {
      files: { 'README.md': '# signal-toolbox\n\nA MATLAB toolbox for signal processing.', 'fft_analyze.m': FFT },
      author: 'lbianchi',
      message: 'Initial commit: FFT analysis',
      timestamp: T(2022, 9, 4),
    },
    {
      files: {
        'README.md': '# signal-toolbox\n\nA MATLAB toolbox for signal processing.\n\n- fft_analyze\n- fir_filter',
        'fft_analyze.m': FFT,
        'fir_filter.m': FIR,
        'LICENSE': LICENSE,
      },
      author: 'lbianchi',
      message: 'Add windowed FIR low-pass filter + LICENSE',
      timestamp: T(2022, 10, 18),
    },
    {
      files: {
        'README.md': README,
        'fft_analyze.m': FFT,
        'fir_filter.m': FIR,
        'spectrogram_plot.m': SPEC,
        'hann_window.m': HANN,
        'examples/demo.m': DEMO,
        'LICENSE': LICENSE,
      },
      author: 'lbianchi',
      message: 'Add spectrogram + Hann window + example',
      timestamp: T(2023, 2, 9),
    },
  ]);

  // feature/kaiser-window: PR 데모용 브랜치 (main tip 에서 분기)
  const featTree = buildTreeFromFiles(objects, {
    'README.md': README,
    'fft_analyze.m': FFT,
    'fir_filter.m': FIR,
    'spectrogram_plot.m': SPEC,
    'hann_window.m': HANN,
    'kaiser_window.m':
      'function w = kaiser_window(N, beta)\n%KAISER_WINDOW Kaiser window (adjustable side-lobe level).\n    if nargin < 2, beta = 8.6; end\n    n = 0:N-1;\n    alpha = (N-1)/2;\n    arg = beta * sqrt(1 - ((n - alpha)/alpha).^2);\n    w = besseli(0, arg) / besseli(0, beta);\n    w = w(:);\nend',
    'examples/demo.m': DEMO,
    'LICENSE': LICENSE,
  });
  const feat = writeCommit(objects, {
    treeId: featTree,
    parentIds: [main[main.length - 1]],
    author: 'gferrari',
    message: 'Add Kaiser window option',
    timestamp: T(2023, 3, 1),
  });

  const issues: Issue[] = [
    {
      id: 'iss_signal-toolbox_1',
      number: 1,
      author: 'gferrari',
      title: 'fft_analyze doubles the last bin for odd-length signals',
      body: 'For odd-length inputs there is no Nyquist bin, yet `P1(2:end-1)` still scales the last term. Repro:\n```matlab\nx = randn(1, 101);\n[f, amp] = fft_analyze(x, 1000);\n```',
      state: 'open',
      labels: ['bug'],
      comments: [
        comment(
          'iss_signal-toolbox_1_c1',
          'lbianchi',
          'Confirmed. I will handle odd/even lengths separately. Thanks for the report 🙏',
          T(2023, 2, 20, 10),
        ),
      ],
      createdAt: T(2023, 2, 19),
    },
    {
      id: 'iss_signal-toolbox_2',
      number: 2,
      author: 'lbianchi',
      title: 'Add per-function input/output docs to README',
      body: 'A table summarizing the arguments and return values of each function would help.',
      state: 'closed',
      labels: ['documentation'],
      comments: [],
      createdAt: T(2022, 11, 2),
    },
  ];

  const pullRequests: PullRequest[] = [
    {
      id: 'pr_signal-toolbox_3',
      number: 3,
      author: 'gferrari',
      title: 'Add Kaiser window option',
      body: 'Adds a Kaiser window in addition to Hann. The beta parameter controls the side-lobe level, which is useful for spectrogram analysis.',
      state: 'open',
      sourceRepoId: 'repo_signal-toolbox',
      sourceBranch: 'feature/kaiser-window',
      targetBranch: 'main',
      comments: [
        comment(
          'pr_signal-toolbox_3_c1',
          'lbianchi',
          'Could spectrogram_plot take the window as an argument so it can be selected? Just that part needs a follow-up.',
          T(2023, 3, 3, 14),
        ),
      ],
      createdAt: T(2023, 3, 1, 11),
    },
  ];

  return {
    id: 'repo_signal-toolbox',
    owner: 'lbianchi',
    name: 'signal-toolbox',
    description: 'MATLAB toolbox for FFT analysis, FIR filtering and spectrograms.',
    isPrivate: false,
    defaultBranch: 'main',
    stars: 342,
    forks: 87,
    objects,
    refs: {
      [HEADS_PREFIX + 'main']: main[main.length - 1],
      [HEADS_PREFIX + 'feature/kaiser-window']: feat,
    },
    issues,
    pullRequests,
    createdAt: T(2022, 9, 4),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 5) repo_ledger-cobol (jwpark, 한국) — 12년 전(2014) COBOL 금융 관리 프로그램.
// ───────────────────────────────────────────────────────────────────────────
function buildLedgerCobol(): RemoteRepo {
  const objects = emptyStore();

  const README =
    '# ledger-cobol\n\n은행 계좌 원장(ledger) 배치 처리 프로그램입니다. 일일 거래 파일을 읽어\n계좌 잔액을 갱신하고 이자를 계산합니다. (메인프레임 COBOL, 2014)\n\n## 구성\n- `src/ACCOUNT.CBL` — 계좌 마스터 갱신\n- `src/LEDGER.CBL`  — 일일 거래 원장 배치\n- `src/INTEREST.CBL`— 월말 이자 계산\n- `copy/ACCTREC.CPY`— 계좌 레코드 카피북\n- `jcl/RUNLEDGER.JCL`— 배치 실행 JCL';

  const ACCTREC =
    '      ******************************************************************\n      * ACCTREC.CPY  - 계좌 마스터 레코드 (200 BYTES)\n      ******************************************************************\n       01  ACCOUNT-RECORD.\n           05  ACCT-ID            PIC 9(10).\n           05  ACCT-NAME          PIC X(30).\n           05  ACCT-BALANCE       PIC S9(13)V99 COMP-3.\n           05  ACCT-OPEN-DATE     PIC 9(8).\n           05  ACCT-STATUS        PIC X(1).\n               88  ACCT-ACTIVE    VALUE \'A\'.\n               88  ACCT-CLOSED    VALUE \'C\'.\n           05  FILLER             PIC X(20).';

  const ACCOUNT_CBL =
    '       IDENTIFICATION DIVISION.\n       PROGRAM-ID. ACCOUNT.\n       AUTHOR. JW-PARK.\n      *----------------------------------------------------------------\n      * 계좌 마스터 파일을 순차로 읽어 상태를 점검한다.\n      *----------------------------------------------------------------\n       ENVIRONMENT DIVISION.\n       INPUT-OUTPUT SECTION.\n       FILE-CONTROL.\n           SELECT ACCT-FILE ASSIGN TO ACCTMAST\n               ORGANIZATION IS INDEXED\n               ACCESS MODE IS SEQUENTIAL\n               RECORD KEY IS ACCT-ID\n               FILE STATUS IS WS-STATUS.\n       DATA DIVISION.\n       FILE SECTION.\n       FD  ACCT-FILE.\n       COPY ACCTREC.\n       WORKING-STORAGE SECTION.\n       01  WS-STATUS    PIC X(2).\n       01  WS-EOF       PIC X VALUE \'N\'.\n       01  WS-COUNT     PIC 9(7) VALUE ZERO.\n       PROCEDURE DIVISION.\n       0000-MAIN.\n           OPEN INPUT ACCT-FILE.\n           PERFORM UNTIL WS-EOF = \'Y\'\n               READ ACCT-FILE\n                   AT END MOVE \'Y\' TO WS-EOF\n                   NOT AT END PERFORM 1000-CHECK\n               END-READ\n           END-PERFORM.\n           DISPLAY \'ACTIVE ACCOUNTS: \' WS-COUNT.\n           CLOSE ACCT-FILE.\n           STOP RUN.\n       1000-CHECK.\n           IF ACCT-ACTIVE\n               ADD 1 TO WS-COUNT\n           END-IF.';

  const LEDGER_CBL =
    '       IDENTIFICATION DIVISION.\n       PROGRAM-ID. LEDGER.\n       AUTHOR. JW-PARK.\n      *----------------------------------------------------------------\n      * 일일 거래 파일을 읽어 계좌 잔액을 갱신하는 배치.\n      *----------------------------------------------------------------\n       ENVIRONMENT DIVISION.\n       INPUT-OUTPUT SECTION.\n       FILE-CONTROL.\n           SELECT TXN-FILE  ASSIGN TO TXNIN\n               ORGANIZATION IS SEQUENTIAL.\n           SELECT ACCT-FILE ASSIGN TO ACCTMAST\n               ORGANIZATION IS INDEXED\n               ACCESS MODE IS DYNAMIC\n               RECORD KEY IS ACCT-ID.\n       DATA DIVISION.\n       FILE SECTION.\n       FD  TXN-FILE.\n       01  TXN-RECORD.\n           05  TXN-ACCT    PIC 9(10).\n           05  TXN-TYPE    PIC X(1).\n           05  TXN-AMOUNT  PIC S9(11)V99.\n       FD  ACCT-FILE.\n       COPY ACCTREC.\n       WORKING-STORAGE SECTION.\n       01  WS-EOF      PIC X VALUE \'N\'.\n       PROCEDURE DIVISION.\n       0000-MAIN.\n           OPEN INPUT TXN-FILE I-O ACCT-FILE.\n           PERFORM UNTIL WS-EOF = \'Y\'\n               READ TXN-FILE AT END MOVE \'Y\' TO WS-EOF\n                   NOT AT END PERFORM 1000-POST END-READ\n           END-PERFORM.\n           CLOSE TXN-FILE ACCT-FILE.\n           STOP RUN.\n       1000-POST.\n           MOVE TXN-ACCT TO ACCT-ID.\n           READ ACCT-FILE KEY IS ACCT-ID\n               INVALID KEY DISPLAY \'NO ACCT \' TXN-ACCT\n               NOT INVALID KEY PERFORM 2000-APPLY\n           END-READ.\n       2000-APPLY.\n           EVALUATE TXN-TYPE\n               WHEN \'D\' ADD TXN-AMOUNT TO ACCT-BALANCE\n               WHEN \'W\' SUBTRACT TXN-AMOUNT FROM ACCT-BALANCE\n           END-EVALUATE.\n           REWRITE ACCOUNT-RECORD.';

  const INTEREST_CBL =
    '       IDENTIFICATION DIVISION.\n       PROGRAM-ID. INTEREST.\n       AUTHOR. JW-PARK.\n      *----------------------------------------------------------------\n      * 월말 이자 계산 (연 1.8%, 일할 단리).\n      *----------------------------------------------------------------\n       DATA DIVISION.\n       WORKING-STORAGE SECTION.\n       01  WS-RATE      PIC V9(4) VALUE 0.0180.\n       01  WS-DAYS      PIC 9(3)  VALUE 30.\n       01  WS-INTEREST  PIC S9(13)V99.\n       LINKAGE SECTION.\n       COPY ACCTREC.\n       PROCEDURE DIVISION USING ACCOUNT-RECORD.\n       0000-CALC.\n           COMPUTE WS-INTEREST ROUNDED =\n               ACCT-BALANCE * WS-RATE * WS-DAYS / 365.\n           ADD WS-INTEREST TO ACCT-BALANCE.\n           GOBACK.';

  const JCL =
    '//RUNLEDGR JOB (ACCT),\'DAILY LEDGER\',CLASS=A,MSGCLASS=X\n//*\n//STEP010  EXEC PGM=LEDGER\n//STEPLIB  DD DSN=FIN.LOADLIB,DISP=SHR\n//ACCTMAST DD DSN=FIN.ACCT.MASTER,DISP=SHR\n//TXNIN    DD DSN=FIN.TXN.DAILY(0),DISP=SHR\n//SYSOUT   DD SYSOUT=*\n//';

  const chain = commitChain(objects, [
    {
      files: { 'README.md': '# ledger-cobol\n\n은행 계좌 원장 배치 (COBOL).', 'copy/ACCTREC.CPY': ACCTREC, 'src/ACCOUNT.CBL': ACCOUNT_CBL },
      author: 'jwpark',
      message: '계좌 마스터 점검 프로그램 추가',
      timestamp: T(2014, 2, 17),
    },
    {
      files: {
        'README.md': '# ledger-cobol\n\n은행 계좌 원장 배치 (COBOL).',
        'copy/ACCTREC.CPY': ACCTREC,
        'src/ACCOUNT.CBL': ACCOUNT_CBL,
        'src/LEDGER.CBL': LEDGER_CBL,
        'jcl/RUNLEDGER.JCL': JCL,
      },
      author: 'jwpark',
      message: '일일 거래 원장 배치 및 실행 JCL 추가',
      timestamp: T(2014, 3, 5),
    },
    {
      files: {
        'README.md': README,
        'copy/ACCTREC.CPY': ACCTREC,
        'src/ACCOUNT.CBL': ACCOUNT_CBL,
        'src/LEDGER.CBL': LEDGER_CBL,
        'src/INTEREST.CBL': INTEREST_CBL,
        'jcl/RUNLEDGER.JCL': JCL,
      },
      author: 'jwpark',
      message: '월말 이자 계산 모듈 추가 및 README 정리',
      timestamp: T(2014, 5, 22),
    },
  ]);

  const issues: Issue[] = [
    {
      id: 'iss_ledger-cobol_1',
      number: 1,
      author: 'jwpark',
      title: '이자 계산 시 윤년(366일) 처리 필요',
      body: 'INTEREST.CBL이 항상 365로 나눕니다. 윤년에는 366으로 나눠야 정확합니다.',
      state: 'open',
      labels: ['enhancement'],
      comments: [],
      createdAt: T(2014, 6, 1),
    },
  ];

  return {
    id: 'repo_ledger-cobol',
    owner: 'jwpark',
    name: 'ledger-cobol',
    description: '은행 계좌 원장 배치 처리 프로그램 (메인프레임 COBOL, 2014).',
    isPrivate: false,
    defaultBranch: 'master', // 2014년 관행: 기본 브랜치 master
    stars: 56,
    forks: 23,
    objects,
    refs: { [HEADS_PREFIX + 'master']: chain[chain.length - 1] },
    issues,
    pullRequests: [],
    createdAt: T(2014, 2, 17),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 6) repo_leaf-classifier (anasouza, 브라질) — Python 머신러닝(잎 이미지 분류).
// ───────────────────────────────────────────────────────────────────────────
function buildLeafClassifier(): RemoteRepo {
  const objects = emptyStore();

  const REQ = 'numpy>=1.24\ntorch>=2.0\ntorchvision>=0.15\nscikit-learn>=1.3\ntqdm>=4.66';
  const DATASET =
    'import os\nfrom torch.utils.data import Dataset\nfrom torchvision import transforms\nfrom PIL import Image\n\n\nclass LeafDataset(Dataset):\n    """Loads leaf images from a class-per-directory layout (class_name/*.jpg)."""\n\n    def __init__(self, root, train=True):\n        self.samples = []\n        self.classes = sorted(os.listdir(root))\n        self.class_to_idx = {c: i for i, c in enumerate(self.classes)}\n        for c in self.classes:\n            for fn in os.listdir(os.path.join(root, c)):\n                self.samples.append((os.path.join(root, c, fn), self.class_to_idx[c]))\n        self.tf = transforms.Compose([\n            transforms.Resize((128, 128)),\n            transforms.RandomHorizontalFlip() if train else transforms.Lambda(lambda x: x),\n            transforms.ToTensor(),\n        ])\n\n    def __len__(self):\n        return len(self.samples)\n\n    def __getitem__(self, i):\n        path, label = self.samples[i]\n        return self.tf(Image.open(path).convert("RGB")), label';
  const MODEL =
    'import torch.nn as nn\nimport torch.nn.functional as F\n\n\nclass LeafCNN(nn.Module):\n    """A small CNN for leaf image classification."""\n\n    def __init__(self, num_classes):\n        super().__init__()\n        self.conv1 = nn.Conv2d(3, 32, 3, padding=1)\n        self.conv2 = nn.Conv2d(32, 64, 3, padding=1)\n        self.pool = nn.MaxPool2d(2, 2)\n        self.fc1 = nn.Linear(64 * 32 * 32, 128)\n        self.fc2 = nn.Linear(128, num_classes)\n        self.dropout = nn.Dropout(0.3)\n\n    def forward(self, x):\n        x = self.pool(F.relu(self.conv1(x)))\n        x = self.pool(F.relu(self.conv2(x)))\n        x = x.flatten(1)\n        x = self.dropout(F.relu(self.fc1(x)))\n        return self.fc2(x)';
  const TRAIN =
    'import torch\nfrom torch.utils.data import DataLoader\nfrom tqdm import tqdm\n\nfrom dataset import LeafDataset\nfrom model import LeafCNN\n\n\ndef train(root="data", epochs=10, lr=1e-3, batch=32):\n    ds = LeafDataset(root, train=True)\n    dl = DataLoader(ds, batch_size=batch, shuffle=True)\n    device = "cuda" if torch.cuda.is_available() else "cpu"\n    model = LeafCNN(len(ds.classes)).to(device)\n    opt = torch.optim.Adam(model.parameters(), lr=lr)\n    loss_fn = torch.nn.CrossEntropyLoss()\n\n    for epoch in range(epochs):\n        model.train()\n        total = 0.0\n        for x, y in tqdm(dl, desc=f"epoch {epoch+1}/{epochs}"):\n            x, y = x.to(device), y.to(device)\n            opt.zero_grad()\n            loss = loss_fn(model(x), y)\n            loss.backward()\n            opt.step()\n            total += loss.item()\n        print(f"epoch {epoch+1}: loss={total/len(dl):.4f}")\n    torch.save(model.state_dict(), "leaf_cnn.pt")\n\n\nif __name__ == "__main__":\n    train()';
  const README =
    '# leaf-classifier\n\nA small PyTorch CNN that classifies plant leaf images.\n\n## Install\n```bash\npip install -r requirements.txt\n```\n\n## Train\n```bash\npython src/train.py        # expects a data/<class>/<*.jpg> layout\n```\n\n## Layout\n- `src/dataset.py` — image folder → Dataset\n- `src/model.py`   — LeafCNN (Conv×2 + FC)\n- `src/train.py`   — training loop\n\nValidation accuracy is about 92% on a 5-class split.';

  const chain = commitChain(objects, [
    {
      files: { 'README.md': '# leaf-classifier\n\nPyTorch leaf image classification.', 'requirements.txt': REQ, 'src/model.py': MODEL },
      author: 'anasouza',
      message: 'Add CNN model',
      timestamp: T(2021, 7, 12),
    },
    {
      files: {
        'README.md': '# leaf-classifier\n\nPyTorch leaf image classification.',
        'requirements.txt': REQ,
        'src/model.py': MODEL,
        'src/dataset.py': DATASET,
        '.gitignore': '__pycache__/\n*.pt\ndata/\n.venv/',
      },
      author: 'anasouza',
      message: 'Add dataset loader and .gitignore',
      timestamp: T(2021, 8, 3),
    },
    {
      files: {
        'README.md': README,
        'requirements.txt': REQ,
        'src/model.py': MODEL,
        'src/dataset.py': DATASET,
        'src/train.py': TRAIN,
        '.gitignore': '__pycache__/\n*.pt\ndata/\n.venv/',
      },
      author: 'anasouza',
      message: 'Add training loop and usage docs',
      timestamp: T(2021, 9, 27),
    },
  ]);

  return {
    id: 'repo_leaf-classifier',
    owner: 'anasouza',
    name: 'leaf-classifier',
    description: 'A small PyTorch CNN for plant leaf image classification.',
    isPrivate: false,
    defaultBranch: 'main',
    stars: 1_280,
    forks: 410,
    objects,
    refs: { [HEADS_PREFIX + 'main']: chain[chain.length - 1] },
    issues: [],
    pullRequests: [],
    createdAt: T(2021, 7, 12),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 최종 시드
// ───────────────────────────────────────────────────────────────────────────
export function seedWorld(currentUser = 'me'): World {
  const users: Record<string, User> = {
    [currentUser]: { username: currentUser, avatarSeed: currentUser, bio: '학습 중인 사용자' },
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
    lbianchi: {
      username: 'lbianchi',
      avatarSeed: 'lbianchi',
      bio: 'Signal processing engineer from Torino, Italy. MATLAB & DSP.',
    },
    gferrari: {
      username: 'gferrari',
      avatarSeed: 'gferrari',
      bio: 'PhD student, Politecnico di Milano. signal-toolbox contributor.',
    },
    jwpark: {
      username: 'jwpark',
      avatarSeed: 'jwpark',
      bio: '금융 IT 시스템 개발자. 메인프레임 COBOL/JCL.',
    },
    anasouza: {
      username: 'anasouza',
      avatarSeed: 'anasouza',
      bio: 'ML engineer from São Paulo, Brazil. PyTorch & computer vision.',
    },
  };

  const repoList = [
    buildSpoonKnife(),
    buildHelloWorld(),
    buildLinux(),
    buildSignalToolbox(),
    buildLedgerCobol(),
    buildLeafClassifier(),
  ];
  const remoteRepos: Record<string, RemoteRepo> = {};
  for (const r of repoList) remoteRepos[r.id] = r;

  return {
    currentUser,
    users,
    remoteRepos,
    localClones: {},
    tutorial: { currentMissionId: 'explore', completedMissionIds: [], events: [] },
    ui: { activePane: 'web', currentRoute: '/' },
  };
}
