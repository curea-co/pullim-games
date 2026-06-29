# pullim-games → pullim-api 통합 (인증·학습데이터 위임, games=FE+게이팅 proxy)

**작성일**: 2026-06-23
**작성자**: 사용자(G1) 결정 + claude
**상태**: **P0 이전 — 방향 제안 초안.** 코드·spec 변경 0. 본 plan + 핸드오프는 **P0(설계 확정) 합의를 위한 입력 초안**이지 P0 종료물이 아니다 — P0 종료 = 양 repo 합의 + pullim-api 측 plan/ADR(§6 표). 진행 순서: **선행 spec(영향 절 전수 — `spec/05 §5.2`·`§5.6`·`spec/09 §9.3` 등 묶음 개정, §5.2 단독 아님) → P0 설계 합의 → P1+**. spec 미개정·P0 미합의 상태에서 본 plan 을 확정으로 취급하지 않는다.
**근거**: 사용자(G1) 방향 제시 (2026-06-23) — 현황 분석(`proc/research` / 본 plan §1) 후.

> ⚠️ **spec 우선 원칙(spec/01 §2 · CLAUDE.md §9)**: 본 plan 의 방향은 **권위 spec 개정 전제의 제안**이다. `proc/spec/05 §5.2` 는 현재 games 계정이 타 서비스와 **완전 독립**(계정 학습데이터도 games 전용 Postgres)이라고 못 박고 있다 — 아래 §1 방향(중앙 인증·데이터 위임)은 이 전제를 뒤집는다. **⚠️ 선행 spec 개정은 §5.2 하나로 한정되지 않는다**(한정하면 spec 이 부분 정합 상태로 남아 후속 구현이 충돌한다): 같은 위임으로 영향받는 권위 절 전부를 **한 묶음으로 sweep·개정**해야 한다 — 최소 ⒜ `spec/05 §5.2`(독립 계정·games 전용 DB), ⒝ `spec/05 §5.6`(계정 가입 계약 — 가입·본인인증 권위가 중앙으로 이동), ⒞ `spec/09 §9.3`(데이터 저장 전략 — games 전용 Postgres 정책·`DATABASE_URL`·게임 DB 런타임 폐기; **SoT 는 §9.1 핵심 스택이 아니라 §9.3**), 그리고 §5 내 계정/데이터 소유 관련 잔여 조항. **이 영향 절 전수 점검 자체가 선행 spec phase 의 첫 작업**이며, G1/G3/G4 합의로 개정한 뒤에야 P1+ 코드 착수 가능. spec 미개정 상태에서 본 plan 을 확정 결정으로 취급하지 않는다.

> 🎯 **문서 범위 — 고수준 방향+요구만**: 본 plan 은 방향·범위·단계(phase)를 잡는다. **세부 구현 계약은 단독 명세하지 않는다** — CORS, 동기화 동시성(LWW/커서), 세션 audience 격리, 게스트 게이트 등은 **통합 실제 착수(P0 설계) 시 pullim-api 와 공동 확정**(핸드오프 문서 상단 [P0 설계 TODO] 참조). 미착수 통합의 세부를 지금 단정하면 stale·불일치 위험이므로 합의 출발점만 둔다.

## 1. 방향 제안 (G1, 2026-06-23 — 선행 spec 묶음 개정: spec/05 §5.2·§5.6·spec/09 §9.3)

| # | 제안 |
|---|---|
| 1 | **인증 → pullim-api 중앙 인증으로 위임** (games 자체 email+pw 인증 폐기) |
| 2 | **학습 데이터 → pullim-api `games` 모듈로 이전** (srs/streak/activity/custom) |
| 3 | **pullim-games = FE + 얇은 라우트-게이팅 proxy** (데이터·인증 로직 미보유 — 인증/데이터 프록시 아님) |
| 4 | (1~3 도출) **games 자체 Postgres 불필요** — `DATABASE_URL`·migrations·db client 제거 대상 |

> 위 1~4 는 **선행 spec 묶음 개정 후 확정**. 선행 spec phase = `05 §5.2`(독립 계정·games 전용 DB)·`05 §5.6`(가입 계약 권위 중앙 이동)·`09 §9.3`(데이터 저장 전략·DB 런타임 폐기) + §5 잔여 계정/데이터 조항을 "중앙 인증 위임·학습데이터 pullim-api 소유"로 **일괄** 개정 — §5.2 단독 개정은 부분 정합이라 금지.

## 2. 목표 아키텍처

**same-site `.pullim.ai` 컨슈머 패턴 채택** (games.pullim.ai ↔ api.pullim.ai = 동일 부모도메인 `.pullim.ai`):

```
브라우저 (games.pullim.ai)
   │  ① /auth/*·/games/* 직접 호출 (credentials:include, same-site .pullim.ai 쿠키)
   │  ② 보호 라우트 진입은 games 얇은 proxy/middleware 가 게이팅(쿠키 introspection)
   ▼ (①은 pullim-api 로, ②는 games proxy 통과 후 렌더)
pullim-api (api.pullim.ai) ── 중앙 인증(/auth/*) + games 모듈(/games/* 학습데이터) + DB
```

- **pullim-api** 소유: 인증(발급/검증/세션·CSRF), 학습데이터(srs·streak·activity·custom), DB.
- **pullim-games** 소유: FE(21게임·UI) + **얇은 proxy**(라우트 게이팅·introspection — 쿠키 1차 필터 후 pullim-api introspection, 풀 요청 프록시 아님). **DB·인증로직·학습로직 미보유.** FE 는 pullim-api 를 `NEXT_PUBLIC_API_BASE_URL` 로 직접 호출.
- **⚠️ 계정 product-격리 + 환경 격리 [계약 필요]**: `.pullim.ai` 공유 쿠키는 **전송 편의일 뿐 cross-product 세션/계정 통합이 아니다.** ⒜ **product**: spec/05 §5.2 가 `games`·`games-arcade` 완전 독립 계정을 요구 → games 전용 **세션 namespace/audience 격리**(토큰 audience=`games` 등)로 sibling 서비스의 세션 재사용(묵시적 계정 통합) 차단. ⒝ **환경**: dev/prod 쿠키·세션 스코프 분리(`dev-games↔dev-api`/`games↔api`)로 환경 간 누수 차단. 선행 spec 개정에도 이 격리 규칙 유지.

(행동 계약은 본 문서 안에서 독립적으로 서술한다 — 타 풀림 프로젝트의 코드·파일 경로 참조 금지(CLAUDE.md §4). same-site 쿠키 SSO·introspection 게이트는 부모도메인 `.pullim.ai` 공유라는 **계약**이지 특정 레포 파일이 근거가 아니다.)

## 3. pullim-games 변경

### 제거 (pullim-api 로 이관)
- `apps/games/lib/server/auth/{password,users,session}` (인증 비즈니스 로직) — pullim-api login/session 으로 대체. ⚠️ **기존 games 회원 계정(`users` 테이블) 마이그레이션은 [P0 설계 TODO]**(핸드오프 참조) — 폐기 전 중앙 identity 로 이관/통합 계약(이메일 충돌·재인증·학습데이터 귀속) 선확정.
- `apps/games/lib/server/learning/*` (srs·streak·activity·custom·sync-csrf) — pullim-api games 모듈로 이전
- `apps/games/lib/server/db/client.ts`, `apps/games/migrations/0001_init.sql`·`0002_learning_data.sql` — games DB 폐기
- `DATABASE_URL` env (Vercel·`.env.example`)
- `apps/games/app/api/auth/{login,signup,logout,me,csrf}` · `apps/games/app/api/sync*` (games 자체 인증/학습 라우트) — **제거.** 아래 정본 경로(직접 호출)로 대체. ⚠️ `me` 제거 시 클라 정밀 체크(`lib/auth/client.ts` `getMe`/`getAuthState`·`RequireIdentity`)를 `api.pullim.ai/auth/me` 로 재배선, `csrf`·`sync/csrf` 제거 시 발급처를 api 로 이전(§5.2·P0⑨) — 라우트만 지우면 게이트·sync 깨짐.
- DB 의존 단위/라우트 테스트

### 정본 경로 — **브라우저 직접 호출 (단일 경로 고정)**
> 인증·학습데이터 요청은 **하나의 경로만** 둔다(이원화 금지 — CSRF·쿠키 스코프·오류 처리 기준 단일화). FE 가 pullim-api 를 **직접 호출**하는 것이 정본이고, games proxy 는 **인증/데이터 프록시가 아니다.**
- **직접 호출(정본)**: 브라우저가 `api.pullim.ai/auth/*`(인증)·`api.pullim.ai/games/*`(학습데이터)를 `credentials:include` 로 직접 호출. CSRF·세션 쿠키 발급/검증은 **pullim-api 가 단독 소유**. games 에 `apps/games/app/api/auth/*`·`apps/games/app/api/sync*` 미보유.
- **games proxy 의 역할 = 보호 라우트 진입 게이팅뿐**: 미들웨어가 쿠키 1차 필터 후 pullim-api introspection 으로 신원 확인해 라우트 통과/차단만 한다(요청 프록시 아님).
- `apps/games/lib/server/http/{csrf,same-origin}` — 게이팅 미들웨어의 보조 가드로만 필요 최소 유지.
- FE 전부 유지.

### 보류 (G1, 2026-06-23 — 이번 범위 밖)
- `apps/games/app/api/billing/notify*` + `apps/games/lib/server/billing/*` (Resend) — **보류.** 결제 통합은 본 통합 범위 밖(별 트랙) — games 측 결제 관련 라우트/로직은 이번에 손대지 않는다. (pullim-api 의 결제 도메인 보유·운영 여부는 외부 repo 사실이라 본 문서에 고정하지 않음.)
- `apps/games/app/api/event` — **보류** (billing 과 함께 추후 판단).

## 4. pullim-api 변경 (별 repo — **핸드오프 문서로 전달**)

> 사용자(G1) 결정: pullim-api 측은 claude 가 직접 코딩하지 않고 **핸드오프 문서**로 넘긴다 → **[`2026-06-23_HANDOFF-pullim-api-games-module.md`](./2026-06-23_HANDOFF-pullim-api-games-module.md)**. pullim-api 측 수용·진행은 **해당 repo 자체 거버넌스에 따른다**(구체 운영 방식은 pullim-api 관할 — 본 문서에 고정하지 않음).

- pullim-api **`games` 모듈**(논리 단위 — 구체 위치·구조는 pullim-api repo 관할)에 **학습데이터 엔드포인트** 신설:
  - srs state sync(upsert/조회), streak, activity log(+retention cleanup), custom content
  - 중앙 인증 authz 게이트 적용
- 데이터 모델: games 의 `srs_states`·`streaks`·`activity_log`·`custom_content` 스키마를 pullim-api 데이터 모델로 이식
- 인증: games 는 **전용 신규 인증 메커니즘을 요구하지 않는다** — 중앙 인증 재사용을 요청(중앙이 제공하는 인증 수단의 존재·형태는 pullim-api 회신 사안, 본 문서에 단정 X)

## 5. 설계 — **same-site `.pullim.ai` 컨슈머 계약** (신규 설계 최소)

1. **세션·쿠키**: same-site `.pullim.ai` 쿠키 SSO + CSRF — **발급·검증은 pullim-api 가 단독 소유**. games 는 `NEXT_PUBLIC_API_BASE_URL`(**로컬**=`http://localhost:<api>`·games dev `localhost:3004` / **dev**=`dev-api.pullim.ai` / **prod**=`api.pullim.ai`)로 pullim-api `/auth/*` 직접 호출(`credentials:include`). **games 로컬 세션 저장·검증 없음** (중앙 위임). ⚠️ **로컬**: 쿠키는 포트 무시·host 기준이라 `localhost:3004`↔`localhost:<api>`는 같은 host 로 **쿠키 공유됨**(별도 인증 스킴 불필요). 단 origin 은 포트 포함이라 cross-origin → CORS allowlist 에 `http://localhost:3004` + 쿠키 `Secure` off(http) + `SameSite=Lax` 필요(핸드오프 §A). (이 계약의 정당성은 games spec/contract + pullim-api 계약으로만 선다 — 타 풀림 프로젝트를 근거로 들지 않는다.)
2. **얇은 proxy**: 보호 라우트 진입 게이팅만(풀 요청 프록시 아님). **회원 게이트만 본 통합 대상** — 회원: 세션 쿠키 → pullim-api introspection. ⚠️ 회원 게이트는 **2단**(coarse 미들웨어 쿠키필터 + 정밀 클라 `/auth/me`): ⒜ coarse 는 `games.pullim.ai`-readable 신호 전제(api host-scoped 쿠키면 못 읽음 → **games 가 로그인 후 자기 host 에 presence 힌트 쿠키 직접 set**, api 는 sibling set 불가). ⒝ 정밀 — games `/api/auth/me` 제거 시 클라 체크가 **`api.pullim.ai/auth/me`(credentials:include)** 로 재배선(만료/위조 판정 권위). ⒞ presence 쿠키 lifecycle: 로그인 set / **로그아웃 clear** / 만료는 정밀 체크가 stale 처리(TTL ≤ 세션). sync CSRF 토큰 발급처도 games `/api/sync/csrf` 제거 시 api 가 대체 제공(P0⑨, 없으면 sync POST 403). (상세 P0⑧·핸드오프 §A) **게스트 흐름은 범위 밖**: games 기존 입구 게이트(**서버 Edge coarse gate** — 미들웨어가 `pullim_games_guest` 힌트 쿠키[non-HttpOnly, PII 없음]·`pullim_games_session` 존재만 판정, 신원 데이터는 localStorage·서버 전송 0; spec/05 §5.2/§5.6) 동작 그대로 보존하고, 회원 introspection 을 그 **옆에 추가**하는 것뿐이다. 게스트 게이트를 재설계하거나 게스트 신원을 서버로 옮기지 않는다(게스트 모델 변경 = 별도 spec/05 개정 사안, 본 통합 아님). CSRF/same-origin 보조 가드는 필요 최소만.
3. **데이터 마이그레이션 [확인 TODO]**: 운영 `DATABASE_URL` 미설정처럼 보이나 **prod 데이터 0 은 단정 금지** — 실제 운영 DB 상태를 먼저 확인한다. spec/05 §5.2 가 계정 학습데이터 games Postgres 영속을 권위 정책으로 유지하므로, 데이터 부재 확인 후에만 클린 컷오버; 데이터가 있으면 마이그레이션 계획.
4. **확인 필요·P0 설계 TODO**: ① games authz scope, ② `/games/me` introspection vs `/auth/me` 재사용, ③ 게스트 흐름 vs dev KCB 강제, ④ **CORS allowlist/헤더 계약**(직접 호출 전제), ⑤ **동기화 동시성 — 현 semantics 보존**(현행 games 는 ⓐ srs/streak/custom 커서 = `learning_sync_seq` **전역 단조 시퀀스**[`updated_at` 컬럼이지만 벽시계 ms 아님 — 동일 ms 누락 방지]. **단 activity 는 예외 — 전량 집계라 증분 커서를 안 쓰고 `serverTime(now)` 스냅샷 커서**, ⓑ 클라 recency 신호 `last_review_at`/`exportedAt` + streak/activity GREATEST 단조 머지, ⓒ POST cursor 미반환으로 해소 → pullim-api 는 다중 인스턴스에서 단일 전역 시퀀스로 이 불변식 보존, 인스턴스 시계 대체 금지), ⑥ **계정 product+환경 격리**(audience·dev/prod 스코프 — 단 "완전 독립 계정"[spec/05 §5.2]이 세션 audience 격리만으로 충족되는지 단정 X. 계정 레코드 분리 필요 여부 = 중앙 identity 단위 계약으로 결정), ⑦ **기존 회원 계정 마이그레이션**(중앙 identity 이관·이메일 충돌·재인증), ⑧ **쿠키 Domain 스코프 — 공유↔격리 긴장 + 미들웨어 게이트 충돌**(자동 공유 X. `Domain=.pullim.ai` 로 넓히면 sibling `planner/q` 누수 = 격리 붕괴. 반대로 host-scoped to `api.pullim.ai` 면 games 미들웨어가 `games.pullim.ai` 에서 세션 존재를 못 읽어 회원 진입 불가 → presence 힌트 쿠키 동반 필수. **⚠️ presence 쿠키는 api 가 못 심는다**(브라우저 규칙상 응답 origin 은 sibling host 전용 쿠키 set 불가) → **games 가 로그인 성공 후 자기 host 에 직접 set**(게스트 쿠키와 동형). 쿠키 스코프·set 주체·미들웨어 게이트 함께 확정), ⑨ **CSRF cross-subdomain + 발급처 대체**(double-submit 이 games↔api 직접호출에서 성립하는 토큰 모델 + 현행 games `/api/sync/csrf` 발급처가 사라지므로 `api.pullim.ai` 가 sync CSRF 토큰 발급·검증 제공 — 없으면 sync POST 항상 403) — 모두 착수 시 pullim-api 공동 확정(**핸드오프 [P0 설계 TODO]·§A** 참조). 본 plan 은 방향만, 세부는 단독 명세 X.

## 6. Phase 분할 (안전·점진)

| Phase | 내용 | 산출 | 상태 |
|---|---|---|---|
| **선행 spec** | 영향 절 **전수 sweep + 묶음 개정**(독립 계정·games 전용 DB → 중앙 위임): `05 §5.2`·`05 §5.6`(가입 권위)·`09 §9.3`(데이터 저장 전략·DB 런타임) + §5 잔여 조항 — §5.2 단독 금지. G1/G3/G4 합의 | 개정된 spec/05·09 | 미착수 |
| **P0** | 설계 확정 — pullim-api 인증 계약·games authz·데이터 모델 합의 (양 repo) | 본 plan 합의 + pullim-api 측 plan/ADR | **진행 전(본 plan+핸드오프 = 입력 초안)** |
| **P1** | pullim-api: games 모듈 학습데이터 엔드포인트 + authz (pullim-api repo) | API 배포(dev) | 미착수 |
| **P2** | games: 인증 직접 호출 전환 — FE 가 `api.pullim.ai/auth/*` 직접 호출(같은 도메인 쿠키), games `/api/auth/*` 제거 + 라우트 게이팅 미들웨어 | games 로그인 동작(중앙 인증) | 미착수 |
| **P3** | games: 학습데이터 직접 호출 전환 — FE 가 `api.pullim.ai/games/*` 직접 호출, games `/api/sync*` 제거 | 학습 동기화 동작 | 미착수 |
| **P4** | games: 자체 BE 제거 — auth/learning 로직·db·migrations·`DATABASE_URL` 폐기 | games = FE+게이팅 proxy only | 미착수 |
| ~~P5~~ | billing/event — **보류** (별 트랙, 결제 통합 시) | — | 보류 |

## 7. 비목표 / 주의

- 본 plan 으로 자동 코드 변경 없음 — Phase 별 PR + codex + (양 repo) 거버넌스 준수.
- pullim-api 는 **pnpm·NestJS**, games 는 **bun·Next.js** (스택 차이 유지 — canonical-stack 정합).
- AI 카드 생성(`ANTHROPIC_API_KEY`)은 **보류**(G1) — 본 통합 범위 밖. games `apps/games/lib/server/ai/anthropic.ts` 는 보류 상태로 둠.
- games 의 게스트(비로그인) 사용은 보존 — 중앙 인증 위임 후에도 게스트 우선(`spec/05 §5.2`).
