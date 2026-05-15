# 2026-05-12 — 어제 산출물 약속 마무리 + dev→main 릴리스

- **상태**: 확정 (2026-05-12) — 결정점 3개 추천안 채택
- **트리거**: 2026-05-11 산출물 약속 항목 잔여 + 오늘 dev→main 릴리스 묶음 만들기
- **스코프**: ① retroactive 체크, ② 오늘 코딩(chrome minimal + custom-* e2e 한 PR), ③ dev→main 릴리스, ④ 디자인 영역 표시

## 확정안 (one-line)

| 결정점 | 채택 | 핵심 |
|---|---|---|
| 1 | B | §2 까지 dev 묶음 머지 후 dev→main 한 릴리스 PR |
| 2 | b | audit 리포트 `proc/archive/design-audit/2026-05-11.md` 로 repo 보존 |
| 3 | 한 PR | chrome minimal (10) + custom-* (24) 한 e2e 묶음 PR |

---

## 0. 현 상태 ↔ 약속 매핑

| 약속 | 상태 | 비고 |
|---|---|---|
| PR #18 main 머지 확인 — production 배포 | ✅ | 2026-05-12 02:02 UTC, main HEAD = `7d8f63b` |
| PR #16·#17 dev 머지 | ✅ | #17 02:06, #16 02:17. dev HEAD = `178fbbd` |
| dev→main 릴리스 묶음 | ⬜ | dev에 PR #16(aside slot/chemistry pilot) 가 main보다 앞섬. 본 plan §3 |
| layout-overhaul plan 마무리 (8 unchecked) | ⬜ | 코드 작업은 PR #18로 모두 완료. §5 체크리스트 retroactive [x] |
| spec/09 §9.7 콘텐츠 영역 max-w 정책 | ✅ | PR #18 머지로 main 반영 |
| e2e — 게임 페이지 사이드바 nav DOM 부재 케이스 | ⬜ | viewport.spec.ts 신규 case 추가 필요 (본 plan §2.1) |
| audit 리포트 F1·F2·F3 "verified" 표기 | ⬜ | `/tmp/.../design-audit-pullim-games.md` 의 Findings 마커 갱신 |
| game-cta-layout plan 마무리 (15 unchecked) | ⬜ | 코드 완료, retroactive [x] + archive (본 plan §1) |
| Playwright 84 케이스 (qa-playwright Phase 2) | ⬜ | 현재 60 + custom-* 4 게임 × 6 viewport = 84. 본 plan §2.2 |
| not-found.tsx min-h-dvh fix | ✅ | PR #15 (2026-05-11 07:46 UTC) |
| 24 icon 시안 마무리 | ⬜ (디자인) | 본 plan §4 — 사용자 영역, AI 처리 불가 |
| 게임즈 할당 아이콘 선정 | ⬜ (디자인 Gate) | 동상 |
| 다른 풀림 아이콘과의 차별성 검증 | ⬜ (디자인) | 동상 |

---

## 1. Retroactive 체크 (즉시 처리, 코드 변경 없음)

### 1.1 layout-overhaul.md §5
8개 `[ ]` → `[x]` (PR #18 머지로 모두 완료). 보조 노트: "PR #18 (commit 5b2910d~249bd11) 으로 완료, e2e 60/60 green".

### 1.2 game-cta-layout.md retroactive
- §5.3 디자인 회귀 검증 7개 → `[x]` ("PR #17 e2e 60/60 + PR #18 design-audit 시각 확인으로 자동 회귀 차단")
- §5.1 Playwright 84 케이스 → §2.2 로 이관 (본 plan 완료 시 [x])
- 387~390 (디자인 회귀 수동) → game-shell-right-area.md 후속 plan 에 흡수 명시
- 397 (dev→main 머지 + 배포 검증) → 본 plan §3 으로 이관
- 398 (Phase 3 회귀) → game-shell-right-area.md 흡수 (PR #16 머지로 완료)
- 399 (archive 이동) → 본 plan 마무리 시 실행

### 1.3 audit 리포트 fix-status
`/tmp/pullim-games-design-audit-20260511/design-audit-pullim-games.md` 의 Findings 표(F1~F12)에 **"Fix status: verified (PR #18, commit SHA)"** 행 추가:
- F1: 5b2910d
- F2: 3310791
- F3: eaae9f4
- F4: bbf698d
- F5: 38482a0
- F8: 014c0f5
- F10: ce14e88
- F12: 56ff5fa

**경고**: `/tmp` 는 부팅 시 휘발. 영구 보존하려면 `~/.gstack/projects/pullim-games/designs/` 로 옮길지 결정 필요. → §5 결정점

---

## 2. 오늘 코딩 작업 (별 PR 2개)

### 2.1 e2e viewport.spec — 게임 페이지 chrome minimal 회귀 차단 (작은 PR)

**왜 필요**: PR #18 의 F2 (게임 페이지 사이드바 hide + 헤더 minimal) 회귀가 일어나면 시각만 깨지는 게 아니라 학습 몰입 정책 자체가 깨짐. 단순 selector 한 줄로 자동 차단.

**작업**:
- `e2e/viewport.spec.ts` 또는 신규 `e2e/chrome.spec.ts`:
  - `/games/<id>` 진입 시 사이드바 nav (`role="navigation"` aria-label="풀림 게임즈 메뉴") DOM 부재
  - 헤더 우측 검색·알림 버튼 부재
  - 헤더 좌측 ✕ (게임 허브로 복귀) 링크 존재 + `/games` 로 navigate
- 10 official 게임 × 1 viewport (desktop 1280×800) = 10 케이스 (chrome 정책은 viewport 비종속이라 single viewport 충분)

**검증**: `bun run test:e2e` 70/70 green (기존 60 + 신규 10)

**커밋**: `test(e2e): chrome minimal 회귀 차단 — 게임 페이지 사이드바·검색·알림 DOM 부재`

### 2.2 Playwright 84 케이스 — Phase 2 (qa-playwright plan §10.1)

**왜 필요**: 현재 e2e 60 = official 10 게임. custom-* 4 (custom-blank, custom-multiple-choice, custom-typing, custom-word-match) 는 콘텐츠 0이라 빈 상태로 진입 → CTA 위치 검증 불가능 했음. **localStorage seed 로 콘텐츠 채워서 검증**.

**작업** (qa-playwright plan §10.1 흡수):
- `feat/e2e-game-shell-aside` 또는 `feat/e2e-custom-games` 브랜치
- `e2e/helpers/seed.ts` — beforeEach 에 custom-* 4 게임용 localStorage seed (각 게임당 1~3장 카드 mock)
- `e2e/viewport.spec.ts` — OFFICIAL_GAMES + CUSTOM_GAMES 분리. CUSTOM_GAMES 는 seed 필수
- (선택) `e2e/game-shell.spec.ts` — aside slot 정책 검증 (split lg+ chemistry-balance aside 노출, mobile 미노출, stack/match aside DOM 부재). PR #16 에서 GameShell 에 `data-testid="game-shell-aside"` 부여 후 그 selector 사용

**검증**: 84/84 green (60 + 24)

**커밋**:
- `test(e2e): custom-* 4 게임 localStorage seed + 24 케이스 추가 (60→84)`
- (선택) `test(e2e): game-shell aside slot 정책 검증 (split/mobile/stack/match)`

---

## 3. dev → main 릴리스 묶음 (PR)

**왜 한 PR로**: PR #16 (aside slot + chemistry pilot) 만 main 보다 앞섬. §2 의 e2e Phase 2 가 dev 에 머지되면 묶음 커짐. 두 옵션:

**A) PR #16 만 즉시 릴리스 → §2 는 후속 릴리스**
- 빠른 머지, 작은 묶음
- §2 의 e2e 84 케이스가 main 보호 늦어짐

**B) §2 의 e2e Phase 2 까지 dev 머지 후 함께 릴리스**
- 한 번에 릴리스, 사용자 머지 결정 1회
- §2 완료까지 1~2일 추가

**추천: B** — §2 작업 시간 짧고 (각각 30분 ~ 2시간), 한 묶음이 사용자 머지 결정 효율적. e2e 84 케이스가 main 에 빨리 들어가는 게 회귀 차단 가치 큼.

**릴리스 PR 본문 골자**:
- PR #16: chemistry-balance aside pilot (V1 — Phase B 11 게임 확장은 별)
- §2.1: chrome minimal 회귀 차단 e2e (10 case)
- §2.2: custom-* 4 게임 e2e (24 case) — 총 84/84 green
- proc/plan archive: game-cta-layout.md, layout-overhaul.md, qa-playwright-setup.md (모두 완료 후)

---

## 4. 디자인 영역 (AI 처리 불가, 사용자 게이트)

- 24 icon 시안 마무리 (어제 80% → 100%)
- 게임즈에 할당될 아이콘 선정 — **대표/사용자 결정**
- 다른 풀림 아이콘과의 차별성 검증 — 디자인 비교 작업

본 plan 은 코딩/문서만 다룸. 디자인 산출물은 별 트랙으로 진행.

---

## 5. 합의 필요한 결정점

1. **§3 릴리스 묶음 방식**: A (PR #16 즉시) / **B (§2 까지 묶음, 추천)**
2. **§1.3 audit 리포트 영구 보존**:
   - a) `~/.gstack/projects/pullim-games/designs/` 로 이동
   - b) `proc/archive/design-audit/2026-05-11.md` 로 repo 안 보존
   - c) `/tmp` 그대로 (휘발 OK, 핵심은 plan/commit log)
   - **추천**: b — repo history 안에 추적 가능, plan 과 cross-link
3. **§2.2 e2e Phase 2 의 별 PR 분할**: chrome minimal (10 case) + custom-* (24 case) 한 PR / 두 PR? **추천: 한 PR** — e2e 묶음 일관성

---

## 6. 작업 항목 + 자가 검증

순서: ①→②→③ (의존성), ④ 는 디자인 별 트랙

- [x] **①** §1.1 layout-overhaul.md §5 retroactive [x] (8 항목) — PR #19 commit 77f5f8b
- [x] **①** §1.2 game-cta-layout.md retroactive [x] + 이관 메모 (15 항목) — PR #19 commit 77f5f8b
- [x] **①** §1.3 audit 리포트 fix-status verified + `proc/archive/design-audit/2026-05-11.md` 보존 (결정점 2 = b) — PR #19 commit 8c506d3
- [x] **②** §2.1 e2e chrome minimal 회귀 차단 (10 case 신규) — PR #19 commit 6d20961, `e2e/chrome.spec.ts`
- [x] **②** §2.2 e2e custom-* localStorage seed + 24 case — PR #19 commit 6d20961, `e2e/helpers/seed.ts` + `viewport-custom.spec.ts`
- [x] **②** `bun run test:e2e` 94/94 green (60 + 24 + 10) — PR #19 본문 + CI green
- [x] **③** 릴리스 머지 전 plan 3개 (game-cta-layout, layout-overhaul, qa-playwright-setup) `proc/archive/plan/` 이동 — PR A `chore/archive-plans-2026-05-12`
- [x] **③** dev → main 릴리스 PR (결정점 1 = B) — PR B `release: dev → main 2026-05-12`. PR #16(aside slot) + PR #19(cleanup) + PR A(archive) 묶음
- [x] **③** spec/09 §9.7 의 max-w 정책 표 + Chrome 분기 단락 main 반영 확인 — PR #18 commit 249bd11 (main 7d8f63b) 으로 이미 반영
- [ ] **④ (사용자)** 24 icon 시안 + 게임즈 할당 + 차별성 — 디자인 별 트랙, AI 처리 불가

---

## 7. 비스코프 (별 plan/세션)

- design-review F6·F7·F9·F11·F13~F17 (medium/polish 11 findings) — PR #18 Out of scope, 별 묶음 작업
- chemistry-balance aside Phase B (나머지 10 split 게임에 aside 확장) — PR #16 머지 후 별 PR (game-shell-right-area plan §6 의 후속)
- 게임 chrome minimal mode 의 thin progress bar (F2 plan 권장한 ✕ + 게임명 + progress 중 progress bar) — 현재 헤더는 ✕+로고만. progress bar 후속 plan
