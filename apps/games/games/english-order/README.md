# 영어 어순 맞추기 (english-order)

- **gameId**: `english-order`
- **과목 · 단원**: 영어 / 어법·어순 (5형식, 형용사/부사 위치)
- **메커닉**: sorting (정렬)
- **retrieval 깊이**: medium (중간, 출력형)
- **세션 길이**: 약 2분
- **상태**: `available`

## 시작하기

1. **이 디렉토리만 작업하세요.** `apps/games/lib/core/` 변경이 필요하면 별도 PR.
2. `bun run dev` → `http://localhost:3004/games/english-order` 에서 확인.
3. 테스트: `bun run test -- games/english-order/`

## 핵심 명제

한국어 문장이 위에 떠 있고, 영어 단어들이 아래에 흩어져 있음. 학생이 단어를 클릭해 정답 어순으로 슬롯에 채우면 자석처럼 자리에 붙음.

> **wow 모먼트**: "어 단어가 자석처럼 붙네 — 어 이게 영어 어순이구나"

상세: [proc/plan/2026-05-08_game-lineup-and-filtering.md §5](../../../proc/plan/2026-05-08_game-lineup-and-filtering.md)

## 구현 현황

- [x] 단어 클릭 → 슬롯 채우기 인터랙션 (V0.4 click-to-fill, V0.5+ 드래그 검토)
- [x] deterministic shuffle (테스트 안정성)
- [x] 5장 카드 (`content/index.ts`) — 단어 3-6개
- [x] 자동 정답 검사 + 오답 시 shake 애니메이션
- [x] FSRS 통합 — `@/lib/core/fsrs` 공유 백본

## 주의

- Duolingo와 정면 비교될 위험 — 차별점은 **"풀이=게임" 명제** 유지. 듀오링고는 탭 위주, 우리는 자석 인력으로 어순 직관을 학습
- "정답 위치에 자석처럼 붙음" 시각이 핵심 — 이게 빠지면 그냥 어순 정렬 게임이 됨
