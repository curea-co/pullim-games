# 수학 빠른 퀴즈 (math-quick-quiz)

- **gameId**: `math-quick-quiz`
- **과목 · 단원**: 수학 / 고1 전 단원
- **메커닉**: multiple-choice (4지선다)
- **retrieval 깊이**: shallow (얕음, 인식형)
- **세션 길이**: 약 1분 (30초~1분)
- **상태**: `coming-soon` (V1.5 출시 후보)

## 핵심 명제

자투리 시간(통학·쉬는 시간) 침투용. 30초 안에 5문제. retrieval 깊이는 얕지만 spacing 효과를 시간 분포로 채움.

상세: [proc/plan/2026-05-08_game-lineup-and-filtering.md §5](../../../proc/plan/2026-05-08_game-lineup-and-filtering.md)

## V1.5 본격 구현 시 작업 범위

- [ ] 4지선다 UI 컴포넌트 (`src/games/math-quick-quiz/components/QuizChoice.tsx`)
- [ ] 5장 카드 JSON (`content/cards/`) — 고1 인수분해·이차방정식·함수 기초 단답
- [ ] 정답 판정 — 단순 equality (객관식이라 AST 변형 X)
- [ ] FSRS 통합 — 같은 카드 풀 공유 (단일 백본 원칙)
- [ ] 세션 시간 표시 (선택, 압박감 X 톤)

## 주의

- 외재 보상 메커닉(스트릭 압박, 가챠 등) **절대 X** — proc/spec/01 §6
- 시간 표시는 정보용이지 압박용 아님. "남은 시간 N초!" 큰 빨간 카운트다운 금지
- 4지선다라 메커닉이 약하니 **wow 모먼트는 "5문제가 30초에 박혔네?"** 자기효능감 도파민
