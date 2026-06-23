# 핸드오프 → pullim-api: games 모듈 (인증 연동 + 학습데이터 API)

**작성일**: 2026-06-23
**From**: pullim-games (G1 결정 — 인증·학습데이터를 pullim-api 로 위임)
**To**: pullim-api (`src/games/` 모듈 — 현재 authz-sample·health 스켈레톤)
**상태**: HANDOFF DRAFT — pullim-api 측 plan/ADR 로 수용해 진행 요청
**연계**: pullim-games `proc/plan/2026-06-23_pullim-api-integration.md`

pullim-games 가 자체 인증·학습데이터 BE 를 폐기하고 **pullim-api 로 위임**한다 (games = FE + 얇은 BFF). pullim-api `games` 모듈이 아래를 제공해야 games BFF 가 프록시할 수 있다.

---

## A. 인증 연동 — **확립된 planner/Q 패턴 채택** (games.pullim.ai ↔ api.pullim.ai = same-site `.pullim.ai`)

games 는 별도 신규 패턴이 **불필요** — `planner.pullim.ai`/`q` 가 이미 쓰는 컨슈머 패턴을 그대로 채택한다:
- **same-site `.pullim.ai` 쿠키 SSO + CSRF**: games(`games.pullim.ai`/`dev-games.pullim.ai`) ↔ pullim-api(`api.pullim.ai`/`dev-api.pullim.ai`) 동일 부모도메인 → 인증 쿠키 공유.
- FE 가 pullim-api `/auth/*`(login/signup/me/logout/refresh/csrf) 를 **직접 호출**(`credentials: include`). env `NEXT_PUBLIC_API_BASE_URL`(dev=`https://dev-api.pullim.ai`, prod=`https://api.pullim.ai`).
- games 측 **얇은 proxy/middleware**(Q `apps/q/proxy.ts` 미러)가 보호 라우트 진입 게이팅 + 세션 introspection(쿠키 forward).

→ 즉 **인증 메커니즘(쿠키·CSRF·발급/검증)은 pullim-api 가 이미 제공** (planner/Q 동작 중). games 가 pullim-api 에 **추가로 필요한 것**은:
1. **games authz scope** — games 사용자(학생)가 *자기* 학습데이터에만 접근하는 user-scoped 인가 (authz-matrix 에 games 추가).
2. (Q `/q/me` 미러) **`GET /games/me`** introspection (헤더 프로필·세션 검증용) — 또는 기존 `/auth/me` 재사용 가능 여부 회신.
3. games 가 가입 권위(signup·KCB 본인인증)를 중앙에 위임하는지(planner 처럼) — games 는 **게스트 우선**이라 가입 강제 X. dev KCB 강제 정책이 games 게스트 흐름과 충돌하지 않는지 확인.

(상세 계약: `docs/design/_platform/api.md`·`authz-matrix.md`. planner `apps/planner/lib/auth/client.ts`·Q `apps/q/proxy.ts` 참조.)

---

## B. 학습데이터 API (games 모듈 신설) — 스펙

games 의 현행 스키마/동기화 모델을 이식. **증분 동기화**: 각 레코드 `updated_at`(epoch ms, 서버 write 시각) = pull 커서 + **LWW(last-write-wins)** 기준. 모든 엔드포인트 **user-scoped**(인증 사용자 기준).

### B1. 데이터 모델 (현행 games schema)

| 엔티티 | 키 | 필드 | 동기화 단위 |
|---|---|---|---|
| **srs_state** | (user, game_id, card_id) | `fsrs_card`(JSON), `review_count`, `last_review_at`(ms·nullable), `updated_at`(ms) | per-card LWW |
| **streak** | user | `current`, `longest`, `last_active_date`("YYYY-MM-DD"), `updated_at` | per-user LWW |
| **activity_log** | (user, game_id, date, device_id) | `count`(기기·날짜 절대값), `updated_at` | per-(기기,날짜) LWW. `date<cutoff` retention cleanup |
| **custom_content** | user | `snapshot`(JSON), `updated_at` | 컬렉션 LWW |

- `device_id`: 동기화 전용 랜덤 UUID(fingerprint 아님) — 다기기 활동 합산용.

### B2. 엔드포인트 (제안 — pullim-api 컨벤션에 맞게 조정)

| 동작 | 메서드/경로(제안) | 설명 |
|---|---|---|
| push (upsert) | `POST /games/sync` | srs/streak/activity/custom 변경분 배치 upsert, **서버 updated_at 기준 LWW**(클라가 더 옛것이면 무시) |
| pull (증분) | `GET /games/sync?since=<updated_at>` | `since` 이후 변경 레코드 반환(증분). srs/streak/activity/custom 전 영역 |
| cleanup(cron) | (내부 스케줄) activity_log `date < cutoff(14일)` 삭제 | games 의 `/api/sync/cleanup` cron 대체 — pullim-api 스케줄러로 |

- 단일 `POST/GET /games/sync` 통합 vs 영역별 분리는 pullim-api 컨벤션 따름. 핵심은 **LWW + updated_at 커서 + device_id** 보존.
- 현행 games 동작 참조: `pullim-games` `apps/games/lib/server/learning/*` + `app/api/sync/route.ts`.

### B3. 데이터 마이그레이션
- **이행 데이터 0 (클린 컷오버)** — games 자체 DB 는 운영 env(`DATABASE_URL`) 미설정 상태로 prod 데이터 없음. 신규 스키마로 시작.

---

## C. games 측이 처리(핸드오프 아님 — 참고)
- 게스트(비로그인): localStorage 로컬 보관, 로그인 시 서버 병합(익명→회원 마이그레이션) — games BFF/FE 책임.
- BFF 프록시·세션쿠키·CSRF/same-origin 1차 가드 — games.
- FSRS 알고리즘 자체는 games(클라) — pullim-api 는 `fsrs_card` JSON 을 불투명 저장.

## D. pullim-api 측 진행 (해당 repo 거버넌스)
- `feature → dev → main`, PR-only, ADR/authz-matrix 갱신.
- games 모듈: authz-sample/health 스켈레톤 → 위 학습데이터 모듈 배선.
- 완료 시 games 에 **엔드포인트 계약(경로·요청/응답·인증 헤더/쿠키)** 회신 → games BFF 구현(P2/P3).
