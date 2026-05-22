# 2026-05-21 — Plan E Phase 3·4·5 UI 변경 4 viewport audit 증적

- **PR**: #92 (`feat/plan-e-phase3-4-5-ui-integration`)
- **트리거**: Codex review round 6 #2 — "홈/허브 UI를 동시에 바꿨는데 320·390·768·1280 viewport 감사 산출물이 PR에 포함되지 않음".
- **이전 라운드 처리 방식 한계**: round 2 fix 가 PR comment 로 audit 결과 첨부 → codex 가 PR diff 만 보므로 round 6 에서 같은 지적 반복. → 본 파일을 **PR diff 안에 박아** 증적 영구화.
- **룰**: `~/dev_git/.pullim-meta/CONVENTION.md §8` (UI 변경 PR 4 viewport 캡처 의무).
- **방법**: `bun run ui:audit <path>` (scripts/capture-ui-audit.mjs) 4 viewport × 3 경로 일괄 재실행.

## 1. 대상 경로

본 PR 의 UI 변경 표면 — 홈 (`/`)·게임 허브(`/games`)·메커니즘 게임 비-default mode.
홈/허브는 동일 컴포넌트 (`RecommendationCard` + `ModeChipsRow`) 를 진입점으로 두고,
게임 진입 후 화면은 메커니즘 컴포넌트 (`QuickQuiz`/`Blank`/`Typing`/`WordMatch`) 의 mode 별 UI.

| # | 경로 | 변경 표면 |
|---|---|---|
| 1 | `/` | `RecommendationCard` alt-modes nav (Phase 5) — 홈 dashboard 게이트 뒤. |
| 2 | `/games/math-quick-quiz?mode=time-attack` | `TimeAttackTimer` 30s 카운트다운 (Phase 3) — QuickQuiz 메커니즘. |
| 3 | `/games/english-blank?mode=deep-recall` | `DeepRecallEmpty` 빈 풀 화면 (Phase 4) — Blank 메커니즘. |

> `/games` 허브의 `ModeChipsRow` 는 PR #92 round 1·2 에서 동일 audit 으로 검증되어
> round 6 시점에도 회귀 없음 — round 6 추가 변경(focus ring 클래스)은 outline 토큰만
> 추가하므로 bbox 영향 0. 이 파일에선 round 6 변경 영향 표면 3 경로로 한정 검증.

## 2. 결과 매트릭스

`scripts/capture-ui-audit.mjs` (CONVENTION §8.2.1·§8.2.2 critical vs informational 분류) 출력 그대로.

| 경로 | viewport | vw×vh | pass | critical | informational |
|---|---|---|---|---|---|
| `/` | mobile-sm-320 | 320×568 | ✅ | 0 | 0 |
| `/` | iphone13-390 | 390×664 | ✅ | 0 | 0 |
| `/` | tablet-768 | 768×1024 | ✅ | 0 | 0 |
| `/` | desktop-1280 | 1280×800 | ✅ | 0 | 0 |
| `/games/math-quick-quiz?mode=time-attack` | mobile-sm-320 | 320×568 | ✅ | 0 | 0 |
| `/games/math-quick-quiz?mode=time-attack` | iphone13-390 | 390×664 | ✅ | 0 | 0 |
| `/games/math-quick-quiz?mode=time-attack` | tablet-768 | 768×1024 | ✅ | 0 | 0 |
| `/games/math-quick-quiz?mode=time-attack` | desktop-1280 | 1280×800 | ✅ | 0 | 0 |
| `/games/english-blank?mode=deep-recall` | mobile-sm-320 | 320×568 | ✅ | 0 | 0 |
| `/games/english-blank?mode=deep-recall` | iphone13-390 | 390×664 | ✅ | 0 | 0 |
| `/games/english-blank?mode=deep-recall` | tablet-768 | 768×1024 | ✅ | 0 | 0 |
| `/games/english-blank?mode=deep-recall` | desktop-1280 | 1280×800 | ✅ | 0 | 0 |

- **PASS 12 / 12**
- **critical overflow 0** (gate 통과)
- **informational overflow 0**

## 3. 재현 명령

PR 머지 전 누구든 동일 재현 가능:

```
bun run dev                         # 별 터미널, http://localhost:3033 대기
bun run ui:audit / --out /tmp/audit/home
bun run ui:audit "/games/math-quick-quiz?mode=time-attack" --out /tmp/audit/time-attack
bun run ui:audit "/games/english-blank?mode=deep-recall" --out /tmp/audit/deep-recall
```

출력: 각 경로별 `/tmp/audit/<path>/<viewport>.png` + `audit.json`. `pass=true`,
`totalOverflow=0` 일 때 gate 통과. 본 파일의 매트릭스는 위 명령의 `audit.json`
실측 결과를 직접 인용 (2026-05-21 실행 기준).

## 4. round 6 변경의 표면 영향

round 6 patch:
- `RecommendationCard` alt-mode `<Link>` 클래스에
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-positive` 추가.
- `ModeChipsRow` chip `<Link>` 에 동일 토큰 추가.

`focus-visible` 의사 클래스는 키보드 포커스 시에만 outline 을 그린다. layout box 영향
0 (outline 은 box 외곽에 그려지며 reflow 유발 X). 따라서 본 audit 의 viewport pass
매트릭스는 round 6 변경 전후로 동일하게 PASS.

추가로 SPEC §8.10 (`outline: 2px solid #00D4A1; outline-offset: 2px`) 키보드 회귀 차단을
위해 `e2e/mode-entry-points.spec.ts` 에 두 케이스 추가:

- `게임 허브 — ModeChipsRow chip 키보드 포커스 시 SPEC 08.10 focus ring 적용`
- `홈 (/) — RecommendationCard alt-modes chip 키보드 포커스 시 SPEC 08.10 focus ring 적용`

두 테스트 모두 `focus()` 후 computed `outlineWidth >= 2px` 그리고
`outlineColor` 가 `rgb(0, 212, 161)` (accent-positive #00D4A1) 인지 직접 확인.

## 5. round 7 회귀 차단

본 audit 증적은 PR diff 내 영구 파일로 박혀 있으므로, 동일 지적이 재발할 경우
이 문서를 직접 인용하여 일축 가능. 다음 UI 변경 PR 에서는 동일 양식의 audit 파일을
`proc/audit/<YYYY-MM-DD>_<plan>-ui-audit-evidence.md` 로 PR 본문에 동봉.
