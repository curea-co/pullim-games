# 2026-05-19 — UI 변경 PR 4 viewport 캡처 의무화 룰

- **상태**: ACCEPTED + EXTENDED (2026-05-19) — §1 합의 완료. Phase 1+2 머지 PR #67. fold-aware 확장 (§8.2.1·§8.2.2 critical vs informational 분류) PR #N 추가 머지 — billing "신청" 등 form 안 button 자연 스크롤 허용.
- **트리거**: 2026-05-18 세 번의 UI 회귀 모두 사용자 캡처로 발견 (PR #61 행/열 정렬 · PR #65 ManageNav overflow · PR #66 320 viewport 7 게임 overflow). e2e + plan + vitest 만으로는 viewport overflow·시각 회귀 잡지 못함 — UI 변경 자체 캡처 단계 부재가 패턴.
- **메모리 룰**: 문서화 먼저, 코드는 그 다음 (feedback_docs_first). UI 변경은 비자명 → plan 단계 필수. 본 plan 자체가 그 결을 강제하는 룰.
- **연관**: `~/dev_git/.pullim-meta/CONVENTION.md` §7 (audit 트리거) 보완.

---

## 0. 현 상태 분석

### 누락된 검증 layer
- typecheck/lint — 컴파일 차원만
- vitest — 순수 로직만
- e2e (playwright) — chromium 1280×720 단일 viewport, 200 OK + CTA 텍스트 매칭만
- **모바일 viewport overflow·시각 톤·행/열 정렬 검증 layer = 0**

### 어제 회귀 3건 회고 (2026-05-18)

| PR | 회귀 유형 | 발견 경로 | 영향 viewport |
|---|---|---|---|
| #61 | 와이드 grid 행/열 정렬 깨짐 (Phase 1 머지 후) | 사용자 캡처 | desktop·wide |
| #65 | ManageNav 6번째 "결제" 탭 화면 밖 | 사용자 캡처 | mobile 390 |
| #66 | 7 게임 정답 버튼 320 viewport overflow | 사용자 캡처 ("사칙 타워디펜스") | mobile-sm 320 |

→ 패턴: UI 컴포넌트 변경 후 e2e 통과 + 사용자 캡처 시점에 회귀 발견. 머지 전 자체 캡처 단계 부재.

---

## 1. 추천 룰 — UI 변경 PR 머지 전 4 viewport 자체 캡처 + bbox overflow audit 의무화

### A. 트리거 조건 (HARD — 즉시 의무화)

다음 영역 변경 PR은 머지 전 **4 viewport 자체 캡처 + bbox audit 통과** 의무:

| 트리거 | 영역 |
|---|---|
| **T-UI-1** | `src/components/game-mechanics/` 4 메커니즘 변경 |
| **T-UI-2** | `src/components/{game-shell,game-hub,shell,dashboard,RecommendationCard,GameCard,manage}/` 변경 |
| **T-UI-3** | `src/components/ui/` 디자인 시스템 컴포넌트 변경 |
| **T-UI-4** | `src/app/**/page.tsx` `src/app/**/layout.tsx` 변경 |
| **T-UI-5** | `src/games/*/component.tsx` 개별 게임 컴포넌트 변경 |
| **T-UI-6** | `tailwind.config.ts` 토큰·테마 변경 |

→ 트리거 1건 이상 해당 시 자체 캡처 의무. CSS/Tailwind 클래스만 변경된 경우도 포함.

### B. 캡처 spec (4 viewport)

| viewport | 의미 | 핵심 검증 |
|---|---|---|
| **320×568** | iPhone SE 1세대 · 안드로이드 소형 | 최소 모바일 — 모든 버튼·텍스트 viewport-in (overflow=0) |
| **390×844** | iPhone 13/14/15 standard | 일반 모바일 — 시각 톤·여백 적절 |
| **768×1024** | iPad portrait · 태블릿 | 중간 레이아웃 — 1열↔2열 전환 자연스러움 |
| **1280×800** | desktop standard | 와이드 — 행/열 정렬 깨짐 0 |

각 viewport에서:
1. `playwright`로 변경 영역 fullPage 캡처
2. bbox audit — 모든 `button`·`a`·`[role='button']`·`[draggable='true']` 의 `right > vw + 1` 또는 `bottom > vh + 1` 검사
3. 발견 시 0 overflow 까지 fix

### C. 자동화 — `scripts/capture-ui-audit.mjs` 신규

본 plan §3 Phase 2 산출:
- 4 viewport · 임의 path 인자
- bbox audit 결과 JSON 출력 (overflow list)
- CI integration (선택, V0.4+) — PR 머지 차단 GateKeeper

### D. 룰 반영 위치

- **CONVENTION.md §8 신설** (`~/dev_git/.pullim-meta/CONVENTION.md`, git-untracked 직접 반영)
- `pullim-games/CLAUDE.md` §추가 행 — "UI 변경 PR 캡처 의무 — CONVENTION §8 참조"
- 룰 신설 PR과 script 신설 PR 분리 (룰 먼저, script 후행)

---

## 2. 결정점

### D1 — 트리거 조건 범위
- **(A 추천)** T-UI-1 ~ T-UI-6 모두. CSS/Tailwind 변경 포함.
- (B) `*.tsx` 만, tailwind config 제외.

→ A 채택. 어제 PR #61 의 토큰 미정의 케이스가 후자에서 누락.

### D2 — 4 viewport 채택
- **(A 추천)** 320·390·768·1280. 어제 3건 회귀가 320·390·desktop 분포 — 모두 커버.
- (B) 390·768·1280 만 — 320 제외 (사용자 비율 ↓).

→ A 채택. 320 회귀가 가장 시각적으로 명확.

### D3 — overflow 0 의무
- **(A 추천)** 모든 `button`·`a` overflow=0 hard gate. GameShell `overflow-y-auto` 안에서 스크롤 가능하더라도 메인 정답 버튼은 above-the-fold 의무.
- (B) Critical CTA (정답 버튼·"다음"·메인 액션)만 overflow=0, 보조 영역은 허용.

→ A 채택. soft 룰은 적용 누락 위험.

### D4 — 자동화 단계
- **(A 추천)** Phase 1 룰 정착 (CONVENTION + CLAUDE.md) → Phase 2 script 신설 (`scripts/capture-ui-audit.mjs`). CI integration 은 V0.4+.
- (B) script 먼저 신설, 룰은 후행.

→ A 채택. 룰 정착이 우선, 자동화는 도구.

### D5 — 룰 반영 단위
- **(A 추천)** CONVENTION §8 + CLAUDE.md 참조 1줄 (PR #56 audit 룰과 동일 패턴).
- (B) `proc/spec/ui-capture-rule.md` 신설 — V0.4+ 별 plan.

→ A 채택. games 한정 룰, 짧음.

---

## 3. 작업 항목

### Phase 1 — 룰 정착 PR
- [ ] `~/dev_git/.pullim-meta/CONVENTION.md` §8 신설 "UI 변경 PR 4 viewport 캡처 의무 (games 한정)" — 트리거 6종 + 4 viewport spec + overflow=0 gate
- [ ] `pullim-games/CLAUDE.md` §해당 영역에 1줄 추가 — "UI 변경 PR 캡처 의무는 `~/dev_git/.pullim-meta/CONVENTION.md` §8 참조"
- [ ] CONVENTION §8 변경 이력 row 추가 (§8 신설 2026-05-19)
- [ ] PR 생성·머지 (Plan B 자체가 첫 적용 대상 X — docs only PR이라 캡처 의무 면제)

### Phase 2 — 자동화 script
- [ ] `scripts/capture-ui-audit.mjs` 신규 — 4 viewport 캡처 + bbox audit + JSON 출력
- [ ] `package.json` 에 `"ui:audit": "node scripts/capture-ui-audit.mjs"` 스크립트 등록
- [ ] dev server 의존 — `bun dev` 백그라운드 또는 prod URL 옵션
- [ ] 첫 사용: 어제 잔존 3 게임 (english-blank · genetics-punnett · history-timeline) 320 viewport audit → Plan A Phase 2 검증과 연동

### Phase 3 — CI integration (V0.4+, 별 plan)
- [ ] GitHub Actions hook — PR diff 가 T-UI-1~6 영역 포함 시 `bun run ui:audit` 자동 실행
- [ ] overflow 발견 시 PR 머지 차단 (GateKeeper)
- 본 plan 비스코프 — Phase 1·2 정착 후 별 plan

---

## 4. 비스코프 (별 plan 트리거)

- **CI integration** — Phase 3, 별 plan.
- **시각 회귀 (visual regression)** — overflow 외 색상·여백·정렬 차원은 별 도구 (Chromatic 등). V0.4+.
- **e2e viewport 매트릭스 확장** — `playwright.config.ts` 의 desktop chromium 단일을 4 viewport 매트릭스로 — Phase 2 script와 별개, e2e 확장은 별 plan.

---

## 5. 영향도

| 영역 | 변경 | LOC |
|---|---|---|
| `~/dev_git/.pullim-meta/CONVENTION.md` §8 | 신규 (트리거·spec·gate) | ≈30 |
| `pullim-games/CLAUDE.md` | 1줄 추가 | +1 |
| `scripts/capture-ui-audit.mjs` (Phase 2) | 신규 | ≈100 |
| `package.json` | 스크립트 추가 | +1 |

→ 총 ≈130 LOC 추가. 코드 변경 X (룰·스크립트만).

---

## 6. 즉시 효과

본 plan 합의·정착 시점부터 즉시 적용:
- Plan A Phase 1·2 (P0 fix + 잔존 overflow) → 첫 적용 대상. 머지 전 4 viewport 자체 audit 통과 의무.
- Plan A Phase 3 (FSRS modes 마이그레이션) — 컴포넌트 직접 변경 아니므로 면제 가능 (호출처 변경만이라 시각 영향 0).
- 미래 모든 UI PR — 본 룰 적용.
