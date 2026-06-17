# 영단어 매칭 (english-word-match)

- **gameId**: `english-word-match`
- **과목 · 단원**: 영어 / 수능 어휘
- **메커닉**: matching (매칭)
- **retrieval 깊이**: shallow (얕음, 인식형)
- **세션 길이**: 약 1분
- **상태**: `available`

## 시작하기

1. **이 디렉토리만 작업하세요.** `src/lib/core/` 변경이 필요하면 별도 PR.
2. `bun run dev` → `http://localhost:3033/games/english-word-match` 에서 확인.
3. 테스트: `bun run test -- src/games/english-word-match/`

## 핵심 명제

영어 단어 5개 + 한국어 의미 5개가 무작위로 흩어져 있고, 학생이 의미 짝을 맞추면 두 카드가 결합 애니메이션으로 합쳐진다. Quizlet match 류 — retrieval 얕지만 spacing 효과로 어휘 보존.

> **wow 모먼트**: "탁탁탁 — 어휘가 머리에 박히는 손맛"

## 구현 현황

- [x] 좌·우 컬럼 deterministic shuffle (각각 다른 seed)
- [x] 2-탭 매칭 — 한쪽 탭(하이라이트) → 반대쪽 탭(매칭 시도)
- [x] 짝 정답 시 AnimatePresence + scale 0.85 + fade-out
- [x] 오답 시 두 카드 동시 shake + 600ms 후 selection reset
- [x] 5장 카드: 동사/추상명사/형용사/혼동어휘/어법빈출
- [x] FSRS rating 분기 (wrongCount 0=good, 1-2=hard, 3+=again)

## 콘텐츠 후보 (V2 작업 시 5장 우선)

1. **수능 빈출 동사 5종**: pursue / 추구하다, contradict / 모순되다, perceive / 인식하다, distinguish / 구별하다, regulate / 조절하다
2. **추상 명사 5종**: integrity / 진실성, prejudice / 편견, dilemma / 딜레마, consensus / 합의, perspective / 관점
3. **형용사 5종**: profound / 심오한, ambiguous / 애매한, inevitable / 불가피한, sufficient / 충분한, deliberate / 의도적인
4. **혼동 어휘 5종**: adopt / 채택하다 vs adapt / 적응하다, principle / 원칙 vs principal / 주요한, etc.
5. **수능 어법 빈출 5종**: confide / 신뢰하다, comprise / 구성되다, derive / 유래하다, compose / 작곡하다, devote / 헌신하다

## 주의

- Quizlet 정면 비교 위험 — 차별점은 **단일 백본 (FSRS)** 으로 다른 게임과 카드 풀 공유. 같은 어휘를 빈칸 추론 / 어순에서 다시 만남
- 짝 결합 애니메이션은 220ms spring 이내 — 2초짜리 폭죽 X
- 외재 보상 (콤보, 콤보 카운터) 자제. "박힌다"는 자기효능감 도파민으로 충분
