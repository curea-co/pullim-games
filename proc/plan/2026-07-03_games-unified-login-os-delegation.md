# 풀림 games ↔ pullim-web 통합 로그인(SSO) 위임 — 회원만 pullim-api SSO, 게스트 보존

**작성일**: 2026-07-03 (spec 개정 반영 2026-07-04)
**상태**: **선행 spec 개정 PR #140 MERGED→dev(squash 5fb0ae8, 2026-07-05).** games 코드 착수: **PR-1(pullim 모드 게이트) 구현 완료**(브랜치 `feat/pullim-mode-sso-gate`), PR-2(신원·페치 재배선) 대기. §0 제품 방향(D1/D2/D3)은 G1 발의(2026-07-03).
**근거**: 사용자 결정 2026-07-03 — 게스트 유지+회원 SSO / 자체 auth legacy dormant / games DB 유지(회원 식별만 pullim-api sub, 저장 키 `users.id` 유지·`sub`=매핑 컬럼). 설계 정당성은 games 권위 spec `proc/spec/05 §5.2`·`§5.6`·`§9.3`·`§9.4` + games↔pullim-api 계약으로 자립한다(타 풀림 프로젝트를 근거로 들지 않음 — `CLAUDE.md §4` 독립 프로젝트 원칙).
**umbrella**: `proc/plan/2026-06-23_pullim-api-integration.md`(+ `2026-06-23_HANDOFF-pullim-api-games-module.md`). 본 plan 은 그 umbrella 의 **인증 슬라이스만** 좁혀 선실행하는 문서다 — 학습데이터 이관·games DB 폐기(umbrella P3/P4)는 본 plan 범위 밖.

## 0. 목표 · 확정 결정

### 목표
비로그인 게스트 사용은 그대로 두고, **로그인 회원만 pullim-api `.pullim.ai` 쿠키 SSO 로 신원 통일**한다. games 미인증(=게스트도 아니고 회원도 아님) 진입 시 랜딩 bounce 는 유지하되, "로그인" 선택 시 **pullim-web `/login?next=<games url>` 로 cross-서브도메인 위임**한다.

**완료 기준**: dev-games.pullim.ai 에서 ⑴ "로그인" → `dev.pullim.ai/login?next=<dev-games url>` → 로그인 성공 → dev-games 복귀 + `*-pullim-at` 쿠키로 회원 인증됨, **⑵ "회원가입" → `dev.pullim.ai/signup?next=<dev-games url>` → 가입 성공 → dev-games 복귀 + 인증됨**(신규 회원 온보딩 대칭). 게스트 "시작하기" 흐름은 무변경. games 는 자체 로그인/가입 UI 를 **표면에서 제거(코드는 dormant)**.

### 확정 결정 (2026-07-03, G1)
| # | 결정 | 함의 |
|---|---|---|
| D1 | **게스트 유지 + 회원만 pullim-api SSO 추가** | 게스트 신원(localStorage `pullim-games:player` + `pullim_games_guest` 쿠키) 무변경. 회원 신원만 pullim-api sub. games 는 guest-first 하이퍼캐주얼 성격 보존(`spec/05 §5.2`) |
| D2 | **games 자체 auth 는 legacy dormant** (env 토글 — 두 env all-or-nothing §9.4) | pullim 모드 on 이면 자체 `/api/auth/*`·`pullim_games_session`·자체 Postgres users/sessions 비활성(코드 보존·미사용). 롤백 안전. umbrella P4(완전 제거)는 별 PR·명시 승인 후 |
| D3 | **학습 데이터는 games 전용 Postgres 존치, 회원 식별만 pullim-api sub 로(저장 키 `users.id` 유지)** | umbrella(학습데이터 pullim-api 이관·games DB 폐기)와 **의도적 분기** — 이번 슬라이스는 DB 이관 안 함. `/api/sync` 는 회원 식별 입력을 sub 로 바꾸되 `sub→users.id` resolve 후 `user_id` FK 로 동작(저장 키 무변경). games DB 존치(Postgres — Supabase 는 배포 provider 일 뿐, 계약 SoT 는 Postgres) |

> ⚠️ D3 은 umbrella `2026-06-23_pullim-api-integration.md` §1(학습데이터 pullim-api 이관·games DB 폐기)을 **이번 범위에서 보류/역전**한다. umbrella 는 여전히 장기 방향으로 유효하나, 로그인 통합을 데이터 이관과 분리해 blast radius 를 줄인다. 두 문서 충돌 아님 — 슬라이스 순서 조정.

## 1. 현황 (조사 2026-07-03)

- **games**: 자체 standalone auth 보유(`app/api/auth/*` 이메일+비번, opaque 토큰, `pullim_games_session` **host-only** 쿠키, games 전용 Postgres `users`/`sessions`). 게스트 = localStorage+쿠키. `middleware.ts` 쿠키 presence 게이트 + `components/auth/RequireIdentity.tsx` 클라 게이트. 신원 훅 `lib/core/player/use-identity.ts`(게스트 동기 + 회원 `/api/auth/me` 비동기, 503 fail-open). OS 셸 크롬은 #138 이식 완료 — **단 SSO 미연결**(sibling 이동 시 재인증, 알려진 trade-off).
- **pullim-web(OS)**: 로그인 페이지 = **SITE 호스트**(`dev.pullim.ai`/`pullim.ai`, `/os` 밑 아님). `resolveNext` 가 `*.pullim.ai` 절대 URL 허용(PR #40, **dev 반영 / prod 미승격**) — games 는 generic 화이트리스트라 코드 변경 불필요. 로그인 세션 = pullim-api 발급 `__Secure-<env>-pullim-at`, `Domain=.pullim.ai`, HttpOnly, ES256.
- **pullim-api**(별 repo): `.pullim.ai` 쿠키 SSO·ES256 인프로세스 검증 공용. `games` entitlement flag 등재(games:1=교사제작, **플레이는 flag 무관 무료**). `/games/authz/sample`·`/games/healthz` 존재. **`/games/me`(introspection) 미구현**, **CORS 에 games origin 미등록**.

## 2. 🔴 선행 조건 (코드 착수 전 필수)

### 2-A. spec 개정 (거버넌스 — G1/G3/G4 합의) — ✅ **MERGED→dev (PR #140 squash 5fb0ae8, 2026-07-05). Codex 19라운드 반영 후 사용자 승인 머지.**
중앙 로그인 위임은 `spec/05 §5.2`(games 계정 완전 독립)·`§5.6`(games 자체 가입 계약)과 충돌한다. `spec/01 §2 명세 우선` + `CLAUDE.md §9` 경로에 따라 **spec 먼저 개정 후 코드**.
- [x] `spec/05 §5.2`: 회원 신원 pullim-api 중앙 위임(pullim 모드)·게스트 games 독립·"완전 독립 계정" 조항을 데이터소유/게스트로 축소·자체 auth legacy dormant. DB 조항 존치(D3).
- [x] `spec/05 §5.6`: identity PII(이메일·비번 해시·본인인증) pullim-api 소유·가입/동의 권위 중앙 이동(games `AuthForm` pullim 모드 표면 제거). 게스트 PII 무변경.
- [x] `spec/09 §9.4`(env `NEXT_PUBLIC_DOMAIN_API_URL`·`NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN` 표 all-or-nothing + prod 승격 함정) · `§9.3`(데이터 저장 games DB 존치·저장 키 `users.id` 유지·`sub`=매핑 컬럼).
- [x] 영향 절 전수 sweep: `04 §4.5 RBAC`(비로그인 단일→게스트+회원 SSO)·`03 §C6`·`10 로드맵`(SSO 통합 V1.x 주석)·`03 §M8`(익명 fingerprint 단독→입구 신원 게스트/회원 SSO)·`05 §5.5`(로그인 세션 TTL pullim/legacy 분기)·`05 §5.2 V2 확장`("풀림 SSO 통합" 재정의)·`01 §5`(구 "PII 0개·비로그인" → §5.6 위임)·`05 §5.7`(V2 결제 "V1 비로그인"→"비결제, 계정 선택적")·`09 §9.8`(모니터링 "V1 비로그인 PII 0"→이벤트 로그 PII 0). 잔여 "비로그인": 개정 이력의 역사 서술 + `09 §9.2.2` 라이브러리 trade-off 논의(현재 상태 단정 아님)뿐.

### 2-B. pullim-web (별 repo — 핸드오프)
- [ ] resolveNext **prod(pullim.ai) 승격**(dev→main). `*.pullim.ai` generic 화이트리스트라 games 전용 코드 아님. **games 는 dev 에선 이미 동작 가능.**

### 2-C. pullim-api (별 repo — 핸드오프 문서로 전달) — ✅ **완료 (dev #312, 2026-07-04)**
> **핸드오프 작성·전달 완료**: games 원본 `proc/plan/2026-07-03_HANDOFF-pullim-api-games-sso-login.md` → pullim-api `docs/games/2026-07-03_games-fe-cors-me-cutover-handoff.md`(docs/q 대칭 위치)에 배치. **pullim-api PR #312(커밋 ea08247) MERGED → dev**, 계약대로 구현·검증(e2e 7/7, R1 루프 회귀 고정 포함).
- [x] **CORS**: `CORS_LOCAL_ORIGINS` 에 `http://localhost:3004` 추가됨(머지). `CORS_ALLOWED_ORIGINS` dev-games/games 는 .env.example 주석에 문서화. ⚠️ **잔여 운영 스텝**: dev/prod 의 `CORS_ALLOWED_ORIGINS` 는 배포 env 시크릿(config-catalog §2, .env.example 아님) → **dev-api 배포 env 에 `https://dev-games.pullim.ai` 추가는 운영자 작업**(코드 밖). games FE dev 접속 전 이 시크릿 반영 확인 필요.
- [x] **`/games/me` 엔드포인트 신설**: `JwtVerifyGuard` **단독**(EntitlementGuard 미장착), 응답 `{ sub, globalRole, gamesFlagLevel(nullable) }`. R1 무한루프 e2e 고정(무료 회원 403 아닌 200). `src/games/modules/me/`.
- [ ] (선택) games play 인가와 teacher-author 인가 분리 정식화(별 트랙 가능)

### 2-D. 🔴 pullim 모드 **활성화(env on) hard preconditions** (Codex #140 — 승격 ≠ 활성화)
> spec 은 pullim 모드 **설계를 V1.x 정책으로 채택**하지만, 아래 3 계약이 닫히기 전에는 **env 를 켜서 활성화하지 않는다**(설계 승격과 런타임 활성화 분리). 미충족 상태 활성화 금지.
- **P-A. 클라 auth 메타데이터 계약 (PR-2 blocker)** — 조사(2026-07-05) 후 **역할 분리**:
  - [ ] **표시명(displayName) = pullim-api 핸드오프**: 회원 UI(`OsTopbar`·`AuthMenu`)가 표시명 필요. identity PII 라 `§5.6` 상 pullim-api 소유(games 미보관) → `/games/me` 에 `displayName` 추가 요청. **핸드오프 작성·전달**: `proc/plan/2026-07-05_HANDOFF-pullim-api-games-me-displayname.md` → pullim-api. pullim-api `auth.users.displayName` 기존재(ProfileProjection 조회) — **pullim-api PR #330 dev 반영**. (PR-1 은 임시 "회원" 폴백 중.)
  - [ ] **학년(grade) = games-side**: grade 는 콘텐츠 preference(identity 아님)이고 pullim-api 중앙 signup 이 grade 를 미수집·auth 스키마에 grade 부재라, **games 가 회원 grade 를 자체 수집·games projection 보관**(PR-2, pullim-api 요청 아님 — 중앙 결합 회피). 회원 로그인 후 grade 미보유 시 수집 UX — ⚠️ **게스트 `StartForm` 재사용 불가**(게스트 온보딩 전용: 신원 있으면 `/home` 리다이렉트 + `createPlayer` 게스트 생성) → 별도 회원용 grade 수집 컴포넌트/모드 신설이 PR-2 설계 선결(아래 PR-2 항목).
  - 클라 `AuthUser` 를 pullim 형태(`id=sub`, `displayName`[pullim-api], `grade`[games], `email` optional)로 완성 = PR-2.
- [ ] **P-B. legacy 회원 재연결 vs first-writer-wins (기존 회원 cutover)**: `fingerprint_links` first-writer-wins(`§5.2`) 때문에 기존 legacy 회원이 SSO 로그인해도 **같은 브라우저 fingerprint·데이터가 옛 `users` row 에 남아 새 `sub` projection 에 연결 안 됨**. → 재연결 마이그레이션(P-C 데이터 존재 시)이 닫히기 전엔 **기존 games email 회원이 있는 환경에서 pullim 모드 활성화 금지**(신규 환경·게스트 위주는 안전). 자동 병합은 여전히 금지.
- [ ] **P-C. 중앙 삭제 파기 전파 (법적 — 회원 서버데이터 저장 시)**: **중앙 계정 삭제 → games projection 삭제 전파 계약**(webhook/job, `§5.6`)이 회원 서버데이터 저장 시점부터 **법적 파기 선행 필수**. ⚠️ **정정(Codex #143)**: "서버 회원 데이터 0 이라 sync GA 까지 유예 가능"은 **grade games-side 저장(P-A ⑵)으로 무효** — grade 를 games projection(sub 귀속)에 저장하는 순간 서버 회원 데이터가 존재한다. 따라서 **파기 전파 precondition 은 sync GA 가 아니라 grade 저장을 포함한 pullim 모드 활성화 시점으로 당겨진다**(회원 projection row 가 서버에 생기는 최초 시점). grade·학습데이터 모두 sub projection row 에 귀속되므로 그 row 삭제 전파 계약 하나로 커버되나, **계약 미확정 상태로 회원 서버 저장(grade 포함) 활성화 금지**.

## 3. 작업 항목 — games 레포 (FE, base=dev)

> ⚠️ **게이트 2층 계약 (R9 — 장애 허용 보존, Codex #140)**: **미들웨어 = coarse(쿠키 presence 만, 네트워크 호출 없음)**, **클라 `RequireIdentity` = 정밀(introspection + fail-open)**. 미들웨어에서 `/games/me` 를 때려 `5xx=fail-closed` 로 닫으면 pullim-api 일시 장애만으로 로그인 회원이 `/home`·`/games/*` 에서 전부 랜딩으로 튕겨 기존 503 fail-open 계약이 깨진다. 따라서 **introspection 은 미들웨어가 아니라 클라에서** 수행하고, 5xx/네트워크는 fail-open(기존 신원 유지)한다. 이는 현행 아키텍처(미들웨어 coarse + `RequireIdentity` 정밀)와 정합.

### PR-1: pullim 모드 도입 (회원 SSO 게이트) — ✅ **구현 완료 (브랜치 `feat/pullim-mode-sso-gate`, 2026-07-05)**
- [x] `lib/auth/pullim-mode.ts`(신규): 두 env 모두일 때만 `PULLIM_MODE` on, 한쪽만=모듈 로드 시 throw(fail-fast), 둘 다 미설정=legacy=D2. 유닛 테스트(`pullim-mode.test.ts` 6케이스 — 토글·fail-fast·URL).
- [x] `lib/auth/login-redirect.ts`(신규): `pullimLoginUrl`/`pullimSignupUrl`(대칭, SITE 호스트 origin)·`gotoPullimAuth`(현재 URL 을 next 로 하드 내비)·`pullimAuthHref`(SSR/no-JS 폴백).
- [x] `middleware.ts` 수정(coarse only, 네트워크 X): pullim 모드=`*-pullim-at` suffix presence, legacy=`pullim_games_session` presence, 게스트=`pullim_games_guest`. 게스트 OR 회원 통과(D1 보존). introspection 미호출(R9).
- [x] **진입점 전수 전환**: 공유 `components/auth/AuthCta.tsx` 신설(단일 진입점) — legacy=로컬 Link, pullim=pullim-web 하드 내비. 적용: `LandingHero`·`OsTopbar`(topbar CTA+아바타 메뉴)·`AuthMenu`·`StartForm`·`AuthForm`. 잔여 로컬 `/login·/signup` 링크 0(grep 확인). className 보존→시각 무변경(legacy 기본, 랜딩 4-viewport audit critical=0).
- [x] env: `.env.example` 에 두 env + all-or-nothing·활성화 precondition 주석.
> ⚠️ **PR-1 = pullim 모드 게이트 end-to-end**(Codex #141 반영으로 2단 게이트 완결): 미들웨어 coarse(`*-pullim-at` presence) + **클라 정밀 introspection**(`getAuthState`→`/games/me`, gate 목적 최소 신원 id=sub, tri-state 200/401/5xx·네트워크=fail-open R9) + 진입점 전수(AuthCta) + **페이지 dormant 가드**(`app/login|signup/page.tsx` → `AuthRouteGuard` pullim 리다이렉트). **profile(표시명 매핑[pullim-api `/games/me` displayName]·grade 수집[games-side])·데이터(sync·projection)는 PR-2.** pullim 모드 **활성화(env on)는 §2-D P-A/B/C 선행 필수** — 본 PR 머지 후에도 env 미설정이라 legacy 기본(런타임 무변경).

### PR-2: 회원 profile·데이터 페치 재배선 (게이트는 PR-1 완결)
- [ ] `lib/auth/client.ts` `AuthUser` 매핑(P-A): pullim `getPullimAuthState` 가 현재 id=sub·email=""·grade=null 최소 매핑 → **`/games/me` 의 `displayName`(pullim-api #330)** 소비로 회원 UI 표시명 연결. **grade 는 pullim-api 아님 — games 가 자체 수집(아래)**. `AuthUser`(id=sub, displayName, grade[games], email optional)로 완성.
- [x] **회원 grade games-side 수집(P-A ⑵)** — **서버토대 PR #146 + 모달 UX PR #147(진행)**: 서버(`pullim-member.ts` projection upsert·get/setGrade, `/api/pullim/grade` GET·POST) + **홈 진입 모달**(`GradePrompt.tsx` — pullim 회원 + grade 미보유(GET 200+null) + **`MEMBER_DATA_STORAGE_ENABLED`(서버 플래그, API 로 게이트)** 시 노출. ⚠️ 노출 게이트는 이 **서버 플래그**이지 sessionStorage 가 아니다 — sessionStorage 는 "다음에" dismiss **지속용일 뿐**(사용자별 key), 차단 환경(웹뷰·프라이버시)에선 **모듈 메모리 폴백**으로 이 세션만 유지. storage 차단 시에도 모달은 노출(grade 수집을 조용히 건너뛰지 않음 — 저장하면 서버 grade 로 재노출 안 됨), 다음 세션/refresh 재노출). 별도 회원용 컴포넌트(StartForm 재사용 불가 — 게스트 온보딩 전용). ⚠️ grade 서버 저장은 `MEMBER_DATA_STORAGE_ENABLED`(P-B·P-C 확정 후 켬)로 게이트 — dormant.
- [ ] `lib/api/domain-fetch.ts`(신규 or 어댑트): pullim 모드 = `credentials:'include'` 로 pullim-api 직접 호출, legacy = 기존 자체 라우트.
- [ ] **`users` projection 스키마 마이그레이션 (선행 — Codex #140)**: 현행 `users`(`migrations/0001_init.sql`)는 `email TEXT NOT NULL UNIQUE`·`password_hash TEXT NOT NULL` 이라 **pullim 모드 회원 row(email/pw 미보유)를 upsert 할 수 없다**. 더미 이메일/해시 삽입은 `§5.6` PII 분리 계약 위반. → **결정: nullable 전환 + `sub` 컬럼 신설**(신규 마이그레이션). ⒜ `email`·`password_hash` **NULL 허용**(legacy row 만 채움), ⒝ `sub TEXT UNIQUE`(nullable — pullim projection row 는 `sub` 만, legacy row 는 NULL), ⒞ 학습데이터 FK 는 `users(id)` 유지(projection row 의 `id` 에 걸림), ⒟ CHECK 제약으로 "row 는 (email+password_hash) XOR sub" 보장(혼선 차단). auth 전용 테이블 분리·projection 전용 테이블 신설은 대안으로 검토했으나 FK 재배선 blast radius 커서 nullable+sub 최소 변경 채택.
- [ ] `app/api/sync/route.ts` + projection upsert (**키 모델: 저장/조인 키=`users.id` 무변경, `sub`=매핑 컬럼**): 첫 `/games/me` 성공 시 `sub` 로 `users` projection lazy upsert(위 마이그레이션 전제) → 이후 sync·조회는 **`sub → users.id` resolve 후 `user_id` 로 동작**(FK 무변경). `users.id=sub` 통일 안 함(legacy id 타입 혼용 방지). **games Postgres 존치**(D3). 게스트는 기존대로 localStorage only. (`spec/09 §9.3`)
- [ ] `auth_sessions`·`fingerprint_links`: pullim 모드에서 `auth_sessions`(games 자체 세션)는 미사용(세션은 pullim-api `.pullim.ai` 쿠키) — dormant. `fingerprint_links` 는 projection row 의 `user_id` 에 귀속. legacy 모드에서만 `auth_sessions` 유효.
- [ ] **기존 legacy 회원 재연결 규칙 (Codex #140 — cutover 필수 명시)**: 현행 `/games/me` 는 `sub` 만 주고 email·기존 games `user_id` 를 주지 않으므로, 첫 SSO 로그인 시 **새 projection row 가 생기면 기존 legacy `users` row(email 계정)에 매달린 `fingerprint_links`·서버 학습데이터가 새 계정에서 도달 불가**가 된다. → **규칙**: ⒜ **silent auto-merge 금지**(`§5.2` 익명→계정 흡수 = 사용자 확인 후만 원칙과 동일 — 잘못된 병합/명의오염 방지), ⒝ 첫 SSO 로그인은 `sub` 신규 projection 생성(기존 legacy row 와 무관), ⒞ **legacy(email) 계정 ↔ sub 재연결은 pre-GA 마이그레이션 TODO** — pullim-api 가 재연결 근거(예: `/games/me` 에 email 노출 or 별도 identity link)를 제공해야 성립(후속 핸드오프). **interim 안전성**: 현재 클라 sync 미연결이라 회원 서버 학습데이터가 아직 없어 표면 데이터 손실 0 — 단 **클라 sync GA 전 재연결 규칙 확정 필수**(안 하면 cutover 시 기존 회원 데이터 단절). `spec/05 §5.6` 마이그레이션 항목 연동.
- [x] 자체 로그인/가입 UI 표면 제거(dormant) — **PR-1 완료**: `AuthRouteGuard` 가 pullim 모드에서 `app/login|signup/page.tsx` 를 pullim-web 로 리다이렉트(렌더 null). 코드 삭제 아님(legacy fallback 파일 보존 — D2).
- [ ] **(후속 — 별 트랙) 중앙 계정 삭제 전파 계약**: pullim-api 중앙 계정 삭제 → games projection 삭제(webhook/job) → CASCADE 파기. 법적 파기 보장 위해 필수지만 **본 slice(로그인) 범위 밖** — pullim-api 후속 핸드오프로 확정(`spec/05 §5.6` 파기 계약 TODO). 미확정 동안 "중앙 삭제 시 games 자동 파기" 보장 표기 금지.

### PR-3(보류): legacy auth 완전 제거 — umbrella P4
- [ ] (명시 승인 후) 자체 `app/api/auth/*`·`pullim_games_session`·games `users`/`sessions` 테이블 은퇴. **본 slice 범위 밖.**

## 4. ⚠️ 위험요소 (games 신원 모델 고유)

### 🔴 치명 — 리다이렉트 루프
- **R1. 인증 vs 인가 혼동 (games 고유·핵심)**: games **플레이는 entitlement flag 무관 무료**(`spec/05 §5.2`·§4.5 RBAC). `/games/me` 가 `EntitlementGuard('games')`(flags≥1)로 게이트되면 무료 회원(정상적으로 `flags.games=null`)이 403 → 게이트 미인증 오판 → 로그인 바운스 → 이미 로그인 → 복귀 → 또 403 → **무한 루프**. → **`/games/me` 는 인증만 검증(200/401), games flag 는 body 로만**(§2-C, pullim-api 계약). games 는 flag 없음이 정상 플레이 상태라 이 게이트 오설정이 곧 전 무료 회원 차단이 된다.
- **R2. 쿠키 계약 불일치**: `*-pullim-at` suffix·`Domain=.pullim.ai` 규칙이 games·pullim-web·pullim-api 3레포 중복(SoT 없음). 누락 시 games 가 쿠키 못 읽어 영구 미인증. → 최소 본 plan §1 을 SoT 로, suffix 매칭은 `endsWith('-pullim-at')`(→`__Secure-prod-pullim-at`까지 커버).
- **R3. 게스트 쿠키 ↔ 회원 introspection 게이트 충돌 (games 고유)**: middleware 가 게스트(`pullim_games_guest`)와 회원(`*-pullim-at`) 을 **OR** 로 통과시켜야 한다. 회원 게이트를 게스트 위에 덮어쓰면(게스트인데 introspection 태우면) 게스트가 로그인 바운스 → guest-first 붕괴. 3-상태(게스트/회원/무신원) 명확 분리.

### 🟠 높음 — 환경/인프라
- **R4. Vercel Deployment Protection**: dev.pullim.ai·dev-games 전부 Vercel SSO 뒤 → cross-domain 바운스마다 SSO 벽. 인증 브라우저 관찰이 SoT(비인증 curl 검증 불가).
- **R5. CORS/credentials**: pullim-api dev CORS 에 `dev-games.pullim.ai` + Allow-Credentials 누락 시 `/games/me`·domain-fetch 전부 실패 → 미인증 오판(§2-C).
- **R6. presence 힌트 쿠키 (games 고유)**: `*-pullim-at` 이 `Domain=.pullim.ai`(공유)면 middleware 가 games host 에서 서버측으로 읽을 수 있으나, sibling 누수 우려. pullim-api 가 이미 `.pullim.ai` 로 심으므로(§1 pullim-api 계약) games middleware 가 request 쿠키로 직접 읽음 — 별도 presence 쿠키 불필요. **⚠️ 배포 전 실제 쿠키 Domain 확인**(host-scoped 면 games 로그인 후 자기 host presence 힌트 필요).

### 🟠 높음 — 장애 허용
- **R9. 미들웨어 fail-closed → 503 fail-open 계약 파괴 (Codex #140)**: 미들웨어가 introspection(`/games/me`)을 때려 `5xx=fail-closed` 로 닫으면 pullim-api 일시 장애만으로 로그인 회원이 보호 라우트에서 전부 랜딩으로 튕긴다(기존 `use-identity` 503 fail-open 계약 붕괴). → **미들웨어 coarse(쿠키 presence)만·네트워크 호출 금지, introspection+fail-open 은 클라 `RequireIdentity`**(PR-1/PR-2 게이트 2층 계약). tri-state: 200=회원 / 401=미인증 / 5xx·네트워크=fail-open.

### 🟡 중간
- **R7. 절반 이전 = 레거시**: PR-1 만 하고 멈추면 자체 auth + pullim 모드 영구 동거. PR-2 완주 전제(D2 dormant 는 의도된 상태, 미완주는 아님).
- **R8. bfcache 뒤로가기**: 로그인 후 games→뒤로 시 캐시된 로그아웃 상태 재바운스.

## 5. 검증
- [ ] 로컬 SSO(host 통일 — `*.pullim.local`, `spec/09 §9.4`): `/etc/hosts` 에 `games.pullim.local`·`api.pullim.local`·`pullim.local` 등록 → games 를 `games.pullim.local:3004` 로 기동(bare `localhost` 혼용 금지 — Chrome eTLD 로 쿠키 SSO 불가) → **로그인·가입 둘 다**: games "로그인"/"회원가입" CTA → `pullim.local` `/login`·`/signup` → games 복귀+인증. (pullim-api `CORS_LOCAL_ORIGINS` 에 `games.pullim.local:3004` 추가 필요.)
- [ ] **루프 회귀(R1)**: games flag 0(무료) 회원이 로그인 후 games 진입 시 무한 바운스 아니라 정상 플레이 진입하는지. 쿠키명/Domain 오설정 시 빠른 실패(R2).
- [ ] **게스트 회귀(R3)**: 게스트로 시작 → `/home`·`/games/*` 진입 무변경(로그인 바운스 없음). e2e 게스트 시드(`e2e/helpers/auth.ts`) 그대로 green.
- [ ] 4 viewport audit(로그인 CTA 변경 시 랜딩·`/home` — `RequireIdentity` 등 UI 변경 PR 이면 `bun run ui:audit`).
- [ ] `bun run typecheck && bun run lint && bun run build`.

## 6. PR 순서 (FE/BE 분리 · base=dev) — 진행 현황
1. ✅ **(spec)** §2-A spec 개정 — **PR #140 MERGED→dev (5fb0ae8)**. **최선행.**
2. ✅ **(pullim-api, 별 repo 핸드오프)** CORS games origin + `/games/me` — **dev #312 완료**. §2-C.
3. 🟡 **(pullim-web, 별 repo)** resolveNext prod 승격(dev 는 이미 됨). §2-B.
4. ✅ games **PR-1**(pullim 모드 게이트) 구현 완료 → 5. ⬜ games **PR-2**(신원·페치 재배선).
- games PR base=`dev`([[feedback_branch_flow_dev_main]]). FE/BE 섞지 않음. main 승격은 §2-B/2-C prod 완료 후(prod 모드 불일치 방지 — §7).

## 7. 🔴 prod 승격 전 체크리스트 (교차 repo 준비 — games env 반쪽은 fail-fast 가 차단)
> games 두 env 는 all-or-nothing fail-fast(§9.4)라 "로그인만 되고 데이터 깨짐" 반쪽 설정은 부팅에서 걸린다. 남는 함정은 **games env 완전 설정인데 다른 repo prod 미준비** — 아래 3종을 함께 확인.
- [ ] prod env **둘 다** `NEXT_PUBLIC_DOMAIN_API_URL=https://api.pullim.ai` + `NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN=https://pullim.ai`(한쪽만이면 부팅 fail-fast — 배포 실패로 조기 발견)
- [ ] pullim-api **prod** CORS 에 `games.pullim.ai` + Allow-Credentials (미등록 시 introspection/직접호출 실패)
- [ ] pullim-web resolveNext **prod** 배포 (미배포 시 로그인/가입 후 games 복귀 실패)
- [ ] 위 3 없이 games dev→main 승격 금지(games env 완전 설정 + 타 repo prod 미준비 = 런타임 introspection/복귀 실패 방지).
