# pullim-games → pullim-api 통합 (인증·학습데이터 위임, games=FE+BFF)

**작성일**: 2026-06-23
**작성자**: 사용자(G1) 결정 + claude
**상태**: **P0 진행 — 설계 + 핸드오프 작성됨.** 코드 변경 0. (P0 산출물: 본 plan + 핸드오프 문서. P1~ 은 인증 계약 회신 후.)
**근거**: 사용자(G1) 결정 (2026-06-23) — 현황 분석(`proc/research` / 본 plan §1) 후 방향 확정.

## 1. 결정 (G1, 2026-06-23)

| # | 결정 |
|---|---|
| 1 | **인증 → pullim-api 중앙 인증으로 위임** (games 자체 email+pw 인증 폐기) |
| 2 | **학습 데이터 → pullim-api `games` 모듈로 이전** (srs/streak/activity/custom) |
| 3 | **pullim-games = FE + 얇은 BFF** (데이터·인증 로직 미보유, 프록시만) |
| 4 | (1~3 도출) **games 자체 Postgres 불필요** — `DATABASE_URL`·migrations·db client 제거 대상 |

## 2. 목표 아키텍처

**확립된 planner/Q 컨슈머 패턴 채택** (games.pullim.ai ↔ api.pullim.ai = 동일 부모도메인 `.pullim.ai`):

```
브라우저 (games.pullim.ai)
   │  ① /auth/*·/games/* 직접 호출 (credentials:include, same-site .pullim.ai 쿠키)
   │  ② 보호 라우트 진입은 games 얇은 proxy/middleware 가 게이팅(쿠키 introspection)
   ▼ (①은 pullim-api 로, ②는 games proxy 통과 후 렌더)
pullim-api (api.pullim.ai) ── 중앙 인증(/auth/*) + games 모듈(/games/* 학습데이터) + DB
```

- **pullim-api** 소유: 인증(발급/검증/세션·CSRF), 학습데이터(srs·streak·activity·custom), DB.
- **pullim-games** 소유: FE(21게임·UI) + **얇은 proxy**(라우트 게이팅·introspection — Q `apps/q/proxy.ts` 미러). **DB·인증로직·학습로직 미보유.** FE 는 pullim-api 를 `NEXT_PUBLIC_API_BASE_URL` 로 직접 호출.
- 참조 구현: planner `lib/auth/client.ts`(auth client), Q `apps/q/proxy.ts`(게이트+introspection).

## 3. pullim-games 변경

### 제거 (pullim-api 로 이관)
- `lib/server/auth/{password,users,session}` (인증 비즈니스 로직) — pullim-api login/session 으로 대체
- `lib/server/learning/*` (srs·streak·activity·custom·sync-csrf) — pullim-api games 모듈로 이전
- `lib/server/db/client.ts`, `migrations/0001_init.sql`·`0002_learning_data.sql` — games DB 폐기
- `DATABASE_URL` env (Vercel·`.env.example`)
- DB 의존 단위/라우트 테스트 (대응 BFF 테스트로 교체)

### 유지·전환 (BFF 로 재작성)
- `app/api/auth/{login,signup,logout,me,csrf}` → **pullim-api 인증 엔드포인트 프록시** + 브라우저 세션 쿠키 set/clear
- `app/api/sync*` → **pullim-api games 학습데이터 엔드포인트 프록시**
- `lib/server/http/{csrf,same-origin}` — 브라우저-facing 가드 **유지** (BFF 1차 방어)
- FE 전부 유지

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
2. **얇은 proxy**: 보호 라우트 진입 게이팅만 — Q `apps/q/proxy.ts` 미러(쿠키 1차 필터 → pullim-api introspection). 풀 요청 프록시 아님. CSRF/same-origin 보조 가드는 필요 최소만.
3. **데이터 마이그레이션**: games DB env 미설정 = **prod 데이터 없음 → 클린 컷오버**(이행 0). 배포 전 재확인.
4. **확인 필요(축소)**: ① games authz scope(authz-matrix), ② `/games/me` introspection vs `/auth/me` 재사용, ③ 게스트 흐름 vs dev KCB 강제 — **핸드오프 §A** 참조.

## 6. Phase 분할 (안전·점진)

| Phase | 내용 | 산출 |
|---|---|---|
| **P0** | 설계 확정 — pullim-api 인증 계약·games authz·데이터 모델 합의 (양 repo) | 본 plan 합의 + pullim-api 측 plan/ADR |
| **P1** | pullim-api: games 모듈 학습데이터 엔드포인트 + authz (pullim-api repo) | API 배포(dev) |
| **P2** | games: 인증 BFF 전환 — `/api/auth/*` → pullim-api login/session 프록시 + 세션 쿠키 | games 로그인 동작(중앙 인증) |
| **P3** | games: 학습 sync BFF 전환 — `/api/sync*` → pullim-api games 엔드포인트 프록시 | 학습 동기화 동작 |
| **P4** | games: 자체 BE 제거 — auth/learning 로직·db·migrations·`DATABASE_URL` 폐기 | games = FE+BFF only |
| ~~P5~~ | billing/event — **보류** (별 트랙, 결제 통합 시) | — |

## 7. 비목표 / 주의

- 본 plan 으로 자동 코드 변경 없음 — Phase 별 PR + codex + (양 repo) 거버넌스 준수.
- pullim-api 는 **pnpm·NestJS**, games 는 **bun·Next.js** (스택 차이 유지 — canonical-stack 정합).
- AI 카드 생성(`ANTHROPIC_API_KEY`)은 **보류**(G1) — 본 통합 범위 밖. games `lib/server/ai/anthropic.ts` 는 보류 상태로 둠.
- games 의 게스트(비로그인) 사용은 보존 — 중앙 인증 위임 후에도 게스트 우선(`spec/05 §5.2`).
