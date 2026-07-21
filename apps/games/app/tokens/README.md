# PUDS snapshot

학생용 허브와 플레이어 공통 chrome은 로컬 PUDS `pullim-jr` snapshot을 소비한다.

- source: `/Users/euiyunkim/Documents/New project/parallel/pullim-design-system`
- commit: `648258ef1884b29e2536942c9d6fc0324cf15ef0`
- upstream inputs: `packages/tokens/_base.css`, `packages/tokens/pullim-jr.css`
- consumed file: `puds-jr.css`

`docs/consuming.md`의 snapshot 규칙에 따라 live registry를 참조하지 않는다. 이 파일의 토큰은 모두 `--puds-*`로 이름공간을 분리하고 `.puds-jr-shell[data-theme="pullim-jr"]` 아래에서만 활성화한다. 기존 게임 캔버스와 `Blank`, `QuickQuiz`, `Typing`, `WordMatch` 메커니즘의 내부 토큰은 변경하지 않는다.

PUDS를 갱신할 때는 로컬 디자인 시스템의 새 commit을 검토한 뒤 토큰 subset과 위 commit을 함께 갱신하고, `/home`, `/games`, 대표 게임 경로에서 4 viewport audit을 다시 실행한다.
