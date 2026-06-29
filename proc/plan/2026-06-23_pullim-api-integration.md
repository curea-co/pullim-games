# pullim-games → pullim-api 통합 (인증·학습데이터 위임, games=FE+BFF)

**작성일**: 2026-06-23
**작성자**: 사용자(G1) 결정 + claude
**상태**: **P0 방향 제안 — 설계 + 핸드오프 초안.** 코드·spec 변경 0. (P0 산출물: 본 plan + 핸드오프. P1~ 은 ①선행 spec 개정 ②인증 계약 회신 후.)
**근거**: 사용자(G1) 방향 제시 (2026-06-23) — 현황 분석(`proc/research` / 본 plan §1) 후.

> ⚠️ **spec 우선 원칙(spec/01 §2 · CLAUDE.md §9)**: 본 plan 의 방향은 **권위 spec 개정 전제의 제안**이다. `proc/spec/05 §5.2` 는 현재 games 계정이 타 서비스와 **완전 독립**(계정 학습데이터도 games 전용 Postgres)이라고 못 박고 있다 — 아래 §1 방향(중앙 인증·데이터 위임)은 이 전제를 뒤집으므로, **먼저 spec/05 §5.2 를 G1/G3/G4 합의로 개정(선행 spec phase)** 한 뒤에야 P1+ 코드 착수가 가능하다. spec 미개정 상태에서 본 plan 을 확정 결정으로 취급하지 않는다.

## 1. 방향 제안 (G1, 2026-06-23 — spec/05 §5.2 개정 선행)

| # | 제안 |
|---|---|
| 1 | **인증 → pullim-api 중앙 인증으로 위임** (games 자체 email+pw 인증 폐기) |
| 2 | **학습 데이터 → pullim-api `games` 모듈로 이전** (srs/streak/activity/custom) |
| 3 | **pullim-games = FE + 얇은 BFF** (데이터·인증 로직 미보유, 프록시만) |
| 4 | (1~3 도출) **games 자체 Postgres 불필요** — `DATABASE_URL`·migrations·db client 제거 대상 |

> 위 1~4 는 **spec/05 §5.2 개정 후 확정**. 선행 spec phase = `05 §5.2`(독립 계정·games 전용 DB 전제)를 "중앙 인증 위임·학습데이터 pullim-api 소유"로 개정.

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

(행동 계약은 본 문서 안에서 독립적으로 서술한다 — 타 풀림 프로젝트(planner/Q)의 코드·파일 경로 참조 금지(CLAUDE.md §4). same-site 쿠키 SSO·introspection 게이트는 부모도메인 `.pullim.ai` 공유라는 **계약**이지 특정 레포 파일이 근거가 아니다.)

## 3. pullim-games 변경

### 제거 (pullim-api 로 이관)
- `lib/server/auth/{password,users,session}` (인증 비즈니스 로직) — pullim-api login/session 으로 대체
- `lib/server/learning/*` (srs·streak·activity·custom·sync-csrf) — pullim-api games 모듈로 이전
- `lib/server/db/client.ts`, `migrations/0001_init.sql`·`0002_learning_data.sql` — games DB 폐기
- `DATABASE_URL` env (Vercel·`.env.example`)
- `app/api/auth/{login,signup,logout,me,csrf}` · `app/api/sync*` (games 자체 인증/학습 BFF 라우트) — **제거.** 아래 정본 경로(직접 호출)로 대체.
- DB 의존 단위/라우트 테스트

### 정본 경로 — **브라우저 직접 호출 (단일 경로 고정)**
> 인증·학습데이터 요청은 **하나의 경로만** 둔다(이원화 금지 — CSRF·쿠키 스코프·오류 처리 기준 단일화). FE 가 pullim-api 를 **직접 호출**하는 것이 정본이고, games BFF 는 **인증/데이터 프록시가 아니다.**
- **직접 호출(정본)**: 브라우저가 `api.pullim.ai/auth/*`(인증)·`api.pullim.ai/games/*`(학습데이터)를 `credentials:include` 로 직접 호출. CSRF·세션 쿠키 발급/검증은 **pullim-api 가 단독 소유**. games 에 `app/api/auth/*`·`app/api/sync*` 미보유.
- **games proxy 의 역할 = 보호 라우트 진입 게이팅뿐**: 미들웨어가 쿠키 1차 필터 후 pullim-api introspection 으로 신원 확인해 라우트 통과/차단만 한다(요청 프록시 아님).
- `lib/server/http/{csrf,same-origin}` — 게이팅 미들웨어의 보조 가드로만 필요 최소 유지.
- FE 전부 유지.

### 보류 (G1, 2026-06-23 — 이번 범위 밖)
- `app/api/billing/notify*` + `lib/server/billing/*` (Resend) — **보류.** pullim-api 에 `billing` 도메인 + toss_payments 가 *언급*(dev API docs `dev-api.pullim.ai/api-docs`)되나 구현·운영 불명. 결제 통합은 별 트랙.
- `app/api/event` — **보류** (billing 과 함께 추후 판단).

## 4. pullim-api 변경 (별 repo — **핸드오프 문서로 전달**)

> 사용자(G1) 결정: pullim-api 측은 claude 가 직접 코딩하지 않고 **핸드오프 문서**로 넘긴다 → **[`2026-06-23_HANDOFF-pullim-api-games-module.md`](./2026-06-23_HANDOFF-pullim-api-games-module.md)**. pullim-api 자체 거버넌스(AGENTS, ADR, `feature → dev → main`)로 수용·진행.

- `src/games/modules/` 에 **학습데이터 엔드포인트** 신설 (현재 authz-sample·health 스켈레톤뿐):
  - srs state sync(upsert/조회), streak, activity log(+retention cleanup), custom content
  - 중앙 인증 authz 게이트 적용 (authz-matrix)
- 데이터 모델: games 의 `srs_states`·`streaks`·`activity_log`·`custom_content` 스키마를 pullim-api `data-model` 로 이식
- 인증: 기존 login/session/oauth 재사용 — games 전용 신규 인증 불필요(중앙)

## 5. BFF 설계 — **planner/Q 패턴 채택** (신규 설계 최소)

1. **세션·쿠키**: same-site `.pullim.ai` 쿠키 SSO + CSRF (pullim-api 가 발급·검증, planner/Q 동작 중). games 는 `NEXT_PUBLIC_API_BASE_URL`(dev/api.pullim.ai)로 pullim-api `/auth/*` 직접 호출(`credentials:include`). **games 로컬 세션 저장·검증 없음** (중앙 위임).
2. **얇은 proxy**: 보호 라우트 진입 게이팅만 — 쿠키 1차 필터 후 pullim-api introspection 으로 신원 확인. 풀 요청 프록시 아님. CSRF/same-origin 보조 가드는 필요 최소만.
3. **데이터 마이그레이션**: games DB env 미설정 = **prod 데이터 없음 → 클린 컷오버**(이행 0). 배포 전 재확인.
4. **확인 필요(축소)**: ① games authz scope(authz-matrix), ② `/games/me` introspection vs `/auth/me` 재사용, ③ 게스트 흐름 vs dev KCB 강제 — **핸드오프 §A** 참조.

## 6. Phase 분할 (안전·점진)

| Phase | 내용 | 산출 |
|---|---|---|
| **P0** | 설계 확정 — pullim-api 인증 계약·games authz·데이터 모델 합의 (양 repo) | 본 plan 합의 + pullim-api 측 plan/ADR |
| **P1** | pullim-api: games 모듈 학습데이터 엔드포인트 + authz (pullim-api repo) | API 배포(dev) |
| **P2** | games: 인증 직접 호출 전환 — FE 가 `api.pullim.ai/auth/*` 직접 호출(같은 도메인 쿠키), games `/api/auth/*` 제거 + 라우트 게이팅 미들웨어 | games 로그인 동작(중앙 인증) |
| **P3** | games: 학습데이터 직접 호출 전환 — FE 가 `api.pullim.ai/games/*` 직접 호출, games `/api/sync*` 제거 | 학습 동기화 동작 |
| **P4** | games: 자체 BE 제거 — auth/learning 로직·db·migrations·`DATABASE_URL` 폐기 | games = FE+BFF only |
| ~~P5~~ | billing/event — **보류** (별 트랙, 결제 통합 시) | — |

## 7. 비목표 / 주의

- 본 plan 으로 자동 코드 변경 없음 — Phase 별 PR + codex + (양 repo) 거버넌스 준수.
- pullim-api 는 **pnpm·NestJS**, games 는 **bun·Next.js** (스택 차이 유지 — canonical-stack 정합).
- AI 카드 생성(`ANTHROPIC_API_KEY`)은 **보류**(G1) — 본 통합 범위 밖. games `lib/server/ai/anthropic.ts` 는 보류 상태로 둠.
- games 의 게스트(비로그인) 사용은 보존 — 중앙 인증 위임 후에도 게스트 우선(`spec/05 §5.2`).
