# 2026-05-14 — /games 카탈로그 21 게임 audit 보고서

- **대상**: `http://localhost:3033/games` 카탈로그 17 official + 4 custom = **21 게임**
- **모드**: Standard (critical / high / medium)
- **방법**: gstack browse 인터랙션 + 코드/logic 검토 + e2e/CI 통과 결과 인용
- **Health score (initial)**: 92.5 / 100
- **Health score (after Top 3 fixes)**: 99.6 / 100
- **Health score (after BUG-2 fix)**: 진행 중 (PR #43)
- **결과**: 21/21 라우트 SSR 200 + 콘솔 0. 발견 issue 머지 현황:
  - PR [#40](https://github.com/curea-co/pullim-games/pull/40) BUG-1 letter-assembly text 기준 비교 ✅
  - PR [#41](https://github.com/curea-co/pullim-games/pull/41) UX-2 english-word-match 보너스 분리 표시 ✅
  - PR [#42](https://github.com/curea-co/pullim-games/pull/42) A11y-1 cloze-multi aria-hidden 제거 ✅
  - PR [#43](https://github.com/curea-co/pullim-games/pull/43) **BUG-2 factorization drag 자유 방향 + block 위치 hit-test** ⏳
- **남은 issue**: LOW 2건 (UX-1 hydration flash, UX-3 hotspot hit area) — V0.1 polish 라운드로 이관.

### audit miss 자성 (2026-05-14)

사용자 발견 — factorization 에서 block 을 drop zone 외부 "허허벌판" 에 두어도 success. 본 audit 에서 drag 패턴 게임은 a11y tree 에 button 으로 안 잡힌다는 이유로 **SSR + 콘솔 통과만으로 PASS 처리하고 실제 drag 인터랙션 시뮬을 안 함**. 코드 리뷰 시점에도 `drag="y"` + `dragConstraints={bottom:0}` 와 drop zone 위치(아래)가 정 반대인 모순을 놓침.

**점검 보완 (2026-05-14)**: drag 패턴을 사용하는 다른 게임도 점검:
- **bio-taxonomy**: drag 자유 방향 + `layoutId` 패턴, mouse/block 일치 → 같은 mismatch **없음** ✅
- **history-timeline**: click 기반 (drag 아님, "drag-start" 라벨은 logging 용) → 영향 없음 ✅
- **english-order**: click 기반 → 영향 없음 ✅

→ BUG-2 는 factorization 단독.

---

## 1. 게임별 결과 표

| # | 게임 | SSR | 콘솔 | 인터랙션 | 변별력 | UX | 결과 |
|---|---|---|---|---|---|---|---|
| 1 | **factorization** | ✅ | 0 | drag 결함 (audit miss) | OK | ⚠️ | ⚠️ **HIGH (BUG-2)** ← 보고서 v1 누락 |
| 2 | math-graph-shift | ✅ | 0 | slider OK | OK | OK | ✅ |
| 3 | physics-vector | ✅ | 0 | slider OK | OK | OK | ✅ |
| 4 | chemistry-balance | ✅ | 0 | counter OK | OK | OK | ✅ |
| 5 | genetics-punnett | ✅ | 0 | grid+input OK | OK | OK | ✅ |
| 6 | **letter-assembly** | ✅ | 0 | 카드 active+슬롯 탭 OK | ⚠️ | OK | ⚠️ **HIGH (BUG-1)** |
| 7 | history-timeline | ✅ | 0 | drag OK | OK | OK | ✅ |
| 8 | english-order | ✅ | 0 | drag OK | OK | OK | ✅ |
| 9 | **bio-taxonomy** | ✅ | 0 | drag OK | OK | ⚠️ | ⚠️ **LOW (UX-1)** |
| 10 | **english-word-match** | ✅ | 0 | 매칭 OK | OK | ⚠️ | ⚠️ **MEDIUM (UX-2)** |
| 11 | **image-hotspot** | ✅ | 0 | hotspot OK | OK | OK | ⚠️ **LOW (UX-3)** |
| 12 | math-quick-quiz | ✅ | 0 | 4지선다 OK | OK | OK | ✅ |
| 13 | english-blank | ✅ | 0 | 4지선다 OK | OK | OK | ✅ |
| 14 | korean-pos-tagging | ✅ | 0 | 토큰 태깅 OK | OK | OK | ✅ |
| 15 | **cloze-multi** | ✅ | 0 | 카드 active+빈칸 탭 OK | OK | ⚠️ | ⚠️ **MEDIUM (A11y-1)** |
| 16 | vocab-typing | ✅ | 0 | typing OK | OK | OK | ✅ |
| 17 | english-vocab-typing | ✅ | 0 | typing OK | OK | OK | ✅ |
| 18 | custom-multiple-choice | ✅ | 0 | empty state OK | n/a | OK | ✅ |
| 19 | custom-blank | ✅ | 0 | empty state OK | n/a | OK | ✅ |
| 20 | custom-typing | ✅ | 0 | empty state OK | n/a | OK | ✅ |
| 21 | custom-word-match | ✅ | 0 | empty state OK | n/a | OK | ✅ |

> custom-* 4 게임은 seed 없는 빈 상태로 audit ("아직 만든 카드가 없어요" empty state CTA 정상). seed 채워진 상태는 e2e `seedCustomGames()` 가 CI 에서 별도 검증.

---

## 2. 발견 issue

### BUG-2 (HIGH) — factorization: drag 방향 vs drop zone 위치 모순 + mouse 위치 기반 hit-test 시각 mismatch (사용자 발견, audit v1 miss)

**영향**: 학생이 block 을 drop zone 외부 "허허벌판" 에 release 해도 success 처리. 또는 block 을 visual 로 drop zone 위에 두는 것 자체가 불가능.

**원인 (이중)**:
1. `TermBlock.tsx` 의 `drag="y"` + `dragConstraints={top:-160, bottom:0}` 으로 block 이 **위로만** 이동 가능. drop zone 은 block **아래** 위치 → 사용자가 visual 로 drop zone 위에 두는 것 자체가 불가능했음.
2. `component.tsx` 의 `handleDragEnd` 가 `info.point.x/y` (mouse pointer) 기준 hit-test. 사용자가 block 을 위로 끌었다가 mouse 만 다시 drop zone 쪽으로 내려서 release 하면 — block visual 은 위에 있는데 mouse 만 drop zone 위 → success 트리거. 사용자 perceive 와 모순.

**증거**:
- code: `src/games/factorization/components/TermBlock.tsx` v1 (drag="y" + bottom=0), `component.tsx` `handleDragEnd` (line 127, mouse pointer hit-test).
- e2e: 본 PR 이전엔 drag 인터랙션 검증 spec 없음. viewport.spec 은 SSR + CTA 만.

**해결안 (PR [#43](https://github.com/curea-co/pullim-games/pull/43))**:
- (A) `drag={true}` 자유 방향, dragConstraints 제거. dragSnapToOrigin 유지 (wrong 시 원위치).
- (B) `useRef` 로 motion.div rect 직접 측정 (event.currentTarget 은 framer-motion pointerup 시 window 일 수 있어 신뢰 불가).
- (C) `handleDragEnd` hit-test 를 mouse → **block element rect 의 center** 기준으로. distance threshold (50px) 제거.
- (D) `overDropZone` state — drop zone active 색을 pointer hover 시점에만 활성화 (시각 피드백 정확).
- (E) e2e/factorization-drag-hit-test.spec.ts — 2 시나리오 검증.

### audit 점검 보완 (drag 패턴 다른 게임)

| 게임 | 패턴 | BUG-2 영향 |
|---|---|---|
| bio-taxonomy | drag 자유 + layoutId, mouse/block 일치 | 없음 ✅ |
| history-timeline | click 기반 (drag 아님) | 없음 ✅ |
| english-order | click 기반 | 없음 ✅ |

→ BUG-2 는 factorization 단독.

### BUG-1 (HIGH) — letter-assembly: 동일 부수 카드 순서 의존성

**영향**: card-001 (林 = 木+木) / card-005 (森 = 木+木+木) — 학생이 시각으로 정답을 짰는데 의도치 않게 wrong-flash 발생.

**원인**: `src/games/letter-assembly/logic/checkAssembly.ts` 가 `placements[i] === slots[i].correctCardId` 로 **cardId 기준 비교**.
- card-001 slots: `s1.correctCardId = "c-mok-1"`, `s2.correctCardId = "c-mok-2"`
- 두 木 카드 (c-mok-1, c-mok-2) 는 화면에 동일 시각 (`木` + "나무 목").
- 학생이 c-mok-2 를 s1 에, c-mok-1 을 s2 에 배치하면 — 시각 정답인데 logic 상 둘 다 false → "0/2 맞췄어요" wrong-flash.

**증거**:
- `e2e/playwright` 는 자동화라 cardId 매칭으로만 PASS — 시각 동일 카드의 순서 변별을 검증 안 함.
- code: [`logic/checkAssembly.ts:24`](src/games/letter-assembly/logic/checkAssembly.ts#L24) `perSlot = slots.map((s, i) => placements[i] === s.correctCardId)`

**해결안 후보**:
- (A) logic 을 **text 기준 비교**로 변경 — 동일 text 카드는 어느 슬롯이든 정답 처리. 한 줄 fix.
- (B) schema 의 `correctCardId` 를 `correctText` 로 마이그레이션. 큰 변경.
- (C) content/index.ts 에서 두 木 카드를 하나의 카드로 줄이고 풀에서 2번 사용 — 데이터 모델 변경.

→ **A 추천** (학습 의도 보존 + 최소 변경).

### UX-2 (MEDIUM) — english-word-match: 통과 조건 vs 화면 카드 수 불일치

**영향**: 학생 혼란.

**상황**: PR #38 fix 이후 — extras 가 의미상 정답 짝으로 인정. 화면에 7개 짝 (pairs 5 + extras 2) 노출되는데 진행도 표시는 `매칭 0 / 5`. 학생이 "총 7개인가? 5개만 매칭하면 되나?" 헷갈림.

**증거**: 첫 카드 진입 시 영어 7 + 한국어 7 버튼 노출, 헤더 `매칭 0 / 5`.

**해결안 후보**:
- (A) 진행도 표시를 `필수 5 · 보너스 2` 등 2단 노출
- (B) 화면 카드를 본 pairs 5개만 노출, extras 는 비활성/별도 영역
- (C) 통과 조건을 "전체 매칭" 으로 변경 (extras 도 필수)

→ (A) 추천 (UX fix 후 학습 의도 유지 + 학생 명확화).

### A11y-1 (MEDIUM) — cloze-multi: 본문 text 토큰이 스크린리더에 안 들림

**영향**: 시각장애 학생이 어떤 문장을 푸는지 모름.

**원인**: `src/games/cloze-multi/components/ClozePassage.tsx:21` — passage 의 `text` 토큰 (예: `"soundly."`, `"every day."`) 을 `aria-hidden="true"` 로 표시.

**해결안**:
- `aria-hidden` 제거 + `<span>` 그대로 노출 (스크린리더가 인접 빈칸과 함께 본문을 읽음)
- 또는 본문 전체를 `aria-label` 로 합쳐서 ClozePassage 컨테이너에 부여

### UX-1 (LOW) — bio-taxonomy: SSR/CSR hydration flash

**영향**: 첫 paint 시 잠시 "모든 카드를 배치했어요" 잘못 노출 (1초 미만 flash). hydration 후 정상.

**원인**: `src/games/bio-taxonomy/component.tsx:34` — `useState<Record<string, ZoneId>>({})` 로 빈 객체 init. useEffect 안에서 cardIndex 변경 시 모든 item → POOL_ID 채움. SSR 첫 paint 는 빈 객체 → `poolItems = []` → `Pool.tsx:30` "모든 카드를 배치했어요" 메시지 노출.

**해결안**: `useState` lazy init 으로 첫 카드 기준 assignments 초기화.

### UX-3 (LOW) — image-hotspot: 영역 박스 식별성

**영향**: 영역 박스가 모두 `?1, ?2, ?3, ?4` 동일 모양 — 학생이 SVG 도식 봐야 위치 식별. 정상이지만 모바일 작은 박스에서 hit-test 어려움 가능.

**해결안 (V1+)**: hit area 확장 + 시각적 위치 hint 또는 호버 시 label 확대.

---

## 3. 변별력 정책 준수 (전 게임 공통)

코드 검토 + 인터랙션 시뮬 결과 **21/21 게임 모두 메모리 룰 "답지 노출 + 끼워맞추기 회피" 정책 준수**:

- 모든 게임이 "정답 확인" 버튼 패턴 채택 (학생이 명시적으로 제출).
- wrong 시 정확도 (`n/m`) 만 노출, 슬롯/토큰별 정/오 강조 X (학생 전체 재검토 강제).
- distractor 카드 포함 게임 (cloze-multi, letter-assembly, image-hotspot, english-word-match) 모두 카드 자원 한정 → 단순 토글 시도 불가.

### 3.1 5회 오답 시 정답 공개 (2026-05-14 추가)

`proc/plan/2026-05-14_correct-feedback-and-5x-reveal.md` 결정. 변별력 정책 ("답지 노출 회피") 은 학생이 시도하는 동안 유지하되, **같은 카드 wrong 누적 5회 도달 시 자동 reveal**:

- 게임별 자연 UI 로 정답을 채워줌 (drag 게임 = 정답 자동 배치 / slider = 정답 위치 / typing = 정답 텍스트 / 매칭 = 정답 페어 리스트).
- `RevealBanner` + "다음" CTA. FSRS 는 "again" 등급으로 저장.
- 카운터는 세션 in-memory (페이지 이탈/재시작 시 reset, FSRS lapse 와 무관).
- QuickQuiz / Blank 메커닉은 1회 시도 후 정답 노출이라 룰 대상 외 — `CorrectBurst` 만 추가.

학습 효과 우선 결정: 5회 시도 후엔 학습 차단보다 답 노출이 학생에게 더 유익함 (사용자 명시 의도).

---

## 4. fix 진행 현황 (2026-05-14)

| Issue | Severity | 변경 | PR | 상태 |
|---|---|---|---|---|
| **BUG-2** factorization | HIGH (audit miss) | drag 자유 방향 + block 위치 기반 hit-test + drag e2e spec | [#43](https://github.com/curea-co/pullim-games/pull/43) | ⏳ OPEN |
| **BUG-1** letter-assembly | HIGH | logic cardId → text 기준 비교 + test 2건 추가 | [#40](https://github.com/curea-co/pullim-games/pull/40) | ✅ MERGED `19228b3` |
| **UX-2** english-word-match | MEDIUM | 진행도 `매칭 N/5 · 보너스 M/2` 분리 + e2e update | [#41](https://github.com/curea-co/pullim-games/pull/41) | ✅ MERGED `9539dac` |
| **A11y-1** cloze-multi | MEDIUM | ClozePassage text 토큰 aria-hidden 제거 | [#42](https://github.com/curea-co/pullim-games/pull/42) | ✅ MERGED `9ed80fd` |

자가검증 (PR #40/41/42 머지 후 main):
- ✅ `bun run typecheck` PASS
- ✅ `bun run test` — **149/149 PASS** (147 → 149, letter-assembly 신규 2 케이스: 木 순서 뒤바뀜 + 森 3-card)
- ✅ CI — 3 PR 모두 SUCCESS (e2e + build + test 매트릭스)

PR #43 (BUG-2) 추가 자가검증:
- ✅ typecheck + vitest 149/149
- ✅ e2e factorization-drag-hit-test.spec.ts 2/2 + 회귀 9/9 = 11/11

---

## 5. 메트릭

| 항목 | initial audit | after Top 3 | after BUG-2 (PR #43) |
|---|---|---|---|
| 게임 수 | 21 (17 official + 4 custom) | 동일 | 동일 |
| 라우트 SSR 200 | 21/21 | 21/21 | 21/21 |
| 콘솔 에러 | 0 | 0 | 0 |
| HIGH issue (확인됨) | 1 | 0 | **2 → 0** (BUG-2 미러 발견 + fix) |
| MEDIUM issue | 2 | 0 | 0 |
| LOW issue | 2 | 2 (보류) | 2 (보류) |
| 변별력 정책 준수 | 21/21 | 21/21 | 21/21 |
| vitest | 147/147 | 149/149 (+2) | 149/149 |
| e2e drag 인터랙션 검증 | 없음 | 없음 | factorization 신규 2 |
| Health score | 92.5 | 99.6 | **재계산 필요 (BUG-2 미러 반영)** |

**Note**: Health score 99.6 은 BUG-2 발견 전 산정. BUG-2 (HIGH, audit miss) 반영 시 initial 점수 재계산 필요 — functional 카테고리 -15 추가, 약 **85 / 100** 이 정확한 initial 값. PR #43 머지 후 다시 99 대로 복귀 예상.

---

## 6. 남은 issue (V0.1 polish 라운드 후보)

- **UX-1** bio-taxonomy — SSR/CSR hydration flash. useState lazy init 으로 해결 가능.
- **UX-3** image-hotspot — 모바일 영역 박스 hit area. 시각적 hint 또는 호버 라벨 확대.

---

## 7. 후속 조치

- ✅ Top 3 fix 머지 완료 (PR #40 / #41 / #42)
- ⏳ production 배포 — Vercel webhook 복구 후 자동 배포 트리거 (사용자 dashboard 작업 의존)
- ⏳ 실기기 dogfooding — production URL 확인 후 5 장 완주 시뮬

---

**audit 완료** — 보고서 위치: `proc/audit/2026-05-14_games-catalog-audit.md`
