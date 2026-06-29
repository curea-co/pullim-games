# 핸드오프 → pullim-api: games 모듈 (인증 연동 + 학습데이터 API)

**작성일**: 2026-06-23
**From**: pullim-games (G1 방향 제안 — 인증·학습데이터를 pullim-api 로 위임하는 **제안**)
**To**: pullim-api `games` 모듈 (논리 단위 — 구체 경로는 pullim-api repo 관할)
**상태**: HANDOFF DRAFT — **확정 계약 아님.** 선행 spec 개정 후 pullim-api 측 plan/ADR 로 수용 검토 요청
**연계**: pullim-games `proc/plan/2026-06-23_pullim-api-integration.md`

> ⚠️ **이 핸드오프는 미승인 제안이다 (확정 계약으로 받지 말 것)**: pullim-games 의 현행 권위 spec `proc/spec/05 §5.2` 는 games 계정·학습데이터가 **완전 독립**(games 전용 Postgres)이라고 아직 못 박고 있다. 아래 "위임" 방향은 그 전제를 뒤집으므로, **pullim-games 가 먼저 선행 spec 을 개정(G1/G3/G4 합의)** 해야 본 위임이 확정된다(spec 우선 — spec/01 §2 · CLAUDE.md §9). ⚠️ **개정 범위는 §5.2 단독이 아니다** — 같은 위임으로 영향받는 절을 묶어 개정해야 부분 정합을 피한다: 최소 `spec/05 §5.2`(독립 계정·games DB)·`spec/05 §5.6`(가입 계약 권위 중앙 이동)·`spec/09 §9.1`(`DATABASE_URL`·게임 DB 런타임 폐기) + §5 잔여 계정/데이터 조항(상세는 integration plan §1·banner). spec 미개정 상태에서 pullim-api 가 본 문서를 확정 작업지시로 착수하지 말 것 — 계약 합의 후 진행.

> 🎯 **문서 범위 — 고수준 방향·요구만**: 본 핸드오프는 *무엇을 위임하고 무엇이 필요한지*(방향+요구사항)를 전한다. **세부 구현 계약은 단독 명세하지 않는다** — 아래 [P0 설계 TODO] 항목(CORS, 동기화 동시성, 세션 격리, 게스트 게이트 등)은 **통합 실제 착수(P0 설계) 시 pullim-api 와 공동 확정**한다. 미착수 통합의 세부를 지금 단정하면 양 repo 가 stale·불일치 위험. 아래 스펙은 **합의 출발점**이지 최종 계약이 아니다.

### [P0 설계 TODO] — 착수 시 pullim-api 공동 확정 (지금 단독 명세 X)
- **CORS 계약**: 브라우저가 `api.pullim.ai` 를 `credentials:include` 로 직접 호출하므로 pullim-api CORS allowlist(`games.pullim.ai`·`dev-games.pullim.ai` 오리진 명시 허용)·허용 헤더/메서드·preflight 계약 필요(same-site 쿠키만으로 cross-origin fetch 안 열림). 미정의 시 dev/prod 에서 정본 직접호출 경로가 브라우저에서 바로 차단.
- **쿠키 Domain 스코프 — 공유 vs 격리 긴장(미해결 계약)**: "부모도메인 동일 → 쿠키 자동 공유"는 **틀림**(자동 아님). 그렇다고 단순히 `Domain=.pullim.ai` 로 넓히면 **games↔api 뿐 아니라 `planner.pullim.ai`·`q.pullim.ai` 등 sibling 전부가 같은 세션 쿠키를 읽어** spec/05 §5.2 독립 계정·세션 격리가 **붕괴**한다(= 본문이 짚은 "세션 격리 붕괴"). 따라서 `Domain=.pullim.ai` 를 답으로 단정하지 않는다 — **계약으로 풀어야 할 긴장**: ⒜ host-scoped(좁은) 쿠키 + games 가 토큰을 명시 전송, ⒝ Domain 은 넓히되 **audience=`games` 스코프**로 sibling 이 읽어도 재사용 불가, ⒞ product 별 쿠키 네임스페이스 — 중 무엇으로 "games↔api 직접호출 인증은 되되 sibling 누수는 없게" 할지 pullim-api 와 확정. Domain·`Secure`·`SameSite`(cross-subdomain) 까지 묶어 계약(아래 product/환경 격리 항목과 연동). **⚠️ 미들웨어 게이트와의 충돌(필수 해소)**: games 회원 coarse gate(`apps/games/middleware.ts`)는 **`games.pullim.ai` 에서 세션 존재 쿠키를 읽을 수 있어야** 보호 라우트를 통과시킨다. 후보 ⒜(host-scoped to `api.pullim.ai`) 를 고르면 그 쿠키는 `games.pullim.ai` 에서 **안 보여** 로그인 회원이 보호 라우트에서 `/` 로 튕긴다 → 게이트 붕괴. 따라서 쿠키 스킴은 **`games.pullim.ai`-readable 세션 존재 신호**(예: 게스트 `pullim_games_guest` 와 동형의 non-HttpOnly presence 힌트 쿠키를 games 도메인에 set, PII 없음)를 **반드시 동반**하도록 계약 — 쿠키 스코프와 미들웨어 게이트를 **함께** 확정(따로 결정하면 핸드오프 입력이 틀어진다).
- **CSRF cross-subdomain**: 현 games 의 **double-submit CSRF** 패턴이 `games.pullim.ai`→`api.pullim.ai` 직접호출에서 어떻게 성립하는지 계약 필요 — CSRF 토큰 발급/검증 위치, 클라가 읽어 헤더로 되쏠 수 있는 non-HttpOnly 쿠키의 스코프(위 쿠키 Domain 긴장과 동일 — 넓은 Domain 은 sibling 노출이라 audience/네임스페이스로 제한). cross-subdomain 에서 double-submit 이 깨지지 않게 토큰 모델 확정.
- **동기화 동시성 — 현 semantics 보존**: 다기기 stale 덮어쓰기는 현행 games 가 **클라측 recency 신호**(SRS `last_review_at` 조건부 머지, custom `exportedAt` revision reject-older)와 **POST cursor 미반환**(클라는 GET 응답 리소스별 cursor 로만 전진, #117 R8) 으로 이미 해소(§B 불변식 ⒜~⒟). pullim-api 재구현 시 과제는 "없는 토큰 추가"가 아니라 이 불변식을 보존하는 것 — 핵심은 **커서가 벽시계가 아니라 전역 단조 시퀀스**(`learning_sync_seq` 류)라는 점. 다중 인스턴스에서도 **단일 전역 시퀀스/생성기로 단조성 보존**(인스턴스별 시계로 대체 금지 — clock skew 시 커서 역행→누락), upsert 트랜잭션에서 시퀀스 발급·커밋 순서를 확정.
- **기존 회원 계정 마이그레이션**: games 자체 인증(email/pw, `users` 테이블)을 폐기하고 중앙 identity 로 옮길 때, **기존 games 회원 계정을 어떻게 이관/통합할지** 계약 필요 — 이메일 충돌·중복 식별자 매핑·재인증/재가입 정책·기존 학습데이터 귀속 유지. (계정 데이터 실재 여부는 §B3 확인 TODO 와 연동 — 데이터 있으면 마이그레이션, 없으면 신규.)
- **계정 product-격리 + 환경 격리**: `.pullim.ai` 쿠키 공유 ≠ cross-product 계정 통합. ⒜ **product — "완전 독립 계정"(spec/05 §5.2)이 세션 audience 분리만으로 충족되는지 먼저 확정**: audience 스코프는 *세션 토큰* 격리일 뿐, spec/05 §5.2 의 "완전 독립 계정"이 **계정 레코드(식별자·프로필·자격) 자체의 분리**까지 요구하면 audience 만으론 부족하다. → **중앙 identity 에서 games 계정을 어떤 단위로 두는가**(㉠ 공유 identity + product audience/scope, ㉡ product 별 독립 account 레코드, ㉢ 동일 사람의 cross-product 링크 허용 여부)를 **계약으로 결정**해야 하며, 중앙 위임 방향과 "완전 독립 계정" 요구의 충돌을 P0 에서 해소. ⒝ **환경**: dev/prod 쿠키·세션 스코프 분리(`dev-games↔dev-api` / `games↔api`)로 환경 간 세션 누수 차단.
- **게스트 게이트**: games 기존 local-only 동작 유지(본 통합 범위 밖, §A). 게스트 모델 변경은 별도 spec/05 개정 사안.

pullim-games 가 자체 인증·학습데이터 BE 를 폐기하고 **pullim-api 로 위임하는 방향을 제안**한다 (games = FE + 얇은 라우트-게이팅 proxy, 인증/데이터 프록시 아님). 확정 시 pullim-api `games` 모듈이 아래를 제공하면 games **FE 가 pullim-api 를 직접 호출**한다.

---

## A. 인증 연동 — **same-site `.pullim.ai` 컨슈머 계약** (games.pullim.ai ↔ api.pullim.ai)

games 는 별도 신규 인증 메커니즘이 **불필요** — 부모도메인 `.pullim.ai` 공유에 기반한 컨슈머 **계약**을 채택한다(메커니즘은 pullim-api 가 이미 소유):
- **same-site `.pullim.ai` 쿠키 + CSRF (Domain 스코프·격리 계약 전제)**: games(`games.pullim.ai`/`dev-games.pullim.ai`) ↔ pullim-api(`api.pullim.ai`/`dev-api.pullim.ai`) 동일 부모도메인이라 쿠키 전송 공유 **가능** — 단 자동이 아니며, **쿠키 Domain 스코프(공유↔sibling 격리 긴장) + cross-subdomain CSRF 성립 계약**이 먼저 풀려야 한다(아래 [P0 설계 TODO] 쿠키 Domain·CSRF 항목 — `Domain=.pullim.ai` 를 답으로 단정하지 않음). **⚠️ 이 쿠키 공유는 전송 편의일 뿐 cross-product 계정 통합이 아니다** — spec/05 §5.2 가 `games`·`games-arcade` 등 **완전 독립 계정**을 요구하므로, sibling 서비스가 같은 세션을 재사용(묵시적 계정 통합)하지 못하게 막아야 한다. **단 세션 audience 격리만으로 "완전 독립 계정"이 충족되는지는 단정 금지** — audience 는 세션 토큰 격리일 뿐이고, 계정 레코드(식별자·프로필·자격) 분리까지 요구되는지는 [P0 설계 TODO] product-격리 항목에서 중앙 identity 단위(공유 identity+scope / product 별 독립 레코드 / cross-product 링크)를 계약으로 결정한다. "어디까지 공유(전송)·어디서 격리(세션 audience / 계정 레코드)"를 계약화.
- FE 가 pullim-api `/auth/*`(login/signup/me/logout/refresh/csrf) 를 **직접 호출**(`credentials: include`). env `NEXT_PUBLIC_API_BASE_URL` — **로컬**=pullim-api 로컬(예 `http://localhost:<api-port>`, games dev 는 `localhost:3004`), **dev**=`https://dev-api.pullim.ai`, **prod**=`https://api.pullim.ai`. ⚠️ **로컬은 `.pullim.ai` 부모도메인이 없다** → same-site 쿠키 공유 불가. 로컬 개발에선 `localhost:3004↔localhost:<api>` cross-origin 이라 CORS allowlist 에 `http://localhost:3004` 명시 + 쿠키는 `Domain` 없이(host-only) 발급하는 **별도 로컬 스킴**이 필요(아래 [P0 설계 TODO] 쿠키/CORS 와 연동). 이 경로가 빠지면 로컬에서 로그인·sync 가 막혀 개발 불가.
- games 측 **얇은 proxy/middleware** 가 보호 라우트 진입 게이팅. **회원·게스트 두 진입을 분리**해 판별한다(spec/05 §5.2 게스트 우선 — 게스트도 보호 라우트 통과해야 함):
  - **회원 게이트**: pullim-api 세션 쿠키 → introspection(쿠키 1차 필터 후 pullim-api 확인). 풀 요청 프록시 아님. **⚠️ 전제**: 미들웨어의 "쿠키 1차 필터"는 **`games.pullim.ai` 에서 읽히는 세션 존재 신호**가 있어야 성립 — 세션 쿠키가 `api.pullim.ai` host-scoped 면 games 미들웨어가 못 읽어 회원이 보호 라우트에서 튕긴다. 쿠키 스코프 계약이 games 도메인 readable presence 힌트(게스트 패턴과 동형)를 동반하게 한다([P0 설계 TODO] 쿠키 Domain 항목).
  - **게스트 흐름 — 본 통합 범위 밖(games 기존 동작 보존)**: 본 통합은 **회원 인증/데이터만 pullim-api 로 위임**한다. **⚠️ 게스트 게이트는 "localStorage 전용"이 아니라 서버(Edge) coarse gate 다** — games 미들웨어(`apps/games/middleware.ts`, matcher `/home`·`/games/:gameId+`)가 **non-HttpOnly 힌트 쿠키 `pullim_games_guest` 와 회원 세션 쿠키 `pullim_games_session` 의 존재 여부**를 서버에서 읽어, 둘 다 없으면 `/`(랜딩)로 리다이렉트한다(JS 비활성·직접요청에도 보호 라우트 비노출). 즉 **게스트 신원 데이터는 localStorage(서버 전송 0)** 지만 **게이트 통과는 서버 쿠키 판정**이다(힌트 쿠키엔 PII 없음 — 존재 플래그만). 본 핸드오프는 이 게스트 게이트를 **재설계하지 않는다**: 회원 게이트(introspection)를 기존 게스트 coarse gate **옆에 추가**할 뿐이고, 게스트 힌트쿠키·local-only 데이터 정책은 games 가 계속 소유(pullim-api 측 신규 작업 없음). (게스트 모델 변경은 별도 spec/05 개정 사안.)

→ 즉 **인증 메커니즘(쿠키·CSRF·발급/검증)은 pullim-api 가 단독 소유**. games 가 pullim-api 에 **추가로 필요한 것**은:
1. **games authz scope** — games 사용자(학생)가 *자기* 학습데이터에만 접근하는 user-scoped 인가 (authz-matrix 에 games 추가).
2. **`GET /games/me`** introspection(헤더 프로필·세션 검증용) — 또는 기존 `/auth/me` 재사용 가능 여부 회신.
3. games 가 가입 권위(signup·KCB 본인인증)를 중앙에 위임하는지 — games 는 **게스트 우선**이라 가입 강제 X. dev KCB 강제 정책이 games 게스트 흐름과 충돌하지 않는지 확인.
4. **회원 프로필 필드 — `grade` + `consent` 함께**(spec/05 §5.6 계정 가입 계약): `grade`(중1~고3, 중·고등 타겟) **및** `consent`("만 14세 이상" 또는 "만 14세 미만 + 보호자 동의" 자가확인) 를 가입 시 **함께** 수집·검증. pullim-api 가 `grade` 만 받으면 회원 가입이 곧 spec 위반 — consent 필드/검증 책임을 중앙에 명시. games-local `users.grade` 이관 시 동반. (games=플랫폼 `games` 패키지, `junior`(초등 주니어) 아님.)
5. **`fingerprint_links` 귀속 규칙**(spec/05 §5.2): 로그인 시 현재 fingerprint 를 계정에 연결하되 그 귀속을 **first-writer-wins** 로 고정(공유 기기 명의오염 방지). 익명→계정 병합(C 참조, 명시적 사용자 확인 후)과 함께 이 소유권/충돌 규칙을 중앙 인증으로 이관해야 한다.

(상세 계약은 **pullim-api 측 내부 권위 문서**가 소유한다 — 구체 경로는 pullim-api repo 가 관할하므로 본 핸드오프에서 외부 repo 내부 경로를 열거하지 않는다(games 독립성 규칙, CLAUDE.md §4).)

---

## B. 학습데이터 API (games 모듈 신설) — 스펙

games 의 **현행 sync 정본 설계를 그대로 이식**(아래는 신규 모델 제안이 아니라 `apps/games/app/api/sync/route.ts`·`apps/games/lib/server/learning/*` 의 실제 계약 기술 — pullim-api 는 이 semantics 를 보존해야 한다). 모든 엔드포인트 **user-scoped**. 핵심 3 불변식:
- **`updated_at` = 서버 self-stamp 단조 시퀀스**(`nextval('learning_sync_seq')` — **벽시계 ms 아님**). 클라가 보내지 않는다 — pull 증분 **커서로만** 쓰인다. ⚠️ 컬럼명이 `updated_at` 이지만 값은 **시퀀스 정수**다: 같은 ms 에 여러 write 가 일어나도 행마다 고유·단조 증가값을 받아 `(updated_at, stable_id)` tie-breaker 없이도 **동일 ms 증분 pull 누락이 구조적으로 불가능**. 시퀀스를 epoch ms 로 바꾸면 이 보장을 잃는다. (srs/streak/custom 커서가 이 시퀀스. activity 만 전량 집계라 `serverTime(now)` 커서 사용 — 누락 무관.)
- **충돌 해소는 리소스별로 다르다**(균일 LWW 아님): **SRS** = 클라 `last_review_at`(epoch ms) **recency 조건부 머지**(더 옛 리뷰는 무시), **custom** = 클라 `exportedAt`(ISO revision) 비교해 **오래된 스냅샷 거부**, **streak** = **field-wise 단조 머지**(LWW 아님 — `longest`=GREATEST, `current`=더 늦은 `last_active_date` 채택·**같은 날짜면 GREATEST**[stale 작은 current 가 되돌리지 못하게], `last_active_date`=늦은 날짜), **activity** = per-(user,game,date,device) **count=GREATEST(단조 증가)** + 대시보드 표시는 device 간 **SUM**. → 늦게 도착한 stale payload 가 최신을 덮는 경쟁은 이 **클라측 recency 신호 + 단조 머지**(lastReviewAt/exportedAt/GREATEST)로 이미 막혀 있다(서버 updated_at 단독 판별에 의존하지 않음).
- **POST 는 cursor 를 돌려주지 않는다**(#117 R8). 클라는 증분 커서를 **GET 응답의 리소스별 cursor 로만** 전진시킨다 — push 후 "방금 now" 로 커서를 전진시키면 stale payload 가 no-op 됐을 때 서버의 더 최신 행을 다음 GET 이 영구 skip 해 수렴이 깨진다.

### B1. 데이터 모델 (현행 games schema)

| 엔티티 | 키 | 필드 | 동기화 단위 |
|---|---|---|---|
| **srs_state** | (user, game_id, card_id) | `fsrs_card`(JSON), `review_count`, `last_review_at`(**epoch ms**·nullable·머지 recency 기준), `updated_at`(**시퀀스값** `nextval`·커서) | per-card, 클라 `last_review_at` **recency 조건부 머지**(옛 리뷰 무시) |
| **streak** | user | `current`, `longest`, `last_active_date`("YYYY-MM-DD"), `updated_at`(시퀀스값·커서) | **field-wise 단조 머지**(longest=GREATEST, current=늦은 날짜 채택·동일 날짜 GREATEST, last_active_date=늦은 날짜) — LWW 아님 |
| **activity_log** | (user, game_id, date, device_id) | `count`(기기·날짜 절대값), `updated_at`(=push `now`·벽시계) | per-(기기,날짜,device) **count=GREATEST(단조)** upsert, 집계=device 간 **SUM**. `date<cutoff` retention cleanup |
| **custom_content** | user | `snapshot`(JSON, `exportedAt` 포함·머지 revision 기준), `updated_at`(시퀀스값·커서) | 컬렉션 스냅샷, 클라 `exportedAt` revision **오래된 것 거부** |

- `device_id`: 동기화 전용 랜덤 UUID(fingerprint 아님) — 다기기 활동 합산용.
- 입력 검증(현행): epoch ms/날짜 **미래값 거부**(clock skew 오염이 영구 "최신"으로 굳는 것 방지, 오늘+1일 grace), int4 상한 cap(DB overflow→503 방지), 달력 날짜 실재 검증. pullim-api 도 동일 가드 보존 권장.

### B2. 엔드포인트 (제안 — pullim-api 컨벤션에 맞게 조정)

| 동작 | 메서드/경로(제안) | 설명 |
|---|---|---|
| push (upsert) | `POST /games/sync` | srs/streak/activity/custom 변경분 배치 upsert. 서버가 `updated_at` self-stamp. 충돌 해소는 **리소스별**(SRS=클라 `last_review_at` recency 머지, custom=클라 `exportedAt` revision reject-older, streak=field-wise 단조 머지[GREATEST], activity=count GREATEST+device SUM). **응답은 `{ok}` 만 — cursor 미반환**(클라가 커서를 과전진시켜 최신 행을 영구 skip 하는 것 방지, #117 R8) |
| pull (증분) | `GET /games/sync?srs_since=&streak_since=&custom_since=` | **리소스별 시퀀스 커서**(`updated_at` = `nextval('learning_sync_seq')` 단조값, **epoch ms 아님**). srs/streak/custom 은 `*_since`(시퀀스값) 이후 변경분, activity 는 집계 스냅샷 + `cursor=serverTime(now)`. 응답에 리소스별 cursor·`serverTime` 동봉 → 클라는 이 cursor 로만 다음 `*_since` 전진. **단일 opaque cursor 아님** |
| cleanup(cron) | (내부 스케줄) activity_log `date < cutoff` 삭제 | games 의 `/api/sync/cleanup` cron 대체 — pullim-api 스케줄러로 |

- 단일 `POST/GET /games/sync` 통합 vs 영역별 분리는 pullim-api 컨벤션 따름. **보존 필수 불변식**: ⒜ `updated_at` = 서버 **단조 시퀀스**(`nextval`, epoch ms 아님 — 동일 ms 누락 방지), ⒝ 리소스별 시퀀스 `*_since` 커서, ⒞ POST cursor 미반환(클라는 GET cursor 로만 전진), ⒟ 리소스별 충돌 머지(SRS lastReviewAt recency / custom exportedAt revision / streak·activity **GREATEST 단조**), ⒠ activity device_id 별 카운터 + 집계 SUM.
- ⚠️ **pullim-api 재구현 시 잔여 확인(P0)**: 위 불변식 보존 세부(**전역 단조 시퀀스 유지**·인스턴스별 시계 대체 금지·시퀀스 발급/커밋 순서·트랜잭션 격리)는 [P0 설계 TODO] 동시성 항목에서 pullim-api 와 확정. **단, 클라측 recency 신호(lastReviewAt/exportedAt)는 이미 계약에 존재** — "없는 토큰을 추가"가 아니라 "현 semantics(시퀀스 커서 포함) 보존"이 과제다.
- 현행 games 동작 참조: `pullim-games` `apps/games/lib/server/learning/*` + `apps/games/app/api/sync/route.ts`.

### B3. 데이터 마이그레이션
- **⚠️ [확인 TODO — 단정 금지] 이행 데이터 존재 여부 선검증**: games 자체 DB 운영 데이터가 0 인지 **확정 전 반드시 확인**. 현행 권위 spec(`proc/spec/05 §5.2`)은 계정 학습데이터를 games 전용 Postgres 영속으로 유지하고, 통합 auth plan 도 prod `DATABASE_URL` 등록을 운영 항목으로 둔다 → 운영 DB 부재를 확인 안 한 채 "클린 컷오버(이행 0)"로 단정하면 존재할 수 있는 계정 데이터를 누락시킨다. **운영 DB 상태 확인 → 데이터 있으면 마이그레이션 / 없으면 클린 컷오버** 분기.

---

## C. games 측이 처리(핸드오프 아님 — 참고)
- 게스트(비로그인): localStorage 로컬 보관. 로그인 시 익명→회원 데이터 병합은 **명시적 사용자 확인 후에만** 수행하고 자동 흡수는 금지한다(공유 기기 명의오염 차단 — `proc/spec/05 §5.2` 계약). 즉 로그인했다고 게스트 진행도를 무확인 자동 마이그레이션하지 않고, "이 기기의 게스트 기록을 내 계정에 합칠까요?" 류 확인 단계를 거친다 — games FE 책임.
- 게이팅 proxy·세션쿠키·CSRF/same-origin 1차 가드 — games.
- FSRS 알고리즘 자체는 games(클라) — pullim-api 는 `fsrs_card` JSON 을 불투명 저장.

## D. pullim-api 측 진행 (해당 repo 거버넌스)
- `feature → dev → main`, PR-only, ADR/authz-matrix 갱신.
- games 모듈: 현 스켈레톤 → 위 학습데이터 모듈 배선.
- 완료 시 games 에 **엔드포인트 계약(경로·요청/응답·인증 헤더/쿠키)** 회신 → games 직접호출 연동 구현(P2/P3).
