# 핸드오프 → pullim-api: games 모듈 (인증 연동 + 학습데이터 API)

**작성일**: 2026-06-23
**From**: pullim-games (G1 방향 제안 — 인증·학습데이터를 pullim-api 로 위임하는 **제안**)
**To**: pullim-api (`src/games/` 모듈 — 현재 authz-sample·health 스켈레톤)
**상태**: HANDOFF DRAFT — **확정 계약 아님.** 선행 spec 개정 후 pullim-api 측 plan/ADR 로 수용 검토 요청
**연계**: pullim-games `proc/plan/2026-06-23_pullim-api-integration.md`

> ⚠️ **이 핸드오프는 미승인 제안이다 (확정 계약으로 받지 말 것)**: pullim-games 의 현행 권위 spec `proc/spec/05 §5.2` 는 games 계정·학습데이터가 **완전 독립**(games 전용 Postgres)이라고 아직 못 박고 있다. 아래 "위임" 방향은 그 전제를 뒤집으므로, **pullim-games 가 먼저 spec/05 §5.2 를 개정(G1/G3/G4 합의)** 해야 본 위임이 확정된다(spec 우선 — spec/01 §2 · CLAUDE.md §9). spec 미개정 상태에서 pullim-api 가 본 문서를 확정 작업지시로 착수하지 말 것 — 계약 합의 후 진행.

pullim-games 가 자체 인증·학습데이터 BE 를 폐기하고 **pullim-api 로 위임하는 방향을 제안**한다 (games = FE + 얇은 라우트-게이팅 proxy, 인증/데이터 프록시 아님). 확정 시 pullim-api `games` 모듈이 아래를 제공하면 games **FE 가 pullim-api 를 직접 호출**한다.

---

## A. 인증 연동 — **same-site `.pullim.ai` 컨슈머 계약** (games.pullim.ai ↔ api.pullim.ai)

games 는 별도 신규 인증 메커니즘이 **불필요** — 부모도메인 `.pullim.ai` 공유에 기반한 컨슈머 **계약**을 채택한다(메커니즘은 pullim-api 가 이미 소유):
- **same-site `.pullim.ai` 쿠키 + CSRF (단, 계정은 product-격리)**: games(`games.pullim.ai`/`dev-games.pullim.ai`) ↔ pullim-api(`api.pullim.ai`/`dev-api.pullim.ai`) 동일 부모도메인 → 인증 쿠키 전송 공유. **⚠️ 이 쿠키 공유는 전송 편의일 뿐 cross-product 계정 통합이 아니다** — spec/05 §5.2 가 `games`·`games-arcade` 등 **완전 독립 계정**을 요구하므로, **[계약 필요] games 전용 세션 namespace/audience 격리 규칙**(예: 토큰 audience=`games`, product-scoped 세션)을 명시해 sibling 서비스가 같은 세션을 재사용(묵시적 계정 통합)하지 못하게 한다. "어디까지 공유(전송)·어디서 격리(계정/audience)"를 계약화.
- FE 가 pullim-api `/auth/*`(login/signup/me/logout/refresh/csrf) 를 **직접 호출**(`credentials: include`). env `NEXT_PUBLIC_API_BASE_URL`(dev=`https://dev-api.pullim.ai`, prod=`https://api.pullim.ai`).
- games 측 **얇은 proxy/middleware** 가 보호 라우트 진입 게이팅. **회원·게스트 두 진입을 분리**해 판별한다(spec/05 §5.2 게스트 우선 — 게스트도 보호 라우트 통과해야 함):
  - **회원 게이트**: pullim-api 세션 쿠키 → introspection(쿠키 1차 필터 후 pullim-api 확인). 풀 요청 프록시 아님.
  - **게스트 흐름 — 본 통합 범위 밖(games 기존 동작 보존)**: 본 통합은 **회원 인증/데이터만 pullim-api 로 위임**한다. 게스트(localStorage 전용 신원, spec/05 §5.2/§5.6)는 **games 의 기존 입구 게이트 동작 그대로** — 본 핸드오프가 게스트 게이트를 재설계하거나 게스트 신원을 서버로 옮기지 않는다(local-only·서버 전송 0 정책 불변). 위 회원 게이트(introspection)는 기존 게스트 미들웨어 **옆에 회원 경로만 추가**하는 것. 게스트 게이트의 현행 spec/05 정합은 games 가 이미 소유 — pullim-api 측 신규 작업 없음. (게스트 모델 자체를 바꾸려면 그건 별도 spec/05 개정 사안이며 본 통합 범위 아님.)

→ 즉 **인증 메커니즘(쿠키·CSRF·발급/검증)은 pullim-api 가 단독 소유**. games 가 pullim-api 에 **추가로 필요한 것**은:
1. **games authz scope** — games 사용자(학생)가 *자기* 학습데이터에만 접근하는 user-scoped 인가 (authz-matrix 에 games 추가).
2. **`GET /games/me`** introspection(헤더 프로필·세션 검증용) — 또는 기존 `/auth/me` 재사용 가능 여부 회신.
3. games 가 가입 권위(signup·KCB 본인인증)를 중앙에 위임하는지 — games 는 **게스트 우선**이라 가입 강제 X. dev KCB 강제 정책이 games 게스트 흐름과 충돌하지 않는지 확인.
4. **회원 프로필 필드 — `grade` + `consent` 함께**(spec/05 §5.6 계정 가입 계약): `grade`(중1~고3, 중·고등 타겟) **및** `consent`("만 14세 이상" 또는 "만 14세 미만 + 보호자 동의" 자가확인) 를 가입 시 **함께** 수집·검증. pullim-api 가 `grade` 만 받으면 회원 가입이 곧 spec 위반 — consent 필드/검증 책임을 중앙에 명시. games-local `users.grade` 이관 시 동반. (games=플랫폼 `games` 패키지, `junior`(초등 주니어) 아님.)
5. **`fingerprint_links` 귀속 규칙**(spec/05 §5.2): 로그인 시 현재 fingerprint 를 계정에 연결하되 그 귀속을 **first-writer-wins** 로 고정(공유 기기 명의오염 방지). 익명→계정 병합(C 참조, 명시적 사용자 확인 후)과 함께 이 소유권/충돌 규칙을 중앙 인증으로 이관해야 한다.

(상세 계약은 **pullim-api 측 내부 권위 문서**가 소유한다 — 구체 경로는 pullim-api repo 가 관할하므로 본 핸드오프에서 외부 repo 내부 경로를 열거하지 않는다(games 독립성 규칙, CLAUDE.md §4).)

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
- 현행 games 동작 참조: `pullim-games` `apps/games/lib/server/learning/*` + `apps/games/app/api/sync/route.ts`.

### B3. 데이터 마이그레이션
- **⚠️ [확인 TODO — 단정 금지] 이행 데이터 존재 여부 선검증**: games 자체 DB 운영 데이터가 0 인지 **확정 전 반드시 확인**. 현행 권위 spec(`proc/spec/05 §5.2`)은 계정 학습데이터를 games 전용 Postgres 영속으로 유지하고, 통합 auth plan 도 prod `DATABASE_URL` 등록을 운영 항목으로 둔다 → 운영 DB 부재를 확인 안 한 채 "클린 컷오버(이행 0)"로 단정하면 존재할 수 있는 계정 데이터를 누락시킨다. **운영 DB 상태 확인 → 데이터 있으면 마이그레이션 / 없으면 클린 컷오버** 분기.

---

## C. games 측이 처리(핸드오프 아님 — 참고)
- 게스트(비로그인): localStorage 로컬 보관. 로그인 시 익명→회원 데이터 병합은 **명시적 사용자 확인 후에만** 수행하고 자동 흡수는 금지한다(공유 기기 명의오염 차단 — `proc/spec/05 §5.2` 계약). 즉 로그인했다고 게스트 진행도를 무확인 자동 마이그레이션하지 않고, "이 기기의 게스트 기록을 내 계정에 합칠까요?" 류 확인 단계를 거친다 — games FE 책임.
- BFF 프록시·세션쿠키·CSRF/same-origin 1차 가드 — games.
- FSRS 알고리즘 자체는 games(클라) — pullim-api 는 `fsrs_card` JSON 을 불투명 저장.

## D. pullim-api 측 진행 (해당 repo 거버넌스)
- `feature → dev → main`, PR-only, ADR/authz-matrix 갱신.
- games 모듈: authz-sample/health 스켈레톤 → 위 학습데이터 모듈 배선.
- 완료 시 games 에 **엔드포인트 계약(경로·요청/응답·인증 헤더/쿠키)** 회신 → games BFF 구현(P2/P3).
