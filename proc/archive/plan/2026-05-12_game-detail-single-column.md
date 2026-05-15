# 2026-05-12 — 게임 세부 화면 1열 + CTA viewport-in

- **상태**: ✅ COMPLETE (retroactive 2026-05-13) — 코드 §2 ①~⑥·⑧ 완료, e2e 94/94 green. ⑦ 사용자 dev 검증은 별 트랙
- **상태**: 확정 (2026-05-12) — 결정점 D1=B / D2=A / D3=B 채택
- **트리거**: 사용자 피드백 — "양쪽으로 배치시키니까 별로네, 그냥 1열로 구성해주되 버튼을 스크롤 다운해서 접근하지 않아도 되도록"
- **스코프**: `GameShell` variant 정책 단순화 + 모든 게임의 CTA 가 항상 viewport 안에 있도록 보장
- **비스코프**: 메커닉 board 자체의 viewport 적응 (각 게임 component 가 자체 책임)

## 0. 현 상태

| 영역 | 동작 | 근거 |
|---|---|---|
| `AppShell` game mode | `h-screen → flex-1 overflow-y-auto` 안에 GameShell 렌더 | [app-shell.tsx:50-55](src/components/shell/app-shell.tsx#L50-L55) |
| `GameShell` `split + aside` 지정 | lg+ 좌우 분할 (3fr 2fr, max-w 960) | [GameShell.tsx:66-92](src/components/game-shell/GameShell.tsx#L66-L92) |
| `GameShell` `split + aside` 미지정 | lg+ 단일 컬럼 max-w 640 (PR #18 F3 fix) | [GameShell.tsx:96-115](src/components/game-shell/GameShell.tsx#L96-L115) |
| `GameShell` `stack` | 항상 세로 max-w 480 | factorization 만 사용 |
| `GameShell` `match` | 세로 max-w 480 / lg+ 720 | english-word-match 만 사용 |
| CTA 위치 | `<footer className="mt-6">` — content 다음에 자연 배치 | content 가 길면 스크롤 다운 필요 |

**좌우 분할 사용 게임**: `chemistry-balance` 한 곳만 (PR #16 aside slot pilot). 나머지 5개 split 게임은 이미 lg+ 단일 컬럼 폴백 상태. 사용자가 본 "양쪽 배치" 는 chemistry-balance 일 가능성 큼.

**CTA 스크롤 다운 케이스**: content 가 viewport 보다 길어지면 (예: `history-timeline` 의 7~10 카드, board 가 lg 미만에서 세로로 늘어남) CTA 가 viewport 아래로 밀려 스크롤 필요.

---

## 1. 합의 필요한 결정점

### D1 — split + aside 정책 (양쪽 분할 폐기 범위)

| 옵션 | 동작 | 코드 영향 | 향후 영향 |
|---|---|---|---|
| **A** | chemistry-balance 의 aside prop 만 제거. `aside` prop 자체 + split 분할 로직 유지 | 1줄 (게임 component) | 향후 다시 좌우 분할 쓰고 싶을 때 코드 재활용 가능 |
| **B (추천)** | `aside` prop 자체 GameShell 에서 제거. split + aside 분할 블록 통째 삭제. variant 는 split/stack/match 유지 | GameShell 약 30줄 삭제 + chemistry-balance aside 제거 | 좌우 분할 정책 완전 폐기. game-shell-right-area.md plan archive |
| **C** | variant 시스템 통째 폐기 — stack/match 도 통합해서 단일 레이아웃 | GameShell 대폭 단순화 (~60줄→20줄) | factorization 세로 드래그, english-word-match 매칭 board 가 max-w 통일 영향 받음. 회귀 위험 |

**추천 B** — 사용자 의도는 좌우 분할 자체 별로. aside 시스템 폐기가 깔끔. stack/match 는 메커닉 차이(세로 드래그/매칭 board)라 보존해도 사용자 피드백과 충돌 없음.

### D2 — CTA viewport-in 보장 방식

| 옵션 | 동작 | 장점 | 단점 |
|---|---|---|---|
| **A (추천)** | GameShell 내부 자체 스크롤. content section `flex-1 min-h-0 overflow-y-auto`, footer 자연 높이. AppShell game mode 의 `overflow-y-auto` → `overflow-hidden` | content 길이 무관 항상 CTA viewport 안. 어느 게임이든 동작 | 게임 component 가 height fit 안 되는 경우 내부 스크롤 발생 |
| **B** | CTA `sticky bottom-0` + content 자연 흐름. AppShell overflow 유지 | 코드 변경 최소 (CTA wrapper 만 sticky) | sticky 의 배경 처리 필요, content 마지막 부분이 CTA 뒤에 가려질 수 있음 |
| **C** | 각 게임 content 가 viewport 안 fit 한다 가정 (현재 stack/match 정책) | 코드 변경 없음 | history-timeline 등 긴 content 게임 CTA 밀림 — 사용자 요구 미충족 |

**추천 A** — 가장 robust. CTA viewport-in 이 게임 content 길이와 무관하게 보장됨.

### D3 — 1열 max-width

| 옵션 | lg+ max-w | 모바일 max-w | 사용 사례 |
|---|---|---|---|
| **A** | 480 | 480 | 현재 stack 동일. 모바일/PC 동일 너비 (좁음) |
| **B (추천)** | 640 | 480 | 현재 split 폴백 lg+ 동일. 학습 집중도 + board 호환성 균형 |
| **C** | 720 | 480 | 현재 match lg+ 동일. 너비 여유 있지만 시선 분산 가능 |

**추천 B** — PR #18 F3 fix 로 이미 1열 폴백 게임들이 640 으로 동작 중. 통일.

---

## 2. 작업 항목 (추천안 B/A/B 채택 가정)

- [x] **①** `src/components/game-shell/GameShell.tsx` 단순화 — aside/splitRatio prop 제거, 1열 통일, content section 자체 스크롤
- [x] **②** `src/components/shell/app-shell.tsx` game mode `<div>` overflow-y-auto → overflow-hidden
- [x] **③** `src/games/chemistry-balance/component.tsx` aside prop 사용처 제거 (content 안으로 흡수)
- [x] **④** `proc/plan/2026-05-11_game-shell-right-area.md` → `proc/archive/plan/` 이동
- [x] **⑤** GameShell 주석 갱신 — 이번 plan 참조, CTA viewport-in 정책 명기
- [x] **⑥** typecheck pass (`bun run typecheck`)
- [ ] **⑦** 로컬 `bun dev` 검증 — §3 (사용자)
- [x] **⑧** e2e `bun run test:e2e` **94/94 passed (24.1s)** — chemistry-balance @ desktop strict 포함 모든 strict viewport 의 CTA viewport-in 정책 유지

---

## 3. 검증 흐름 (`bun dev` 기반)

```bash
bun dev   # port 3033
```

1. **chemistry-balance** (변화 폭 최대): `/games/chemistry-balance` 진입 → lg+ 에서 좌우 분할 사라지고 1열. CTA `정답 확인` 버튼이 항상 viewport 안.
2. **history-timeline** (긴 content): 카드 7개가 board 에 늘어선 상태. content 영역 스크롤 가능 + CTA 항상 viewport 안.
3. **physics-vector / english-order / math-graph-shift** (이미 lg+ 1열 폴백): 회귀 없음.
4. **factorization** (stack): 세로 드래그 게임 — 회귀 없음.
5. **english-word-match** (match): 좌우 매칭 board — 회귀 없음.
6. **viewport**: lg (1280×800) + 모바일 (375×667) 둘 다 확인. 모바일에서도 CTA 항상 보임.
7. **회귀 마지막 점검**: `/`, `/games` 허브, `/manage/*` — 변경 외부 영역 회귀 없음.

---

## 4. PR 분할 — 한 PR

- 한 PR 안에 GameShell 단순화 + AppShell game mode overflow + chemistry-balance aside 제거 + plan archive 묶음
- e2e 결과 + bun dev 스크린샷(또는 텍스트 검증) PR 본문 포함

브랜치명 예: `feat/game-detail-single-column`

---

## 5. 합의 후 진행

DRAFT 의 결정점 3개 (D1, D2, D3) 채택안 알려주시면 즉시 코드 작업. 추천안 (B/A/B) 그대로면 "추천대로 진행" 한 줄로 OK.
