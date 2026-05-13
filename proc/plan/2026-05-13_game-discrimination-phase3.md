# 2026-05-13 — 게임 변별력 강화 Phase 3 (4 게임)

- **상태**: DRAFT (2026-05-13) — pilot 1 (english-word-match) 진행 중, 잔여 결정점 D2 합의 후 진행
- **트리거**: 사용자 피드백 — 4 게임 변별력 부족 (I1·I4·I5·I6). `proc/plan/2026-05-12_game-discrimination-and-polish.md` Phase 3 분리
- **메모리 룰**: 학습효과 > 중독성. 답지 노출 → 가설 수립 + 검증 흐름 우선. 시간 압박 회피

## 0. 이슈 4종

| ID | 이슈 | 게임 | 방향 |
|---|---|---|---|
| I1 | 1:1 trivial 매칭 | english-word-match | **distractor (extras) 추가** — N:M 매칭. retrieval depth shallow → medium |
| I4 | 무한 시도 + 즉시 wrong/correct 노출 | chemistry-balance | "정답 확인" 버튼 도입. 계수 +/- 자유, 확정 시 판정 |
| I5 | 답지 노출 + 끼워맞추기 | math-graph-shift | 실시간 그래프 비교 → "정답 확인" 버튼. 가설 수립 후 검증 흐름 |
| I6 | 답지 노출 + 끼워맞추기 | physics-vector | 동일 패턴 (실시간 → 확인 버튼) |

## 1. Phase 3.1 pilot — 본 PR

- **I1 english-word-match distractor** 채택 (이 PR)
  - schema 에 `extras: { english?, korean? }` optional 추가
  - content 5장 모두 의미 유사 함정 2개씩 추가 (영어 + 한국어)
  - component: extras 는 음수 pairIndex 로 분리 — pair (양수) 와 자동으로 매칭 안 됨, 시도 시 wrong-flash

## 2. Phase 3.2 — 별 PR (추후)

- I4 chemistry-balance "정답 확인" 버튼
- I5 math-graph-shift "정답 확인" 버튼
- I6 physics-vector "정답 확인" 버튼

## 3. 결정점

### D1 — Phase 3.1 pilot 진행 ✓ (이 PR)

english-word-match distractor 만 채택. 단순한 schema 추가 + content 확장 + component 음수 ID 분기. 변경량 작음.

### D2 — Phase 3.2 진행 방식 (잔여)

옵션:
- **A (추천)** 3 게임 (I4·I5·I6) 한 PR 묶음 — 동일 패턴 ("정답 확인" 버튼 도입) 이라 한 번에 코드 review 가능
- **B** 게임당 별 PR — 검증 분리, scope 작음
- **C** I4 만 우선 → 그 결과 보고 I5·I6 결정

→ Phase 3.2 진입 시 결정. 본 plan 본 PR scope 외.

## 4. 작업 항목 (Phase 3.1)

- [x] schema `extras` 추가
- [x] content 5장 extras 추가
- [x] component 음수 pairIndex 분기 + extras 매칭 시 자동 wrong
- [ ] typecheck + e2e 회귀
- [ ] commit + PR + 머지 + `vercel --prod` 배포

## 5. 비스코프

- math-quick-quiz, english-blank, custom-* 의 변별력 (이미 multiple-choice 매커닉이라 별도 검토)
- factorization 콘텐츠 난이도 (I3 — `buildCard` 다항식 지원 범위 검토 필요)
