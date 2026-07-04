# 핸드오프 → pullim-api: games SSO 로그인 연동 (CORS + `/games/me` 2건)

**작성일**: 2026-07-03
**From**: pullim-games (FE) 세션
**To**: pullim-api 세션
**상태**: ✅ **DELIVERED — pullim-api 반영 완료 (dev PR #312, 2026-07-04)**. 아래 §1·§2 계약대로 구현·검증(e2e 7/7, R1 루프 회귀 고정 포함). 본 문서는 요청 기록으로 보존. games 측 코드 착수는 선행 spec 개정(§0, PR #140) 머지 후.
**연계**: games plan `proc/plan/2026-07-03_games-unified-login-os-delegation.md`. 본 계약은 games 요구사항 + games↔pullim-api 계약만으로 자립한다(타 풀림 프로젝트를 근거로 들지 않음 — `CLAUDE.md §4`).

> 🎯 **범위 — 로그인 SSO 슬라이스만.** pullim-games 회원을 pullim-api `.pullim.ai` 쿠키 SSO 로 인증하기 위해 **pullim-api 에 필요한 것은 딱 2건**: ⑴ CORS allowlist 에 games origin 추가, ⑵ **`GET /games/me` introspection 엔드포인트 신설**. 학습데이터 이관·games DB 폐기·회원 계정 마이그레이션은 **본 핸드오프 범위 밖**(별 트랙 = umbrella `2026-06-23_HANDOFF-pullim-api-games-module.md`). games 는 이번엔 학습데이터를 **자기 Postgres(games 전용 DB) 에 계속 저장**하고 회원 식별만 pullim-api `sub` 로 바꾼다(저장/조인 키는 games `users.id` 유지, `sub`=로컬 `users` projection 매핑 컬럼) — 그래서 pullim-api 학습데이터 API 는 요청하지 않는다.

## 0. 선행 조건 (games 측, pullim-api 무관)
games 회원 신원의 중앙 위임은 games 권위 spec `proc/spec/05 §5.2`(계정 완전 독립)·`§5.6`(자체 가입)과 충돌하므로 games 가 먼저 spec 개정(G1/G3/G4)한다. **pullim-api 는 이 spec 개정과 무관하게 아래 §1·§2 를 검토·수용할 수 있다**(CORS·introspection 은 games spec 에 의존하지 않는 인프라 계약). 단 games FE 착수는 spec 개정 후.

---

## 1. 요청 ①: CORS allowlist 에 games origin 추가 (핵심 — 이거면 FE 가 붙는다)

games FE(`games.pullim.ai`/`dev-games.pullim.ai`)가 pullim-api `/games/me` 를 `credentials:'include'` 로 직접 호출한다. **origin 이 allowlist 에 없으면 `Access-Control-Allow-Origin` 미echo → 브라우저 차단**(credentials 요청은 정확 origin echo 필수).

- **dev-api 배포 env `CORS_ALLOWED_ORIGINS` 에 `https://dev-games.pullim.ai` 추가**
  - `isValidPullimOrigin`(`src/common/config/env.ts`) dev env 제약 = `dev-*.pullim.ai` 라벨만 → `dev-games` ✓ 통과.
- **prod cutover 시(미래): prod-api `CORS_ALLOWED_ORIGINS` 에 `https://games.pullim.ai`**
  - prod env 제약 = 비 `dev-` 라벨 → `games` ✓.
- **로컬**: `CORS_LOCAL_ORIGINS` 에 `http://localhost:3004`(games 기본 dev 포트, `spec/09 §9.1`). ⚠️ dev env allowlist 는 `dev-*` 라벨만 허용하므로 로컬 games 는 **원격 dev-api 호출 불가**, **로컬 pullim-api(env=local)** 를 쓴다. **⚠️ 로컬 SSO(쿠키 redirect) 검증 모드**는 bare `localhost` 로는 불가(Chrome eTLD) → games 를 `games.pullim.local:3004` 로 띄우고 `CORS_LOCAL_ORIGINS` 에 `http://games.pullim.local:3004` 도 추가 필요(`spec/09 §9.4` 로컬 host 통일).

값 SoT·절차는 pullim-api config-catalog §2 / ADR-010 관할. `credentials:true`·preflight 헤더는 pullim-api 기설정. games 는 CORS 1줄이면 dev 에서 붙는다.

### 쿠키 — 변경 불필요 (도메인 정렬로 이미 해결)
- `dev-games.pullim.ai` 와 `dev-api.pullim.ai` 는 동일 등록가능도메인 `pullim.ai` → **same-site**. 세션 쿠키 `sameSite:'lax'`(`src/auth/modules/session/service/session-config.ts`) 로 전송 OK. 별도 변경 없음.
- 세션 access 쿠키 = `__Secure-<env>-pullim-at`(dev `__Secure-dev-pullim-at` / local `local-pullim-at`), **`Domain=.pullim.ai`, HttpOnly, ES256**. games **Edge middleware 가 서버에서 request 쿠키로 읽어**(HttpOnly 는 JS 만 차단, 서버 read 가능) coarse 게이트에 `endsWith('-pullim-at')` suffix 로 필터·판정. **presence 힌트 쿠키 불필요**(Domain=.pullim.ai 라 games host 에서 이미 읽힘).

---

## 2. 요청 ②: `GET /games/me` introspection 엔드포인트 신설

games **클라 `RequireIdentity`(정밀 게이트)** 가 회원 세션 검증에 쓸 introspection. ⚠️ **games Edge middleware 는 이걸 호출하지 않는다**(미들웨어 = coarse 쿠키 presence 만; introspection 을 미들웨어에서 때리면 5xx→fail-closed 로 로그인 회원이 튕기는 회귀 = games 측 R9). 즉 `/games/me` 는 **클라이언트 정밀 게이트 전용** — pullim-api 는 엣지/서버 호출을 전제하지 말 것(장애 시 클라가 fail-open 처리). pullim-api 내부 구현은 기존 me 표면 구조 참고 가능하나 **가드가 다르다**(아래 🔴, pullim-api 관할).

### 🔴 결정적 제약 — `EntitlementGuard('games')` 를 게이트로 쓰면 안 됨 (무한루프)
- **games 플레이는 entitlement flag 무관 무료다.** games entitlement flag(`flags.games`)는 **교사 제작(teacher_author)** 전용 — home/free 회원은 `flags.games = null`(정상).
- 기존 `GET /games/authz/sample` 은 `EntitlementGuard('games', { action: 'read' })`(=`flags.games >= 1` 강제) → **무료 회원은 여기서 403**. 이 게이트를 introspection 으로 재사용하면:
  > 무료 회원 로그인 → games 진입 → `/games/me` 403 → games 게이트가 "미인증" 오판 → pullim-web 로그인 바운스 → 이미 로그인됨 → resolveNext 로 games 복귀 → 또 403 → **무한 루프**.
- **games 는 flag 0(null)이 정상 플레이 상태**(`spec/05 §5.2`·§4.5 RBAC — 플레이 무료)라, entitlement 게이트를 붙이면 전 무료 회원이 차단된다. 반드시 인증만 검증.

### 계약 (요청)
```
GET /games/me
Guards: JwtVerifyGuard  ONLY   ← EntitlementGuard('games') 붙이지 말 것
```
- **인증만 검증**: 유효 세션 = **200**, 미인증·무효·만료 토큰 = **401**(`JwtVerifyGuard`). games flag 유무로 403 내지 않음.
- **응답 body**(AuthzSampleResponseDto 와 유사한 보수적 최소 노출):
  ```jsonc
  {
    "sub": "usr_...",              // pullim-api 외부 신원 — games 는 sub→로컬 users.id resolve 후 학습데이터 FK(user_id)로 동작(sub 를 저장 키로 직접 쓰지 않음)
    "globalRole": "user",          // admin|user|guest
    "gamesFlagLevel": null | 1     // flags.games ?? null (null=플레이 무료회원, 1=교사제작 권한). 게이트 아님, 표시/분기용
  }
  ```
- PII·전체 flags 맵·토큰 원문 비노출(authz-sample DoD 가드레일 동일).
- games 가 pullim-api 에 요구하는 신규 인증 메커니즘 **없음** — 기존 `JwtVerifyGuard`·쿠키 세션 재사용.

> 대안: 신규 `/games/me` 대신 **기존 `/auth/me`(있다면) 재사용 가능 여부 회신**해 주면 games 는 그걸 쓴다. 요건은 "games flag 무관 200/401"뿐. pullim-api 판단.

---

## 3. games 측이 처리 (핸드오프 아님 — 참고)
- **게스트(비로그인) 완전 보존**: games 미들웨어가 `pullim_games_guest`(non-HttpOnly 힌트, PII 없음) 존재만으로 보호 라우트 통과. pullim-api 신규 작업 **0**. 회원 introspection 은 게스트 게이트 **옆에 추가**될 뿐.
- **학습데이터**: games 전용 Postgres 에 그대로 저장(`/api/sync`), key 만 `sub` 로 재배선. pullim-api 학습데이터 API **요청 안 함**(umbrella 별 트랙).
- 로그인 리다이렉트 타깃(`{SITE}/login?next=`)·게이트·CSRF 1차 가드 — games.
- 익명→회원 데이터 병합은 **명시적 사용자 확인 후만**(공유 기기 명의오염 방지, `spec/05 §5.2`) — games FE 책임.

## 4. 검증 (컷오버 후)
- `https://dev-games.pullim.ai` 에서 로그인 → Network: `GET https://dev-api.pullim.ai/games/me` **200 + `Access-Control-Allow-Origin: https://dev-games.pullim.ai`**, 세션 쿠키 실림 → games 진입.
- 🔴 **루프 회귀(핵심)**: **games flag 없는(무료) 회원**으로 `/games/me` 가 **403 아닌 200**인지 확인 — 이게 R1 게이트. (pullim-api 시드로 games flag 미지정 계정을 만들어 검증 — 방식은 pullim-api 관할.)
- 게스트: 로그인 안 한 게스트가 games 보호 라우트에 여전히 진입되는지(회원 게이트가 게스트를 막지 않음).

## 5. 관련 파일 (pullim-api)
- `src/bootstrap.ts`(enableCors) · `src/common/config/cors.ts`(allowlist) · `src/common/config/env.ts`(`isValidPullimOrigin` dev=`dev-*`)
- `src/games/games.module.ts` + `src/games/modules/authz-sample/`(games 서비스 표면 — 단 `/games/me` 는 EntitlementGuard 제외)
- `src/common/verify/guard/{jwt-verify.guard,entitlement.guard}.ts`
- (pullim-api 내부에 유사 me 표면이 있으면 구현 참고 — pullim-api 관할)
- `src/auth/modules/session/service/session-config.ts`(쿠키 — 변경 불필요)
- games-side 런북: `pullim-games` `proc/plan/2026-07-03_games-unified-login-os-delegation.md`
