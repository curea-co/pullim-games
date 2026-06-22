# 화학 반응식 균형 (chemistry-balance)

- **gameId**: `chemistry-balance`
- **과목 · 단원**: 과학 / 화학I
- **메커닉**: manipulation (조작)
- **retrieval 깊이**: deep (깊음, 생성형)
- **세션 길이**: 약 3분
- **상태**: `available`

## 시작하기

1. **이 디렉토리만 작업하세요.** `apps/games/lib/core/` 변경이 필요하면 별도 PR.
2. `bun run dev` → `http://localhost:3033/games/chemistry-balance` 에서 확인.
3. 테스트: `bun run test -- games/chemistry-balance/` (logic/parse.test.ts 10개)

## 핵심 명제

좌변과 우변에 분자가 떠 있고, 학생이 각 분자 앞 계수를 손으로 +/- 한다. 양변의 원자 수가 균형되는 순간 반응식이 결합된다. **계수 조작 자체가 화학량론 retrieval.**

> **wow 모먼트**: "어 양변 산소가 똑같아지니까 반응식이 닫혔네"

## 구현 현황

- [x] 분자 카드 컴포넌트 (CoefAtom: 화학식 + 계수 +/- 버튼, 1~9 범위)
- [x] 양변 원자 수 실시간 카운터 (균형 시 jade 강조)
- [x] [logic/parse.ts](logic/parse.ts) — 정규식 기반 화학식 → 원소별 원자 수 (10개 단위 테스트)
- [x] 균형 시 jade 결합 + spring 220ms
- [x] 5장 카드: 단순결합/분해/연소/금속산화/유기연소
- [x] FSRS 통합 (wrongCount 0=good / 1=hard / 2+=again)
- [x] 정답 판정 — 정답 계수 정확 일치 (교과서식 최소정수계수)

## 콘텐츠 후보 (V2 작업 시 5장 우선, 난이도 1~5)

1. **단순 결합 (난이도 1)**: `H2 + O2 → H2O` → `2H2 + O2 → 2H2O`
2. **단순 분해 (난이도 2)**: `KClO3 → KCl + O2` → `2KClO3 → 2KCl + 3O2`
3. **연소 (난이도 3)**: `CH4 + O2 → CO2 + H2O` → `CH4 + 2O2 → CO2 + 2H2O`
4. **금속 산화 (난이도 4)**: `Fe + O2 → Fe2O3` → `4Fe + 3O2 → 2Fe2O3`
5. **유기 연소 (난이도 5)**: `C2H6 + O2 → CO2 + H2O` → `2C2H6 + 7O2 → 4CO2 + 6H2O`

## 주의

- factorization과 같은 "수식 변형" 결의 manipulation — wow 모먼트가 비슷하니 시각 패턴은 차별 (분자 카드 vs 항 블록)
- 외재 보상 (스트릭, 점수 합산) 자제. "원자가 맞다" 자체가 보상
- "찰칵" 결합 시각은 220ms 이내 spring — 화려한 폭죽 X (proc/spec/08 §8.6)
- 화학식 표기는 한국 교과서 표준 (아래첨자 X 대신 단순 텍스트 "H2O" 형태로 V2 시작, V3+ 에서 진짜 첨자 검토)
