# 2026-06-01 — games 랜딩 페이지 도입 plan

**작성자**: 컨트롤타워 AI (2차) — 사용자(PM/G1) 지시
**상태**: **구현 진행 — G1 토폴로지 승인 완료(2026-06-01: "arcade 완전 미러")**
**브랜치**: `feat/landing-page` (worktree `/private/tmp/pullim-games-landing`, base `origin/main` 90151e4 = auth #110 머지 포함)

---

## 0. 배경 / 문제

auth(#110) 머지로 `/login`·`/signup` + 헤더 `AuthMenu`는 들어갔지만, **진입 플로우의 집이 없다.**
현재 `/` 는 곧바로 홈 **대시보드**(게임별 성공/실패/진행 통계, `2026-05-08_home-dashboard-redesign.md`)를 렌더 →
방문 즉시 "로그인 성공 후 메인" 같은 화면이 잡혀, 신규 방문자가 무엇을 하는 곳인지·어떻게 시작/로그인하는지 플로우가 안 잡힘.

**G1 결정(2026-06-01)**: arcade(`/` = `LandingHero`, 기존 앱홈은 `/hub`)를 **완전 미러**. 단 games 제품 성격에 맞춘 자체 카피/디자인(arcade 코드 복사 금지 — 독립 레포 룰).

## 1. 목표 토폴로지

| 라우트 | 현재 | 변경 후 |
|---|---|---|
| `/` | 홈 대시보드(통계) | **랜딩 히어로(신규)**. 자동 리다이렉트 없음(2026-06-01 G1 개정) — 누구에게나 안정 노출. CTA = 회원가입(/signup)·로그인(/login)·게스트(/games) |
| `/home` | (없음) | **대시보드 이전** (기존 `/` page 내용 그대로) |
| `/games` | 게임 허브(고르기) | 변경 없음 |
| `/games/[id]` | 개별 게임 | 변경 없음 |
| `/login`·`/signup` | auth(#110) | 성공 후 `router.push("/home")` 로 변경 |

**무마찰 원칙 보존(spec/05 §5.2)**: 랜딩 CTA "바로 시작"은 **로그인 없이** `/games`(또는 `/home`)로 보냄. 게스트 즉시 플레이 유지. 로그인은 선택.

## 2. spec 영향

- `2026-05-08_home-dashboard-redesign.md` 가 "`/` = 홈 대시보드"로 전제 → **대시보드 라우트만 `/home`으로 이전**(내용·의도 불변). 본 plan에 이전 사실 기록. 권위 spec/01~10 의 PII·무마찰 원칙은 불변(랜딩은 비로그인 진입 강화이지 게이트 아님).
- 신규 spec 충돌 없음(로그인 강제 도입 아님). G1 합의 = 토폴로지 승인으로 충분.

## 3. 구현 단계

1. **대시보드 이전**: `src/app/page.tsx`(HomePage) 내용을 `src/app/home/page.tsx` 로 이동.
2. **랜딩 신설**: `src/app/_landing/LandingHero.tsx`(games 자체 카피) + `src/app/page.tsx` = `<LandingHero/>`. 로그인(`getMe`) or 게스트 기록(localStorage 활동) 있으면 `/home` `router.replace`.
3. **링크 마이그레이션**: `href="/"`(게임 내부 "홈" ~13파일·로고·not-found) + `AuthForm` `push("/")` → `/home`. 헤더 로고 `aria-label` 유지.
4. **헤더 처리**: 랜딩(`/`)에서는 앱 헤더의 대시보드용 요소가 어색하지 않도록 확인(랜딩 자체 브랜드/CTA 보유).
5. **검증**: typecheck+lint+build, 게임 테스트, ui:audit(랜딩 4뷰포트), 브라우저로 플로우(신규→랜딩, 로그인→/home 리다이렉트, 게임→홈 복귀).

## 4. 비목표

- 로그인 강제/게이트(무마찰 위반) — 안 함
- 학습데이터 서버 동기화 — 별 phase(auth plan과 동일)
- arcade 코드/카피 복사 — 패턴만 차용

## 5. 리스크

| 리스크 | 완화 |
|---|---|
| `href="/"` 누락 → 게임 후 랜딩으로 튕김 | grep 전수(~40곳) 일괄 치환 + build/테스트 |
| 랜딩 무한 리다이렉트(/home→/) | 리다이렉트는 `/`→`/home` 단방향, hydrated/auth-loaded 가드 |
| 무마찰 훼손 | 랜딩 CTA 비로그인 진입, 게이트 없음 |
| 더러운 curriculum WIP 충돌 | 별 worktree(base origin/main) |
