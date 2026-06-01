// 시나리오 통합 테스트: fork → clone → edit → commit → push → fetch → pull
// KICKOFF §14 에 명시된 안전망. 한 명령씩이 아니라, 입문자가 따라갈 전체 워크플로 단위로 검증한다.

import { describe, it, expect } from 'vitest';
import type { RemoteRepo } from '../../store/world';
import { HEADS_PREFIX, ORIGIN_PREFIX } from '../../engine/types';
import { buildTreeFromFiles, emptyStore, writeCommit } from '../../engine/objects';
import { aheadBehind, currentBranch } from '../../engine/refs';
import { commit as engineCommit, stage, writeFile } from '../../engine/commands';
import { clone as gitClone } from '../clone';
import { fetch as gitFetch } from '../fetch';
import { fork as gitFork } from '../fork';
import { NonFastForwardError, push as gitPush } from '../push';
import { pull as gitPull } from '../pull';

/** 시드 도우미: octocat 이 만든 한 커밋짜리 spoon-knife 만든다. */
function makeOctocatRepo(): RemoteRepo {
  const objects = emptyStore();
  const treeId = buildTreeFromFiles(objects, {
    'README.md': '# spoon-knife\nhello',
    'index.html': '<h1>hi</h1>',
  });
  const cid = writeCommit(objects, {
    treeId,
    parentIds: [],
    author: 'octocat',
    message: 'initial commit',
    timestamp: 1000,
  });
  return {
    id: 'repo_spoon-knife',
    owner: 'octocat',
    name: 'spoon-knife',
    description: 'practice repo',
    isPrivate: false,
    defaultBranch: 'main',
    stars: 0,
    objects,
    refs: { [HEADS_PREFIX + 'main']: cid },
    issues: [],
    pullRequests: [],
    createdAt: 0,
  };
}

describe('github scenario — fork', () => {
  it('fork 는 객체/refs 를 복사하고 forkOf 로 원본을 기억한다', () => {
    const upstream = makeOctocatRepo();
    const myFork = gitFork({ source: upstream, intoOwner: 'me' });
    expect(myFork.id).not.toBe(upstream.id);
    expect(myFork.owner).toBe('me');
    expect(myFork.forkOf).toBe(upstream.id);
    expect(myFork.stars).toBe(0);
    expect(myFork.issues).toEqual([]);
    expect(myFork.pullRequests).toEqual([]);
    expect(myFork.refs[HEADS_PREFIX + 'main']).toBe(upstream.refs[HEADS_PREFIX + 'main']);
  });

  it('자기 자신 fork 는 거부', () => {
    const upstream = makeOctocatRepo();
    expect(() => gitFork({ source: upstream, intoOwner: upstream.owner })).toThrow();
  });
});

describe('github scenario — clone', () => {
  it('clone 은 origin 트래킹 ref 셋업 + 작업본 체크아웃', () => {
    const upstream = makeOctocatRepo();
    const myFork = gitFork({ source: upstream, intoOwner: 'me' });
    const local = gitClone({ source: myFork });

    expect(local.remoteRepoId).toBe(myFork.id);
    expect(local.head).toEqual({ type: 'branch', ref: HEADS_PREFIX + 'main' });
    expect(local.refs[HEADS_PREFIX + 'main']).toBeDefined();
    expect(local.refs[ORIGIN_PREFIX + 'main']).toBe(local.refs[HEADS_PREFIX + 'main']);
    expect(local.workingDir['README.md']).toContain('spoon-knife');
    expect(local.index['README.md']).toContain('spoon-knife');
  });
});

describe('github scenario — commit (local) + push', () => {
  it('clone → 편집 → commit 후 ahead=1, push 후 ahead=0', () => {
    const upstream = makeOctocatRepo();
    let myFork = gitFork({ source: upstream, intoOwner: 'me' });
    let local = gitClone({ source: myFork });

    // 로컬에서 편집 + 스테이징 + 커밋
    local = writeFile(local, 'README.md', '# spoon-knife\nhello me').clone;
    local = stage(local).clone;
    const commitRes = engineCommit(local, {
      author: 'me',
      message: 'tweak readme',
      timestamp: 2000,
    });
    local = commitRes.clone;

    expect(currentBranch(local)).toBe('main');
    expect(aheadBehind(local, 'main')).toEqual({ ahead: 1, behind: 0 });
    // 서버엔 아직 이 커밋이 없다 (commit ≠ push)
    expect(myFork.objects.commits[commitRes.commitId]).toBeUndefined();

    // push
    const pushRes = gitPush({ clone: local, remote: myFork });
    local = pushRes.clone;
    myFork = pushRes.remote;

    expect(pushRes.pushed).toEqual([commitRes.commitId]);
    expect(myFork.objects.commits[commitRes.commitId]).toBeDefined();
    expect(myFork.refs[HEADS_PREFIX + 'main']).toBe(commitRes.commitId);
    expect(aheadBehind(local, 'main')).toEqual({ ahead: 0, behind: 0 });
  });
});

describe('github scenario — fetch (작업본 보존)', () => {
  it('서버가 앞서 있으면 fetch 후 behind 가 잡히고 작업본은 그대로', () => {
    const upstream = makeOctocatRepo();
    let myFork = gitFork({ source: upstream, intoOwner: 'me' });
    let local = gitClone({ source: myFork });

    const workingBefore = { ...local.workingDir };

    // 누군가(다른 PC) 가 fork 에 새 커밋을 올린 상황을 흉내낸다
    const newTreeId = buildTreeFromFiles(myFork.objects, {
      'README.md': '# spoon-knife\nfrom collaborator',
      'index.html': '<h1>hi</h1>',
    });
    const newCommit = writeCommit(myFork.objects, {
      treeId: newTreeId,
      parentIds: [myFork.refs[HEADS_PREFIX + 'main']],
      author: 'octocat',
      message: 'collab edit',
      timestamp: 3000,
    });
    myFork = {
      ...myFork,
      refs: { ...myFork.refs, [HEADS_PREFIX + 'main']: newCommit },
    };

    const fetched = gitFetch({ clone: local, remote: myFork });
    local = fetched.clone;

    // origin 만 갱신됨, 로컬 브랜치/작업본은 그대로
    expect(local.refs[ORIGIN_PREFIX + 'main']).toBe(newCommit);
    expect(local.refs[HEADS_PREFIX + 'main']).not.toBe(newCommit);
    expect(local.workingDir).toEqual(workingBefore);
    expect(aheadBehind(local, 'main')).toEqual({ ahead: 0, behind: 1 });
    expect(fetched.fetched).toContain(newCommit);
  });
});

describe('github scenario — pull (= fetch + merge)', () => {
  it('서버만 앞서면 pull 은 fast-forward', () => {
    const upstream = makeOctocatRepo();
    let myFork = gitFork({ source: upstream, intoOwner: 'me' });
    let local = gitClone({ source: myFork });

    // 서버에 한 커밋 더
    const newTreeId = buildTreeFromFiles(myFork.objects, {
      'README.md': '# spoon-knife\nnew line',
      'index.html': '<h1>hi</h1>',
    });
    const newCommit = writeCommit(myFork.objects, {
      treeId: newTreeId,
      parentIds: [myFork.refs[HEADS_PREFIX + 'main']],
      author: 'octocat',
      message: 'collab',
      timestamp: 3000,
    });
    myFork = {
      ...myFork,
      refs: { ...myFork.refs, [HEADS_PREFIX + 'main']: newCommit },
    };

    const r = gitPull({ clone: local, remote: myFork, author: 'me', timestamp: 4000 });
    local = r.clone;

    expect(r.merge?.status).toBe('fast-forward');
    expect(local.refs[HEADS_PREFIX + 'main']).toBe(newCommit);
    expect(local.workingDir['README.md']).toContain('new line');
    expect(aheadBehind(local, 'main')).toEqual({ ahead: 0, behind: 0 });
  });

  it('로컬·원격이 서로 다른 파일을 바꿨으면 pull 은 머지 커밋', () => {
    const upstream = makeOctocatRepo();
    let myFork = gitFork({ source: upstream, intoOwner: 'me' });
    let local = gitClone({ source: myFork });

    // 로컬: index.html 수정 + 커밋
    local = writeFile(local, 'index.html', '<h1>me</h1>').clone;
    local = stage(local).clone;
    local = engineCommit(local, { author: 'me', message: 'me html', timestamp: 2500 }).clone;

    // 원격: README.md 수정 + 새 커밋
    const newTreeId = buildTreeFromFiles(myFork.objects, {
      'README.md': '# spoon-knife\ncollab',
      'index.html': '<h1>hi</h1>',
    });
    const newCommit = writeCommit(myFork.objects, {
      treeId: newTreeId,
      parentIds: [myFork.refs[HEADS_PREFIX + 'main']],
      author: 'octocat',
      message: 'collab',
      timestamp: 3000,
    });
    myFork = {
      ...myFork,
      refs: { ...myFork.refs, [HEADS_PREFIX + 'main']: newCommit },
    };

    const r = gitPull({ clone: local, remote: myFork, author: 'me', timestamp: 4000 });
    expect(r.merge?.status).toBe('merged');
    if (r.merge?.status === 'merged') {
      const m = r.clone.objects.commits[r.merge.commitId];
      expect(m.parentIds.length).toBe(2);
    }
  });
});

describe('github scenario — push 거부', () => {
  it('원격이 갈라져 있으면 NonFastForwardError', () => {
    const upstream = makeOctocatRepo();
    let myFork = gitFork({ source: upstream, intoOwner: 'me' });
    let local = gitClone({ source: myFork });

    // 로컬에서 새 커밋
    local = writeFile(local, 'README.md', 'local change').clone;
    local = stage(local).clone;
    local = engineCommit(local, { author: 'me', message: 'local', timestamp: 2000 }).clone;

    // 원격에서 (다른 PC 가) 다른 새 커밋
    const newTreeId = buildTreeFromFiles(myFork.objects, {
      'README.md': 'remote change',
      'index.html': '<h1>hi</h1>',
    });
    const newCommit = writeCommit(myFork.objects, {
      treeId: newTreeId,
      parentIds: [myFork.refs[HEADS_PREFIX + 'main']],
      author: 'octocat',
      message: 'remote',
      timestamp: 2500,
    });
    myFork = {
      ...myFork,
      refs: { ...myFork.refs, [HEADS_PREFIX + 'main']: newCommit },
    };

    expect(() => gitPush({ clone: local, remote: myFork })).toThrow(NonFastForwardError);
  });

  it('force: true 면 원격 덮어쓰기 허용 (force push 의 위험 학습용)', () => {
    const upstream = makeOctocatRepo();
    let myFork = gitFork({ source: upstream, intoOwner: 'me' });
    let local = gitClone({ source: myFork });

    local = writeFile(local, 'README.md', 'local change').clone;
    local = stage(local).clone;
    local = engineCommit(local, { author: 'me', message: 'local', timestamp: 2000 }).clone;

    // 원격에 갈라진 새 커밋
    const newTreeId = buildTreeFromFiles(myFork.objects, {
      'README.md': 'remote change',
      'index.html': '<h1>hi</h1>',
    });
    const newCommit = writeCommit(myFork.objects, {
      treeId: newTreeId,
      parentIds: [myFork.refs[HEADS_PREFIX + 'main']],
      author: 'octocat',
      message: 'remote',
      timestamp: 2500,
    });
    myFork = {
      ...myFork,
      refs: { ...myFork.refs, [HEADS_PREFIX + 'main']: newCommit },
    };

    const r = gitPush({ clone: local, remote: myFork, force: true });
    // 강제로 덮였으므로 동료 커밋(newCommit)이 origin tip 에서 밀려남
    expect(r.remote.refs[HEADS_PREFIX + 'main']).toBe(
      local.refs[HEADS_PREFIX + 'main'],
    );
  });
});
