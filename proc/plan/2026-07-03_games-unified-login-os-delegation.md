# 풀림 games ↔ pullim-web 통합 로그인(SSO) 위임 — 회원만 pullim-api SSO, 게스트 보존

**작성일**: 2026-07-03
**상태**: **P0 이전 — 방향 확정 초안.** 코드·spec 변경 0. 아래 §0 결정은 사용자(G1) 합의 완료(2026-07-03), 단 **선행 spec 개정(§2) 전까지 코드 착수 금지**.
**근거**: 사용자 결정 2026-07-03(게스트 유지+회원 SSO / 자체 auth legacy dormant / games DB 유지 pullim sub 키). Q 선례 `pullim-Q/proc/plan/2026-06-25_q-unified-login-os-delegation.md`.
**umbrella**: `proc/plan/2026-06-23_pullim-api-integration.md`(+ `2026-06-23_HANDOFF-pullim-api-games-module.md`). 본 plan 은 그 umbrella 의 **인증 슬라이스만** 좁혀 선실행하는 문서다 — 학습데이터 이관·games DB 폐기(umbrella P3/P4)는 본 plan 범위 밖.

## 0. 목표 · 확정 결정

### 목표
비로그인 게스트 사용은 그대로 두고, **로그인 회원만 pullim-api `.pullim.ai` 쿠키 SSO 로 신원 통일**한다. games 미인증(=게스트도 아니고 회원도 아님) 진입 시 랜딩 bounce 는 유지하되, "로그인" 선택 시 **pullim-web `/login?next=<games url>` 로 cross-서브도메인 위임**한다.

**완료 기준**: dev-games.pullim.ai 에서 "로그인" → `dev.pullim.ai/login?next=<dev-games url>` 이동 → 로그인 성공 → dev-games 복귀 + `*-pullim-at` 쿠키로 회원 인증됨. 게스트 "시작하기" 흐름은 무변경. games 는 자체 로그인/가입 UI 를 **표면에서 제거(코드는 dormant)**.

### 확정 결정 (2026-07-03, G1)
| # | 결정 | 함의 |
|---|---|---|
| D1 | **게스트 유지 + 회원만 pullim-api SSO 추가** | 게스트 신원(localStorage `pullim-games:player` + `pullim_games_guest` 쿠키) 무변경. 회원 신원만 pullim-api sub. games 는 guest-first 하이퍼캐주얼 성격 보존(`spec/05 §5.2`) |
| D2 | **games 자체 auth 는 legacy dormant** (env `NEXT_PUBLIC_DOMAIN_API_URL` 토글) | pullim 모드 on 이면 자체 `/api/auth/*`·`pullim_games_session`·자체 Supabase users/sessions 비활성(코드 보존·미사용). 롤백 안전. umbrella P4(완전 제거)는 별 PR·명시 승인 후 |
| D3 | **학습 데이터는 games 자체 Supabase 유지, 신원 키만 pullim-api sub 로** | umbrella(학습데이터 pullim-api 이관·games DB 폐기)와 **의도적 분기** — 이번 슬라이스는 DB 이관 안 함. `/api/sync` 는 회원 식별을 pullim sub 로 재배선만. games DB 존치 |

> ⚠️ D3 은 umbrella `2026-06-23_pullim-api-integration.md` §1(학습데이터 pullim-api 이관·games DB 폐기)을 **이번 범위에서 보류/역전**한다. umbrella 는 여전히 장기 방향으로 유효하나, 로그인 통합을 데이터 이관과 분리해 blast radius 를 줄인다. 두 문서 충돌 아님 — 슬라이스 순서 조정.

## 1. 현황 (조사 2026-07-03)

- **games**: 자체 standalone auth 보유(`app/api/auth/*` 이메일+비번, opaque 토큰, `pullim_games_session` **host-only** 쿠키, games 전용 Supabase `users`/`sessions`). 게스트 = localStorage+쿠키. `middleware.ts` 쿠키 presence 게이트 + `components/auth/RequireIdentity.tsx` 클라 게이트. 신원 훅 `lib/core/player/use-identity.ts`(게스트 동기 + 회원 `/api/auth/me` 비동기, 503 fail-open). OS 셸 크롬은 #138 이식 완료 — **단 SSO 미연결**(sibling 이동 시 재인증, 알려진 trade-off).
- **pullim-web(OS)**: 로그인 페이지 = **SITE 호스트**(`dev.pullim.ai`/`pullim.ai`, `/os` 밑 아님). `resolveNext` 가 `*.pullim.ai` 절대 URL 허용(PR #40, **dev 반영 / prod 미승격**) — games 는 generic 화이트리스트라 코드 변경 불필요. 로그인 세션 = pullim-api 발급 `__Secure-<env>-pullim-at`, `Domain=.pullim.ai`, HttpOnly, ES256.
- **pullim-api**(별 repo): `.pullim.ai` 쿠키 SSO·ES256 인프로세스 검증 공용. `games` entitlement flag 등재(games:1=교사제작, **플레이는 flag 무관 무료**). `/games/authz/sample`·`/games/healthz` 존재. **`/games/me`(introspection) 미구현**, **CORS 에 games origin 미등록**.

## 2. 🔴 선행 조건 (코드 착수 전 필수)

### 2-A. spec 개정 (거버넌스 — G1/G3/G4 합의) — **초안 작성 완료 (브랜치 `spec/games-sso-login-delegation`, 2026-07-04). G1/G3/G4 최종 합의·머지 대기**
중앙 로그인 위임은 `spec/05 §5.2`(games 계정 완전 독립)·`§5.6`(games 자체 가입 계약)과 충돌한다. `spec/01 §2 명세 우선` + `CLAUDE.md §9` 경로에 따라 **spec 먼저 개정 후 코드**.
- [x] `spec/05 §5.2`: 회원 신원 pullim-api 중앙 위임(pullim 모드)·게스트 games 독립·"완전 독립 계정" 조항을 데이터소유/게스트로 축소·자체 auth legacy dormant. DB 조항 존치(D3).
- [x] `spec/05 §5.6`: identity PII(이메일·비번 해시·본인인증) pullim-api 소유·가입/동의 권위 중앙 이동(games `AuthForm` pullim 모드 표면 제거). 게스트 PII 무변경.
- [x] `spec/09 §9.4`(env `NEXT_PUBLIC_DOMAIN_API_URL`·`PULLIM_LOGIN_ORIGIN` 표 + prod 승격 함정) · `§9.3`(데이터 저장 games DB 존치·키만 sub).
- [x] 영향 절 전수 sweep: `04 §4.5 RBAC`(비로그인 단일→게스트+회원 SSO 정합)·`03 §C6`·`10 로드맵`(SSO 통합 V1.x 착수 주석)·`05 §5.5`(로그인 세션 TTL pullim/legacy 분기). 잔여 stale 0(개정 이력만 "비로그인" 언급).

### 2-B. pullim-web (별 repo — 핸드오프)
- [ ] resolveNext **prod(pullim.ai) 승격**(dev→main). games 전용 코드 아님 — Q 와 공유. **games 는 dev 에선 이미 동작 가능.**

### 2-C. pullim-api (별 repo — 핸드오프 문서로 전달) — ✅ **완료 (dev #312, 2026-07-04)**
> **핸드오프 작성·전달 완료**: games 원본 `proc/plan/2026-07-03_HANDOFF-pullim-api-games-sso-login.md` → pullim-api `docs/games/2026-07-03_games-fe-cors-me-cutover-handoff.md`(docs/q 대칭 위치)에 배치. **pullim-api PR #312(커밋 ea08247) MERGED → dev**, 계약대로 구현·검증(e2e 7/7, R1 루프 회귀 고정 포함).
- [x] **CORS**: `CORS_LOCAL_ORIGINS` 에 `http://localhost:3004` 추가됨(머지). `CORS_ALLOWED_ORIGINS` dev-games/games 는 .env.example 주석에 문서화. ⚠️ **잔여 운영 스텝**: dev/prod 의 `CORS_ALLOWED_ORIGINS` 는 배포 env 시크릿(config-catalog §2, .env.example 아님) → **dev-api 배포 env 에 `https://dev-games.pullim.ai` 추가는 운영자 작업**(코드 밖). games FE dev 접속 전 이 시크릿 반영 확인 필요.
- [x] **`/games/me` 엔드포인트 신설**: `JwtVerifyGuard` **단독**(EntitlementGuard 미장착), 응답 `{ sub, globalRole, gamesFlagLevel(nullable) }`. R1 무한루프 e2e 고정(무료 회원 403 아닌 200). `src/games/modules/me/`.
- [ ] (선택) games play 인가와 teacher-author 인가 분리 정식화(별 트랙 가능)

## 3. 작업 항목 — games 레포 (FE, base=dev)

### PR-1: pullim 모드 도입 (회원 SSO 게이트)
- [ ] `lib/auth/pullim-mode.ts`(신규): `NEXT_PUBLIC_DOMAIN_API_URL` 존재 여부로 `PULLIM_MODE` 판정(Q `domain-fetch.ts` 패턴). 미설정 시 legacy(자체 auth) 유지 = D2.
- [ ] `lib/auth/pullim-session.ts`(신규): `hasValidPullimSession(cookieHeader)` — `*-pullim-at` suffix 쿠키만 화이트리스트 → `${DOMAIN_API_URL}/games/me` fetch(2.5s timeout, 200=통과, 401/5xx=fail-closed). Q `pullim-session-introspection.ts` 동형.
- [ ] `lib/auth/login-redirect.ts`(신규): `pullimLoginUrl(nextFullUrl)` = `${NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN}/login?next=<encoded 절대 URL>`. ⚠️ origin = **SITE 호스트**(dev `dev.pullim.ai`/prod `pullim.ai`), OS 호스트 아님.
- [ ] `middleware.ts` 수정: pullim 모드 한정 3-상태 게이트 — ⒜ 게스트 쿠키(`pullim_games_guest`) 있으면 통과(무변경), ⒝ `*-pullim-at` 있고 introspection 200 이면 통과, ⒞ 둘 다 없으면 랜딩(`/`). 게스트 경로 완전 보존(D1).
- [ ] `components/auth/RequireIdentity.tsx`·랜딩 CTA: "로그인" 버튼 → `window.location.assign(pullimLoginUrl(...))`(cross-origin, next router 불가). "게스트로 시작" 은 무변경.
- [ ] env: `.env.example` 에 `NEXT_PUBLIC_DOMAIN_API_URL`·`NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN` 추가(주석: 미설정=legacy 모드).

### PR-2: 회원 신원·데이터 페치 재배선
- [ ] `lib/core/player/use-identity.ts`: pullim 모드일 때 회원 판정을 `/api/auth/me`(자체) → `${DOMAIN_API_URL}/games/me`(credentials:include)로. 게스트 판정 로직 무변경. 503 fail-open 유지.
- [ ] `lib/api/domain-fetch.ts`(신규 or 어댑트): pullim 모드 = `credentials:'include'` 로 pullim-api 직접 호출, legacy = 기존 자체 라우트. Q `domain-fetch.ts` 패턴.
- [ ] `app/api/sync/route.ts`: 회원 식별을 pullim-api sub 로(introspection 결과의 sub). **games Supabase 존치**(D3) — 저장은 그대로, key 만 pullim sub. 게스트는 기존대로 localStorage only.
- [ ] 자체 로그인/가입 UI 표면 제거(dormant): `app/login`·`app/signup`·관련 컴포넌트를 pullim 모드에서 렌더 안 함(코드 삭제 아님 — D2). legacy fallback 위해 파일 보존.

### PR-3(보류): legacy auth 완전 제거 — umbrella P4
- [ ] (명시 승인 후) 자체 `app/api/auth/*`·`pullim_games_session`·games `users`/`sessions` 테이블 은퇴. **본 slice 범위 밖.**

## 4. ⚠️ 위험요소 (Q 선례 R1~R9 적응 + games 고유)

### 🔴 치명 — 리다이렉트 루프
- **R1. 인증 vs 인가 혼동 (games 고유·핵심)**: games **플레이는 entitlement flag 무관 무료**. `/games/me` 가 `EntitlementGuard('games')`(flags≥1)로 게이트되면 무료 회원이 403 → 게이트 미인증 오판 → 로그인 바운스 → 이미 로그인 → 복귀 → 또 403 → **무한 루프**. → **`/games/me` 는 인증만 검증(200/401), games flag 는 body 로만**(§2-C). Q 는 `home/free={q:1}`이라 우연히 안 터졌지만 games 는 flag 0 이 정상이라 더 위험.
- **R2. 쿠키 계약 불일치**: `*-pullim-at` suffix·`Domain=.pullim.ai` 규칙이 games·pullim-web·pullim-api 3레포 중복(SoT 없음). 누락 시 games 가 쿠키 못 읽어 영구 미인증. → 최소 본 plan §1 을 SoT 로, suffix 매칭은 `endsWith('-pullim-at')`(→`__Secure-prod-pullim-at`까지 커버).
- **R3. 게스트 쿠키 ↔ 회원 introspection 게이트 충돌 (games 고유)**: middleware 가 게스트(`pullim_games_guest`)와 회원(`*-pullim-at`) 을 **OR** 로 통과시켜야 한다. 회원 게이트를 게스트 위에 덮어쓰면(게스트인데 introspection 태우면) 게스트가 로그인 바운스 → guest-first 붕괴. 3-상태(게스트/회원/무신원) 명확 분리.

### 🟠 높음 — 환경/인프라
- **R4. Vercel Deployment Protection**: dev.pullim.ai·dev-games 전부 Vercel SSO 뒤 → cross-domain 바운스마다 SSO 벽. 인증 브라우저 관찰이 SoT(비인증 curl 검증 불가).
- **R5. CORS/credentials**: pullim-api dev CORS 에 `dev-games.pullim.ai` + Allow-Credentials 누락 시 `/games/me`·domain-fetch 전부 실패 → 미인증 오판(§2-C).
- **R6. presence 힌트 쿠키 (games 고유)**: `*-pullim-at` 이 `Domain=.pullim.ai`(공유)면 middleware 가 games host 에서 읽을 수 있으나, sibling 누수 우려. pullim-api 가 이미 `.pullim.ai` 로 심는다면 games middleware 가 직접 읽음(Q 와 동일) — 별도 presence 쿠키 불필요. **⚠️ 배포 전 실제 쿠키 Domain 확인**(host-scoped 면 games 로그인 후 자기 host presence 힌트 필요).

### 🟡 중간
- **R7. 절반 이전 = 레거시**: PR-1 만 하고 멈추면 자체 auth + pullim 모드 영구 동거. PR-2 완주 전제(D2 dormant 는 의도된 상태, 미완주는 아님).
- **R8. bfcache 뒤로가기**: 로그인 후 games→뒤로 시 캐시된 로그아웃 상태 재바운스.

## 5. 검증
- [ ] 로컬 SSO: `/etc/hosts` `*.pullim.local` + dev 등가 env 로 pullim-web/games 동시 기동 → games 로그인 CTA → pullim.local 로그인 → games 복귀+인증.
- [ ] **루프 회귀(R1)**: games flag 0(무료) 회원이 로그인 후 games 진입 시 무한 바운스 아니라 정상 플레이 진입하는지. 쿠키명/Domain 오설정 시 빠른 실패(R2).
- [ ] **게스트 회귀(R3)**: 게스트로 시작 → `/home`·`/games/*` 진입 무변경(로그인 바운스 없음). e2e 게스트 시드(`e2e/helpers/auth.ts`) 그대로 green.
- [ ] 4 viewport audit(로그인 CTA 변경 시 랜딩·`/home` — `RequireIdentity` 등 UI 변경 PR 이면 `bun run ui:audit`).
- [ ] `bun run typecheck && bun run lint && bun run build`.

## 6. PR 순서 (FE/BE 분리 · base=dev)
1. **(spec)** §2-A spec 개정 — G1/G3/G4. **최선행.**
2. **(pullim-api, 별 repo 핸드오프)** CORS games origin + `/games/me`. §2-C.
3. **(pullim-web, 별 repo)** resolveNext prod 승격(dev 는 이미 됨). §2-B.
4. games **PR-1**(pullim 모드 게이트) → 5. games **PR-2**(신원·페치 재배선).
- games PR base=`dev`([[feedback_branch_flow_dev_main]]). FE/BE 섞지 않음. main 승격은 §2-B/2-C prod 완료 후(prod 모드 불일치 방지 — Q R-prod 교훈).

## 7. 🔴 prod 승격 전 체크리스트 (Q 함정 교훈)
- [ ] prod env `NEXT_PUBLIC_DOMAIN_API_URL=https://api.pullim.ai` + `NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN=https://pullim.ai`
- [ ] pullim-api **prod** CORS 에 `games.pullim.ai` + Allow-Credentials
- [ ] pullim-web resolveNext **prod** 배포
- [ ] 위 3 없이 games dev→main 승격 금지(로그인은 되나 데이터/introspection 실패하는 모드 불일치 방지).
