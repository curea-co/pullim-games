# 관리(manage) 영역 비활성화 — 되돌리기 쉬운 단일 플래그

- 날짜: 2026-07-02
- 브랜치: `feat/disable-manage` (base=dev)
- 상태: 구현·검증 완료 (미커밋 — 사용자 확인 후 commit·PR)

## 배경 / 결정

`/manage`(콘텐츠 저작: 과목·교육과정·카드·내 게임·결제)는 현재 학습자에게 실질적 가치를 주지 못한다는 판단(사용자 지시, 2026-07-02). **삭제가 아니라 되돌리기 쉬운 "비활성화"**로 전면 차단한다. 사용자 선택 = "전체 차단하되 비활성화 처리".

- 권위 문서(`proc/spec/01~10`)는 **수정하지 않는다** — 이건 제품 게이팅(product gating) 결정이지 명세 변경이 아니다. manage 의 가치가 확립되면 플래그 한 줄로 원복.
- 되돌리기: `apps/games/lib/features.ts` 의 `MANAGE_ENABLED` 를 `true` 로 — 그러면 네비·라우트·CTA·e2e 전부 자동 복원.

## 단일 SoT 플래그

`apps/games/lib/features.ts`

```ts
export const MANAGE_ENABLED: boolean = false;
```

`: boolean` 명시 이유 — 리터럴 `false` 로 좁혀지면 리다이렉트 이후 코드가 "unreachable" 로 판정돼 `no-unreachable` lint 가 터진다. 명시로 회피.

## 작업 항목

1. `apps/games/lib/features.ts` — `MANAGE_ENABLED` 신규 (single SoT).
2. `components/shell/nav-config.ts` — 글로벌 4메뉴 중 '관리' 를 플래그 off 시 제외.
3. `app/manage/layout.tsx` — 플래그 off 시 `redirect("/home")`. layout 이 `/manage/*` 전 하위를 감싸므로 한 곳에서 전체 차단.
4. 딥링크 CTA dead-end 제거:
   - `components/game-hub/CustomGamesSection.tsx` — 빈 상태 전체 CTA → 섹션 자체 미표시(null), 채워진 상태 → 하단 "카드 더 만들기" CTA 제거(기존 카드 플레이는 유지).
   - `games/custom-{blank,multiple-choice,typing,word-match}/component.tsx` — 빈 상태 `emptyMessage.cta`(→/manage/content) 를 플래그 off 시 드롭. `cta?` 는 4 메커니즘 모두 optional 이라 안전.
5. e2e 3종 플래그 기반 skip (재활성화 시 자동 복원):
   - `e2e/custom-games-cta.spec.ts`, `e2e/manage-billing.spec.ts`, `e2e/manage-content-curriculum.spec.ts`

## 검증 결과 (2026-07-02)

- `bun run typecheck` ✅ pass, `bun run lint` ✅ pass
- `bun run test` ✅ 497 tests / 51 files pass
- 기능 스모크(dev :3005): `/manage`·`/manage/billing`·`/manage/content` 모두 **307 → /home** (렌더 차단), `/games` 렌더 HTML 에 `href="/manage"` **0건**(관리 네비 제거), 나머지 3 네비(/home·/games·/about) 정상.
- `ui:audit /games` (open route — shell nav + CustomGamesSection 표면 모두 커버):
  - **baseline(origin/dev): critical 70 → 본 변경: critical 66** (−4, **신규 overflow 0**).
  - 66건은 전부 **관 안 건드린 official 게임 카드의 세로 below-fold**(right 는 viewport 내, bottom>vh 만 트리거) — 21게임 그리드의 자연 스크롤에서 audit 스크립트가 세로 오버플로우로 분류하는 **선행(pre-existing) 아티팩트**. 본 변경은 전부 subtractive(네비 항목 제거·null 반환·CTA 제거)라 overflow 를 추가할 수 없고, 실제로 감소시킴. 절대-0 게이트는 본 PR 범위 밖(선행 조건).
  - 보호 라우트(/home·custom 게임 빈 상태)는 guest 쿠키 시드 필요 — 변경이 순수 subtractive 라 세로 overflow 단조 비증가로 판정, 별도 캡처 생략.
- e2e 는 PR delta 만 평가(인프라 선행 red 알려짐) — manage 3 spec 은 `MANAGE_ENABLED` 기반 skip 로 green.

## Codex Review 대응 (PR #139)

- **R1 (CustomGamesSection dead-end)**: 채워진 상태에서 0장 메커닉 타일이 여전히 `/games/custom-*` 로 링크 → manage off + 빈 상태 CTA 제거 상태에서 클릭 시 빈 화면 dead-end. **fix**: `MANAGE_ENABLED=false` 시 grid 를 `cardCountOf(id) > 0` 로 필터해 0장 타일 미노출. 활성 시엔 기존대로 전부 노출.
- **R2 (e2e 검증 공백)**: skip 만 하고 비활성 정책 검증이 없음. **fix**: `e2e/manage-disabled.spec.ts` 신규 — (a) 카드 0장 시 섹션·CTA 미노출, (b) 일부만 채움 시 0장 메커닉 타일 미노출(dead-end 회귀 가드), (c) `/manage/*` → `/home` 리다이렉트. 기존 `custom-games-cta.spec.ts` 는 활성 상태 스위트로 역할 명시(대칭).

## 되돌리는 법

`MANAGE_ENABLED = true` 한 줄. 그 외 코드는 모두 플래그 분기라 원복이 자동.
