// src/tutorial/concepts.ts
//
// 코칭 패널에 표시되는 개념 카드 데이터.
// 코드 로직과 분리되어 있으므로, 비개발자도 이 파일의 문구만 고치면 설명이 바뀐다.
// 모든 인터랙티브 요소는 data-concept="<id>" 로 아래 항목과 연결한다.
//
// 작성 원칙
//  1) whatIsIt: 비유 한 줄 + 정확한 정의. 거짓 비유 금지.
//  2) whenToUse: "언제 이 버튼을 누르나"를 실제 상황으로.
//  3) pitfalls: 입문자가 실제로 착각하는 것만. 이 앱의 존재 이유.
//  4) location: 로컬에서 일어나는 일인지, 서버(GitHub)인지, 양쪽을 오가는지 — 항상 명시.

export type ConceptLocation = 'local' | 'remote' | 'local→remote' | 'remote→local';

export interface Concept {
  id: string;
  title: string;
  /** 어디서 일어나는 일인가. 듀얼 페인에서 어느 쪽을 강조할지 결정 */
  location: ConceptLocation;
  whatIsIt: string;
  whenToUse: string;
  pitfalls: string[];
  /** 이 동작에 대응하는 실제 git 명령(미니 터미널 미러링용) */
  relatedCmd?: string;
  /** 함께 보면 좋은 개념 id */
  seeAlso?: string[];
}

export const concepts: Concept[] = [
  // ────────────────────────────── 기본 구조 ──────────────────────────────
  {
    id: 'repository',
    title: '저장소 (Repository)',
    location: 'remote',
    whatIsIt:
      '프로젝트 하나가 통째로 담기는 폴더다. 단순 파일 모음이 아니라, 파일의 "모든 변경 이력"까지 함께 보관한다. 보통 "레포(repo)"라고 줄여 부른다.',
    whenToUse:
      '새 프로젝트를 시작하거나, 코드와 그 변경 기록을 한 곳에서 관리하고 싶을 때 만든다.',
    pitfalls: [
      '저장소는 "현재 파일"만 들고 있는 게 아니라, 과거 모든 시점의 스냅샷을 다 갖고 있다.',
      'GitHub의 저장소(서버)와, 내 컴퓨터에 받아온 저장소(로컬)는 별개의 복사본이다. 같은 이름이어도 서로 다른 물건이다.',
    ],
    seeAlso: ['clone', 'fork', 'commit'],
  },
  {
    id: 'remote-origin',
    title: '원격 / origin',
    location: 'remote',
    whatIsIt:
      '내 로컬 저장소가 "이 서버랑 연결돼 있다"고 기억하는 주소다. clone하면 자동으로 그 출처가 origin이라는 이름으로 등록된다. origin은 그냥 기본 별명일 뿐, 특별한 단어가 아니다.',
    whenToUse:
      'push·pull·fetch처럼 서버와 주고받는 동작을 할 때, "어느 서버로/에서"를 가리키는 대상이 된다.',
    pitfalls: [
      'origin은 마법 단어가 아니라 그냥 별명이다. 다른 이름(upstream 등)으로 원격을 더 추가할 수도 있다.',
      'fork한 원본을 따로 추적할 때 보통 upstream이라는 두 번째 원격을 둔다.',
    ],
    relatedCmd: 'git remote -v',
    seeAlso: ['clone', 'push', 'fetch', 'fork'],
  },
  {
    id: 'head',
    title: 'HEAD',
    location: 'local',
    whatIsIt:
      '"지금 내가 보고 있는 위치"를 가리키는 화살표다. 보통은 현재 체크아웃한 브랜치를 가리키고, 그 브랜치는 다시 최신 커밋을 가리킨다.',
    whenToUse:
      '명시적으로 다루는 일은 드물지만, 브랜치를 전환하거나 과거 커밋으로 이동하면 HEAD가 함께 움직인다.',
    pitfalls: [
      'HEAD가 브랜치가 아니라 커밋을 직접 가리키게 되면 "detached HEAD" 상태가 된다(아래 항목 참고).',
    ],
    seeAlso: ['branch', 'checkout', 'detached-head'],
  },

  // ────────────────────────────── 가져오기 ──────────────────────────────
  {
    id: 'fork',
    title: 'Fork (포크)',
    location: 'remote',
    whatIsIt:
      '남의 저장소를 통째로 복사해서 "내 GitHub 계정 아래"에 똑같은 저장소를 만드는 일이다. 복사본의 주인은 나라서 마음대로 수정할 수 있다.',
    whenToUse:
      '수정 권한이 없는 남의 프로젝트에 기여하고 싶을 때. 내 fork에서 작업한 뒤 PR로 원본에 제안한다.',
    pitfalls: [
      'fork는 "서버에서만" 일어난다. 내 컴퓨터로 다운로드되는 게 아니다. 파일을 내려받으려면 그다음 clone을 따로 해야 한다.',
      'fork ≠ clone. fork는 GitHub 안에서의 복사, clone은 서버→내 PC로의 복사다.',
      'fork한 뒤 원본이 업데이트돼도 내 fork는 자동으로 따라가지 않는다. 직접 동기화(원본을 upstream으로 두고 가져오기)해야 한다.',
    ],
    relatedCmd: '(GitHub 웹의 Fork 버튼 — CLI 명령이 아님)',
    seeAlso: ['clone', 'pull-request', 'remote-origin'],
  },
  {
    id: 'clone',
    title: 'Clone (클론)',
    location: 'remote→local',
    whatIsIt:
      'GitHub 서버에 있는 저장소를 통째로 내 컴퓨터로 복제해 오는 일이다. 파일뿐 아니라 전체 커밋 이력까지 함께 받아오고, 출처는 origin으로 자동 등록된다.',
    whenToUse:
      '실제로 코드를 편집하고 실행하려면 내 PC에 받아와야 하므로, 작업 시작 전에 한 번 한다.',
    pitfalls: [
      'clone은 딱 한 번 받아오는 동작이다. 이후 서버가 바뀌어도 자동으로 갱신되지 않는다. 최신 변경은 pull로 따로 가져와야 한다.',
      'clone ≠ fork. fork(서버 복사)를 먼저 하지 않고 남의 레포를 바로 clone하면, 그 로컬에서 만든 변경을 원본 서버로 push할 권한이 없다.',
    ],
    relatedCmd: 'git clone <url>',
    seeAlso: ['fork', 'pull', 'remote-origin', 'working-directory'],
  },

  // ────────────────────────────── 로컬 작업 ──────────────────────────────
  {
    id: 'working-directory',
    title: '작업 디렉터리 (Working Directory)',
    location: 'local',
    whatIsIt:
      '내가 지금 실제로 열어서 편집하는 파일들이다. 에디터에서 보고 고치는 바로 그 상태.',
    whenToUse:
      '코드를 작성·수정하는 모든 순간. 여기서의 변경은 아직 Git이 "기록"한 게 아니다.',
    pitfalls: [
      '여기서 파일을 고쳐도 Git에는 아직 아무것도 저장되지 않았다. add → commit을 거쳐야 비로소 이력에 남는다.',
    ],
    seeAlso: ['staging', 'commit'],
  },
  {
    id: 'staging',
    title: 'Add / 스테이징 (Staging Area, Index)',
    location: 'local',
    whatIsIt:
      '다음 커밋에 포함시킬 변경을 미리 골라 담아두는 "장바구니"다. git add가 작업 디렉터리의 변경을 이 장바구니로 옮긴다.',
    whenToUse:
      '여러 파일을 고쳤지만 그중 일부만 한 커밋으로 묶고 싶을 때. 관련된 변경만 선택해 담는다.',
    pitfalls: [
      'add는 "저장"이 아니다. 커밋 후보로 등록할 뿐, 아직 이력에 봉인된 게 아니다.',
      'add한 뒤 파일을 또 고치면, 그 새 변경은 다시 add해야 커밋에 포함된다(add 시점의 스냅샷이 담기기 때문).',
    ],
    relatedCmd: 'git add <파일>   /   git add .',
    seeAlso: ['working-directory', 'commit'],
  },
  {
    id: 'commit',
    title: 'Commit (커밋)',
    location: 'local',
    whatIsIt:
      '장바구니(스테이징)에 담긴 변경을 "이 시점의 스냅샷"으로 영구히 봉인하는 일이다. 메시지를 붙여 "왜 이렇게 바꿨는지"를 함께 남긴다. 이력에 점 하나가 찍힌다.',
    whenToUse:
      '의미 있는 작업 한 덩어리가 끝났을 때. "로그인 버그 수정"처럼 하나의 목적 단위로 자주, 작게 남기는 게 좋다.',
    pitfalls: [
      '⚠️ 가장 흔한 착각: 커밋하면 GitHub에 올라간다? 아니다. 커밋은 100% 내 컴퓨터 안에서만 일어난다. 서버에 반영하려면 push를 따로 해야 한다.',
      '커밋은 변경의 "차이"가 아니라 그 시점의 전체 스냅샷이다(개념상 그렇게 동작한다).',
      '커밋 메시지를 대충 적으면 나중에 이력을 읽는 미래의 내가 고생한다.',
    ],
    relatedCmd: 'git commit -m "메시지"',
    seeAlso: ['staging', 'push', 'head'],
  },
  {
    id: 'branch',
    title: 'Branch (브랜치)',
    location: 'local',
    whatIsIt:
      '커밋 이력에서 갈라져 나온 독립된 작업 줄기다. 기술적으로는 "특정 커밋을 가리키는 가벼운 이름표(포인터)"일 뿐, 무거운 폴더 복사가 아니다.',
    whenToUse:
      '새 기능 개발이나 실험을 main에 영향 없이 따로 진행하고 싶을 때. 끝나면 main으로 merge한다.',
    pitfalls: [
      '브랜치를 만드는 건 매우 가볍고 빠르다. 파일 전체를 복사하는 게 아니라 이름표 하나를 추가하는 것이다.',
      '브랜치를 만들기만 하고 전환(checkout/switch)하지 않으면, 작업은 여전히 이전 브랜치에 쌓인다.',
    ],
    relatedCmd: 'git branch <이름>   /   git switch -c <이름>',
    seeAlso: ['checkout', 'merge', 'head'],
  },
  {
    id: 'checkout',
    title: 'Checkout / Switch (전환)',
    location: 'local',
    whatIsIt:
      '작업 줄기(브랜치)나 특정 커밋으로 이동하는 일이다. 이동하면 작업 디렉터리의 파일들이 그 위치의 내용으로 바뀐다. 최근 Git은 switch라는 더 명확한 명령을 권한다.',
    whenToUse:
      '다른 브랜치에서 작업하거나, 과거의 어떤 커밋 상태를 잠깐 살펴보고 싶을 때.',
    pitfalls: [
      '전환하면 화면의 파일 내용이 바뀐다. 커밋하지 않은 변경이 있으면 충돌하거나 막힐 수 있으니, 보통 먼저 커밋하거나 stash한다.',
      '브랜치가 아니라 커밋 해시로 직접 이동하면 detached HEAD 상태가 된다.',
    ],
    relatedCmd: 'git switch <브랜치>   /   git checkout <브랜치>',
    seeAlso: ['branch', 'head', 'detached-head'],
  },

  // ────────────────────────────── 서버 동기화 ──────────────────────────────
  {
    id: 'push',
    title: 'Push (푸시)',
    location: 'local→remote',
    whatIsIt:
      '내 컴퓨터에 쌓아둔 커밋들을 GitHub 서버(origin)로 올려보내는 일이다. 이 순간 비로소 다른 사람도 내 변경을 볼 수 있게 된다.',
    whenToUse:
      '로컬에서 커밋을 한 덩어리 만든 뒤, 백업하거나 동료와 공유하거나 PR을 열기 위해 서버에 반영할 때.',
    pitfalls: [
      '⚠️ push ≠ commit. commit은 로컬 기록, push는 서버 업로드다. 커밋만 하고 push를 안 하면 내 PC에만 남는다.',
      '내가 push하기 전에 서버가 먼저 바뀌어 있으면(이력이 갈라지면) push가 거부된다. 이때는 먼저 pull로 합친 뒤 다시 push한다.',
      'force push(강제 푸시)는 서버 이력을 덮어써서 동료의 커밋을 지워버릴 수 있다. 함부로 쓰지 않는다.',
    ],
    relatedCmd: 'git push origin <브랜치>',
    seeAlso: ['commit', 'pull', 'remote-origin'],
  },
  {
    id: 'fetch',
    title: 'Fetch (페치)',
    location: 'remote→local',
    whatIsIt:
      '서버에 새 커밋이 있는지 확인해서 "가져와 두기만" 하는 일이다. 내가 작업 중인 파일은 건드리지 않는다. 받아온 내용은 origin/main 같은 원격 추적 브랜치에 따로 보관된다.',
    whenToUse:
      '내 작업을 바꾸기 전에, 서버에 어떤 변경이 있는지 먼저 안전하게 확인하고 싶을 때.',
    pitfalls: [
      'fetch는 내 작업 디렉터리를 바꾸지 않는다. 가져만 올 뿐, 합치지는 않는다.',
      '실제로 내 브랜치에 반영하려면 fetch한 뒤 merge를 해야 한다. 이 둘을 한 번에 하는 게 pull이다.',
    ],
    relatedCmd: 'git fetch origin',
    seeAlso: ['pull', 'merge', 'remote-origin'],
  },
  {
    id: 'pull',
    title: 'Pull (풀)',
    location: 'remote→local',
    whatIsIt:
      '서버의 최신 변경을 가져와서(fetch) 내 현재 브랜치에 합치는(merge) 일을 한 번에 한다. 즉 pull = fetch + merge.',
    whenToUse:
      '작업을 시작하기 전, 또는 push가 거부됐을 때 서버의 최신 상태를 내 작업에 반영하려고.',
    pitfalls: [
      'pull은 fetch와 달리 내 작업 디렉터리를 실제로 바꾼다.',
      '서버 변경과 내 변경이 같은 곳을 건드리면 머지 충돌이 날 수 있다(아래 항목 참고).',
    ],
    relatedCmd: 'git pull origin <브랜치>',
    seeAlso: ['fetch', 'merge', 'merge-conflict', 'push'],
  },

  // ────────────────────────────── 협업 ──────────────────────────────
  {
    id: 'pull-request',
    title: 'Pull Request (PR)',
    location: 'remote',
    whatIsIt:
      '"내 브랜치(또는 fork)의 변경을 당신의 브랜치에 합쳐달라"고 보내는 제안서다. 코드 변경을 보여주고, 리뷰·토론·승인을 거친 뒤 합쳐진다.',
    whenToUse:
      '내 작업을 main이나 원본 프로젝트에 반영하고 싶을 때. 특히 권한이 없는 남의 프로젝트엔 fork→PR이 정석.',
    pitfalls: [
      '⚠️ PR을 연다고 곧바로 합쳐지는 게 아니다. PR은 "제안"일 뿐, 머지는 별도의 승인/버튼이 필요하다.',
      'PR을 열기 전에 내 변경이 서버에 push돼 있어야 한다. 로컬에만 있는 커밋은 PR에 담기지 않는다.',
      'PR을 연 뒤에도 같은 브랜치에 push하면 그 커밋이 PR에 자동으로 추가된다.',
    ],
    relatedCmd: '(GitHub 웹에서 New pull request)',
    seeAlso: ['fork', 'push', 'merge', 'branch'],
  },
  {
    id: 'merge',
    title: 'Merge (머지/병합)',
    location: 'local',
    whatIsIt:
      '두 작업 줄기(브랜치)를 하나로 합치는 일이다. 한쪽만 앞서 있으면 그냥 포인터를 옮기고(fast-forward), 양쪽 다 진행됐으면 둘을 잇는 머지 커밋이 새로 생긴다.',
    whenToUse:
      '기능 브랜치 작업이 끝나 main에 반영할 때. PR을 승인해 합칠 때도 내부적으로 머지가 일어난다.',
    pitfalls: [
      '같은 파일의 같은 줄을 양쪽이 다르게 고쳤으면 자동으로 합칠 수 없어 "충돌"이 난다. 사람이 직접 골라줘야 한다.',
      'fast-forward 머지는 새 커밋을 만들지 않아 이력이 깔끔하고, merge 커밋은 합쳐진 시점이 기록으로 남는다. 상황에 따라 선택한다.',
    ],
    relatedCmd: 'git merge <브랜치>',
    seeAlso: ['branch', 'merge-conflict', 'pull-request'],
  },
  {
    id: 'merge-conflict',
    title: '머지 충돌 (Merge Conflict)',
    location: 'local',
    whatIsIt:
      '합치려는 두 변경이 같은 파일의 같은 부분을 서로 다르게 수정해서, Git이 어느 쪽이 맞는지 판단할 수 없는 상태다. Git은 충돌 부분을 마커(<<<<<<< ======= >>>>>>>)로 표시해 사람에게 결정을 넘긴다.',
    whenToUse:
      '내가 만드는 게 아니라, merge나 pull 도중 자동으로 발생한다. 협업에서 자연스러운 일이지 사고가 아니다.',
    pitfalls: [
      '충돌은 잘못이 아니다. 두 사람이 같은 곳을 고치면 당연히 생긴다. 침착하게 둘 중 맞는 코드를 골라 마커를 지우면 된다.',
      '충돌을 해소한 뒤에는 그 파일을 다시 add하고 commit해야 머지가 마무리된다.',
    ],
    seeAlso: ['merge', 'pull'],
  },
  {
    id: 'issue',
    title: 'Issue (이슈)',
    location: 'remote',
    whatIsIt:
      '버그 신고, 기능 제안, 할 일 등을 기록하고 토론하는 게시글이다. 코드 변경 없이 "무엇을 해야 하는지/무엇이 잘못됐는지"를 다룬다.',
    whenToUse:
      '버그를 발견했거나, 새 기능을 제안하거나, 작업을 추적하고 싶을 때. 라벨·담당자·코멘트로 관리한다.',
    pitfalls: [
      'Issue는 대화·기록용이지 코드 자체를 바꾸지 않는다. 실제 수정은 PR로 따로 한다.',
      '좋은 이슈는 재현 방법·기대 동작·실제 동작을 구체적으로 적는다. "안 돼요"만으론 아무도 못 고친다.',
    ],
    seeAlso: ['pull-request'],
  },

  // ────────────────────────────── 보기/상태 ──────────────────────────────
  {
    id: 'diff',
    title: 'Diff (변경 비교)',
    location: 'local',
    whatIsIt:
      '두 시점 사이에 무엇이 바뀌었는지 줄 단위로 보여준다. 추가된 줄은 초록(+), 삭제된 줄은 빨강(-)으로 표시된다.',
    whenToUse:
      '커밋하기 전에 내가 정확히 뭘 바꿨는지 확인할 때, 또는 PR에서 변경 내용을 리뷰할 때.',
    pitfalls: [
      '커밋 전에 diff로 한 번 훑는 습관을 들이면, 실수로 디버그 코드나 비밀키를 커밋하는 사고를 막을 수 있다.',
    ],
    relatedCmd: 'git diff',
    seeAlso: ['commit', 'pull-request'],
  },
  {
    id: 'star',
    title: 'Star (스타)',
    location: 'remote',
    whatIsIt:
      '저장소에 "북마크/좋아요"를 누르는 일이다. 나중에 찾기 쉽게 표시해두고, 프로젝트 인기도의 가벼운 지표가 되기도 한다.',
    whenToUse:
      '나중에 다시 보고 싶은 프로젝트거나, 응원하고 싶은 프로젝트에.',
    pitfalls: [
      'Star는 fork나 watch와 다르다. 코드를 가져오지도, 알림을 받지도 않는다. 그냥 즐겨찾기다.',
    ],
    seeAlso: ['fork'],
  },
  {
    id: 'detached-head',
    title: 'Detached HEAD (분리된 HEAD)',
    location: 'local',
    whatIsIt:
      'HEAD가 브랜치가 아니라 특정 커밋을 직접 가리키는 상태다. 과거 커밋을 해시로 직접 checkout하면 발생한다. 둘러보기엔 괜찮지만, 여기서 만든 커밋은 어느 브랜치에도 속하지 않는다.',
    whenToUse:
      '의도적으로 만드는 일은 드물다. 보통 과거를 살펴보다가 "어쩌다" 빠지는 상태이며, 그 자체로 가르치기 좋은 순간이다.',
    pitfalls: [
      '이 상태에서 한 커밋은 브랜치가 가리키지 않아, 다른 브랜치로 이동하면 길을 잃고 사라질 수 있다.',
      '탈출: 작업을 남기려면 새 브랜치를 만들고(git switch -c <이름>), 그냥 빠져나오려면 기존 브랜치로 switch하면 된다.',
    ],
    relatedCmd: 'git switch -c <새브랜치>',
    seeAlso: ['head', 'checkout', 'branch'],
  },
];

// id로 빠르게 조회하기 위한 맵
export const conceptsById: Record<string, Concept> = Object.fromEntries(
  concepts.map((c) => [c.id, c]),
);

export function getConcept(id: string): Concept | undefined {
  return conceptsById[id];
}
