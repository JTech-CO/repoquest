// 비공식 학습용 고지문 푸터.
// KICKOFF §4 가드레일: "본 사이트는 학습용 비공식 시뮬레이터이며 GitHub, Inc.와 무관합니다."
export default function Footer() {
  return (
    <footer className="border-t border-border-default bg-canvas-subtle">
      <div className="mx-auto max-w-[1280px] px-4 py-4 text-xs text-fg-muted leading-relaxed">
        <p>
          RepoQuest는 Git/GitHub 개념을 직접 눌러보며 배우는 학습용 시뮬레이터입니다. 모든
          저장소·계정·커밋·PR은 브라우저 안의 가짜 데이터이며, 실제 네트워크 통신은
          일어나지 않습니다.
        </p>
        <p className="mt-1">
          본 사이트는 비공식 프로젝트이며 GitHub, Inc.와 어떠한 제휴 관계도 없습니다.
          아이콘은 Primer Octicons(MIT), 디자인 토큰은 Primer(MIT)를 참고했습니다.
        </p>
      </div>
    </footer>
  );
}
