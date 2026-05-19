# 2026-05-19 — 전체 codebase 리뷰 followup

- **상태**: ON-HOLD (2026-05-19) — §1 합의 다음 세션으로 이월. Plan B (UI viewport 캡처 룰) 정착 후 진입.
- **트리거**: 2026-05-18 4 agent 종합 리뷰 (22,648 LOC / 231 파일 / 21 게임) 결과 정착. 어제 종합 회고에서 12 critical + 17 informational 발견, 10 권장 트랙 도출했으나 plan 형태로 미정착 → 본 plan으로 구조화.
- **메모리 룰**: 하이퍼캐주얼 · 학습효과 우선 · 단일 백본 + 다중 모드 · 외재 보상 회피.
- **연관 plan**: `proc/archive/plan/2026-05-18_fsrs-backbone.md` (Phase 2~3 잔존), `proc/archive/plan/2026-05-18_audit-trigger-rules.md` (audit v3 작성 트리거 누적).

---

## 0. 어제 종합 리뷰 결과 요약

4 agent (21 게임 catalog · lib/core · 컴포넌트 · 라우트) 깊이 리뷰. **PR Quality Score: 6.5 / 10** — Critical 다수가 plan trigger 단위, 즉시 fix 2건만 진짜 회귀.

### A. Critical 12건 (P0/P1)

| # | 위치 | 문제 | conf |
|---|---|---|---|
| C1 | `tailwind.config.ts` + `ActivityHeatmap.tsx:48` · `DashboardStatusRow.tsx:67` | `bg-bg-canvas`·`text-type-tertiary` 토큰 미정의 → silent 폴백 | 9/10 |
| C2 | `TypingComponent.tsx:166-167` | `trimmed === answer` case-sensitive → `english-vocab-typing` 영향 | 9/10 |
| C3 | `modes/index.ts (전체)` | `applyAndPersist` 모드 wrapper 0 호출처 (17 호출처 미마이그레이션) | 8/10 |
| C4 | `modes/index.ts:61-64` | 비-default 모드 silent default fallback + 테스트 fallback 고정 | 8/10 |
| C5 | Typing vs WordMatch rating 임계 불일치 | `wc===1→hard` vs `wc<=2→hard` | 8/10 |
| C6 | `srs.ts:108-116` | `saveSrsAndRecord` 3-write 부분 실패 silent | 8/10 |
| C7 | `stats.ts:109-112` | `dueSoonCount` 미리뷰 카드까지 포함 | 7/10 |
| C8 | `billing/page.tsx:76-80` | 알림 신청 이메일 백엔드 전송 0, UI는 "신청 완료" | 9/10 |
| C9 | `curriculum/page.tsx:62-67` | useEffect deps `activeSubjectId` → 불필요한 재로드 | 8/10 |
| C10 | `BlankComponent`·`QuickQuizComponent` | wrongCount 추적 X → 이진 분기 (good/again) | 7/10 |
| C11 | `english-order/component.tsx:174` | `assembled === expected` 토큰 join false negative | 7/10 |
| C12 | `srs.ts:50-54` | `last_review: null → undefined as unknown as Date` 캐스팅 | 7/10 |

### B. Informational 17건

변별력 정책 추상화 부재 · english-word-match 메커니즘 미통합 · 카드 수 부족 (5장×16게임) · `useAttemptCounter` dead hook · icon 충돌 (Pencil) · CorrectBurst `prefers-reduced-motion` 미존중 · app-header placeholder 3개 · manage h1 중복 · `window.confirm` 통일성 · registry getCardsTotal silent 0 · GameHubPage Suspense 경계 확인 · fingerprint 캐싱 부재 · recommendation R<0.85 하드코딩 · barrel 중복 export · content actions XSS path · PWA start_url · AI error 누출.

### C. 어제 잔존 (PR #66 후)

320×568 viewport 잔존 1~4px 미세 overflow 3건: english-blank · genetics-punnett · history-timeline. `GameShell` `overflow-y-auto`로 즉시 도달 가능, UX 영향 0.

---

## 1. 우선순위 + Phase 분할

### Phase 1 — P0 즉시 fix (1 PR, ≤1시간)
- [ ] **C1**: `tailwind.config.ts` 에 `text-type-tertiary` (`#94A3B8` 후보) + `bg-bg-canvas` (`#F8FAFC` 후보) 토큰 정식 등록. `proc/spec/08-디자인-시스템.md` 와 cross-check (G4 확인 권장).
- [ ] **C2**: `TypingComponent.tsx:166-167` — `trimmed.toLocaleLowerCase() === card.problem.answer.toLocaleLowerCase()` 변경. test 1건 추가 (`english-vocab-typing` "Achieve" 입력 정답 인식).
- [ ] e2e 회귀 0 + 320·390·1280 viewport 캡처 (Plan B 룰 사전 적용).

### Phase 2 — 잔존 미세 overflow 3건 (1 PR, ≤30분)
- [ ] english-blank: 보기 카드 sm: 분기 한 번 더 조정 (1px 초과)
- [ ] genetics-punnett: RatioInput 4px 초과 — Slider gap 또는 PunnettGrid 사이즈
- [ ] history-timeline: 사건 풀 carousel 또는 wrap 컴팩트화 (14→2px 까지 줄어든 상태)
- [ ] 320×568 audit 0 overflow 목표

### Phase 3 — FSRS modes wrapper 마이그레이션 (별 plan, 대형)
- 어제 archive plan `2026-05-18_fsrs-backbone.md` Phase 2~3 후속
- [ ] **C3 + C4 + C5 통합** — 17 호출처(4 메커니즘 + 13 게임)를 `applyAndPersist('default', gameId, cardId, {correct, wrongCount, hintUsed})` 일괄 마이그레이션
- [ ] BlankComponent·QuickQuizComponent rating 정책 명시 (C10 결정 — 이진 vs Typing 패턴 통일)
- [ ] modes silent fallback → `console.warn` 또는 explicit throw (C4)
- [ ] vitest fallback 테스트 → `it.skip` 또는 `expect.fail` 패턴
- [ ] `useAttemptCounter` 훅 실사용처 부활 (informational dead hook)

### Phase 4 — 데이터 정합성·성능 잔손 (1~2 PR)
- [ ] **C6**: `saveSrsAndRecord` 3-write 반환 shape `{ srs: ok, streak: ok, activity: ok }` + `/api/event` telemetry
- [ ] **C7**: `dueSoonCount` 미리뷰 제외 — `state.reviewCount > 0 &&` 조건 추가
- [ ] **C9**: `curriculum/page.tsx` useEffect deps 정리 — `activeSubjectId` 제거, mount 1회 로드
- [ ] **C11**: `english-order` 토큰 join normalize (공백·구두점·대소문자)
- [ ] **C12**: `srs.ts` `last_review` 캐스팅 명시화 — `as Date | undefined` 명확화

### Phase 5 — 변별력·메커니즘 통합 (별 plan trigger)
- [ ] **Informational — 변별력 정책 추상화**: factorization `buildCard` 패턴을 `src/lib/core/distractor/` 신규 helper로 분리. math-quick-quiz·cloze-multi·BlankComponent류 점진 적용.
- [ ] **Informational — english-word-match → WordMatchComponent**: 직접 구현 X, 메커니즘 컴포넌트 채택
- [ ] **Informational — 카드 수 minimum**: SPEC 또는 audit에 "official ≥10장" 명시 + 우선 게임부터 확장
- [ ] **Informational — icon 충돌 해소**: Pencil 중복 등 audit 1회

### Phase 6 — UX·a11y polish (1 PR 묶음)
- [ ] **Informational — CorrectBurst `prefers-reduced-motion`**: `useReducedMotion()` 적용
- [ ] **Informational — manage h1 중복**: layout vs page h1 정리
- [ ] **Informational — `window.confirm` 통일**: shadcn `AlertDialog` 마이그레이션 (subjects·curriculum)
- [ ] **Informational — app-header placeholder 정리**: 검색·알림·프로필 V0.5+ 미정 → SR-only 또는 hidden

### Phase 7 — V2 트리거 (별 plan)
- [ ] **C8 + Informational — billing 백엔드**: `/api/event` 재사용 또는 안내 톤다운 ("관심 기록(이메일은 저장되지 않아요)") + V2 출시 plan 별 트랙
- [ ] **Informational — 결제 정책 명세**: `proc/spec/05-비즈니스-정책.md §결제·구독` 신설 (별 plan)
- [ ] **Informational — content actions XSS path**: dangerouslyHTML 도입 시 sanitize 의무 명시
- [ ] **Informational — AI error 누출**: content/actions.ts `e.message` → 일반화 메시지 + 서버 로그 분리

### Phase 8 — audit v3 작성 (CONVENTION §7 트리거 누적)
- [ ] 어제 T3(modes wrapper 백본 변경) + T5(ts-fsrs 메이저) HARD 트리거 누적
- [ ] `proc/audit/2026-05-19_games-catalog-audit-v3.md` 신규 — 단일 백본 진척 표·알고리즘 버전·production 동기화 행 신규
- [ ] 본 plan §1.A 12 critical · §1.B 17 informational 모두 audit finding 행으로 기록

---

## 2. 결정점

### D1 — Phase 1 진행 단위
- **(A 추천)** P0 1 PR (C1 + C2). 작업 폭 작음, 회귀 위험 명확.
- (B) C1·C2 별 PR 2건 분리. 회귀 원인 더 명확하나 작업 단위 잘게.

→ **A 채택**. 두 fix 모두 독립 영역.

### D2 — Phase 3 (FSRS modes wrapper) 진입 시점
- **(A 추천)** Phase 1·2 fix 후 Phase 3 별 PR. 17 호출처 마이그레이션 = 가장 큰 작업.
- (B) Phase 3을 먼저 — 모든 wrapper 정착 후 fix 진행.

→ **A 채택**. 즉시 fix 먼저, 후속 큰 마이그레이션은 별 트랙.

### D3 — Informational 처리 단위
- **(A 추천)** Phase 5~7에 묶음 + V2 트리거 분리. Phase 6 묶음 1 PR (a11y·UX polish).
- (B) 각자 별 PR — 17건 = 17 PR. 작업 단위 잘게.

→ **A 채택**.

### D4 — audit v3 작성 시점
- **(A 추천)** Phase 8 = 본 plan §1 완결 후 종합 audit v3 작성. 본 plan §0 결과 + Phase 1~7 산출 모두 audit finding 행으로.
- (B) audit v3 먼저 — 본 plan의 우선순위 audit에 반영 후 fix.

→ **A 채택**. fix 산출과 함께 audit.

### D5 — Plan 분리 vs 통합
- **(A 추천)** 본 plan 단일 — 7 Phase 묶음. archive 이관 시점도 단일.
- (B) Phase 별 plan 분리.

→ **A 채택**. Phase별 PR은 분리, plan은 1건.

---

## 3. 작업 항목 (Phase 우선순위 순)

§1 Phase 1~8 모두 위 표 따름. 각 Phase 진입 시 머지 후 본 plan §1 [x] 체크리스트 자가 검증.

---

## 4. 비스코프 (별 plan 트리거)

- **결제 V2 정식 출시 plan** — Phase 7 별 plan 트리거. 가격·기능 비교·법적 약관 포함.
- **`proc/spec/audit-trigger.md` 신설** — V0.4+ 별 plan.
- **production 헬스체크 자동화** — 별 plan. 본 plan은 fix 단위만.
- **사용자 메뉴 드롭다운** (V0.4+) — 별 plan.

---

## 5. 영향도

| Phase | 추정 LOC | 추정 PR | 비고 |
|---|---|---|---|
| 1 (P0 즉시 fix) | +20 / -10 | 1 | C1 + C2 |
| 2 (잔존 overflow) | +15 / -10 | 1 | 3 게임 sm: 분기 추가 |
| 3 (FSRS modes 마이그레이션) | +50 / -100 | 1 대형 | 17 호출처 일괄 |
| 4 (데이터 정합성) | +30 / -10 | 1~2 | 4 영역 |
| 5 (변별력·메커니즘) | +200 / -100 | 2~3 | 별 plan trigger 포함 |
| 6 (UX·a11y polish) | +40 / -30 | 1 묶음 | 4 informational |
| 7 (V2 트리거) | 별 plan | 0~1 | 정책 명세 우선 |
| 8 (audit v3) | +50 (docs) | 1 chore | 모든 산출 통합 |
| **합** | ≈+400 / -260 | 6~9 | 약 1주 트랙 |
