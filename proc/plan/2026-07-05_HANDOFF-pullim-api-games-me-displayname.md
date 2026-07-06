# 핸드오프 → pullim-api: `/games/me` 응답에 `displayName` 추가 (P-A)

**작성일**: 2026-07-05
**From**: pullim-games (FE) 세션
**To**: pullim-api 세션
**상태**: HANDOFF DRAFT — pullim-api 수용·구현·운영은 pullim-api 자체 거버넌스 따름.
**연계**: games plan `proc/plan/2026-07-03_games-unified-login-os-delegation.md §2-D P-A`. 선행: `/games/me`·CORS(dev #312) 완료, games PR-1(pullim 모드 게이트) merged(#141).

> 🎯 **범위 — `/games/me` 응답에 표시용 식별자 1건(백엔드 필드 추가).** pullim 모드에서 games 회원 UI(아바타·계정 메뉴)가 표시명을 필요로 하는데, 현행 `/games/me` 응답(`{sub, globalRole, gamesFlagLevel}`)엔 표시명이 없다. ⚠️ **현재 games 클라 구현 상태(정확)**: `AuthUser={id,email,grade}`(displayName 필드 없음)이고 UI 는 `email || "회원"` 표시 — pullim 모드 minimal 매핑에서 email="" 이라 **generic "회원"** 으로 보인다. 즉 **games 는 아직 displayName 을 소비하지 않는다**. 본 요청은 **백엔드 필드 추가(전제)** 이고, games 측 소비(`AuthUser` 에 displayName 추가 + UI 배선)는 **PR-2 후속**이다 — pullim-api 는 "displayName 추가하면 games 가 즉시 소비"로 오해하지 말 것. 증상은 UI 깨짐이 아니라 **개인화 표시명 부재(기능 저하)**. identity(표시명)는 `§5.6` 상 pullim-api 소유이므로 games 가 자체 저장 불가 → pullim-api 노출 요청(우선순위: 기능 저하 해소, 게이트·차단 이슈 아님).

## 0. 왜 이것만 요청하나 (grade 는 games-side 로 분리)
games plan §2-D P-A 는 원래 "`/games/me` 가 **grade + 표시명**"을 요구했으나, 조사 결과 **역할을 분리**한다:
- **표시명(displayName)** = **identity PII**(회원 이름/별명). `§5.6` 상 **pullim-api 소유**(games 는 회원 이름 미보관) → **pullim-api 핸드오프(본 문서).** pullim-api `auth.users.displayName` 에 이미 존재(`ProfileProjection` 조회 가능).
- **학년(grade)** = games **콘텐츠 preference**(중1~고1 학년별 노출), identity PII 아님. **pullim-api 중앙 signup 이 grade 를 수집하지 않고 auth 스키마에도 grade 가 없다.** games 는 이미 게스트에게 grade 를 자체 수집(StartForm)하므로, **회원 grade 도 games 가 자체 수집·보관**(games projection)한다 → **pullim-api 요청 아님**(games PR-2 범위, 중앙 결합 회피). ⚠️ 만약 pullim-api/운영이 grade 를 중앙에 두는 편을 선호하면 별도 협의(중앙 signup grade 수집 + /games/me 노출)로 전환 가능 — 그 경우 이 문서에 추가.

## 1. 요청: `/games/me` 응답에 `displayName` 추가

현행(`src/games/modules/me/controller/dto/games-me-response.dto.ts`):
```jsonc
{ "sub": "...", "globalRole": "user", "gamesFlagLevel": null }
```
요청(추가):
```jsonc
{
  "sub": "...",
  "globalRole": "user",
  "gamesFlagLevel": null,
  "displayName": "홍길동"   // ← 추가. auth.users.displayName (표시용 이름/별명)
}
```

- **소스**: `auth.users.displayName`(표시용 이름, PII 보호 경계상 JWT claim 미탑재 — **`ProfileProjectionInterface`(`src/common/profile/`) 조회 필요**, `VerifiedUser` claim 만으로 조립 불가). UseCase 가 claim(정적 `from`) + displayName(조회)을 합성.
- **게이트 영향 없음**: 표시명은 게이트 판정에 무관(games PR-1 게이트는 200/401 만). 응답 body 필드 추가일 뿐 — `JwtVerifyGuard` 단독·flag 무관 무료(R1) 계약 **무변경**.
- **null/미설정 처리**: `displayName` 이 없는 회원(미설정)이면 `null` 또는 빈 문자열 허용 — games 가 "회원" 폴백을 유지. 계약 위반 아님.
- **email 은 요청 안 함**: games 는 회원 email 을 보관·표시하지 않는다(§5.6 identity PII 중앙 소유). displayName 만으로 표시 충분.

## 2. games 측 후속 (핸드오프 아님 — 참고)
- `/games/me` 가 `displayName` 노출하면 games 는 `AuthUser` 매핑을 `{ id: sub, displayName, grade(게임 자체), email optional }` 로 완성(PR-2). 현재 PR-1 은 `email:""` 최소 매핑 + "회원" 폴백.
- 회원 grade 는 games 가 로그인 후 미보유 시 자체 수집해 games projection 에 저장(PR-2, 회원용 grade 수집 UX). ⚠️ 게스트 `StartForm` 은 신원 있으면 `/home` 리다이렉트 + 게스트 프로필 생성 책임이라 그대로 재사용 불가 — 재사용 여부·컴포넌트 분리는 games PR-2 설계 결정(pullim-api 무관).

## 3. 검증 (반영 후)
- `GET /games/me` 200 응답에 `displayName` 포함(회원 displayName 설정 시 값, 미설정 시 null).
- games flag 무관 계약 유지(무료 회원도 200 + displayName).
- 게이트(200/401) 동작 무변경.

## 4. 관련 파일 (pullim-api)
- `src/games/modules/me/controller/dto/games-me-response.dto.ts` (응답 DTO — displayName 추가)
- `src/games/modules/me/use-cases/get-games-me.use-case.ts` (ProfileProjection 조회 추가)
- `src/common/profile/profile-projection.interface.ts` (displayName 조회 포트)
- games-side 런북: `pullim-games` `proc/plan/2026-07-03_games-unified-login-os-delegation.md §2-D`
