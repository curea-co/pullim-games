# 2026-06-05 — 학습 데이터 서버 동기화 plan (games)

> 후속 phase. `2026-05-29_auth-login-signup.md` 가 "계정·세션·fingerprint 연결까지"로
> 명시적으로 잘라둔 **비범위**(학습 데이터의 서버 흡수/다기기 동기화)를 잇는다.
> 대상: **SRS(간격반복 카드상태) · 스트릭 · 커스텀 콘텐츠** 3종.
> 상태: **DRAFT — §0 거버넌스 합의 + §3 사용자 결정 전까지 코드 진입 금지.**

---

## 0. 권위 충돌 — 반드시 먼저 합의 (거버넌스 경로)

auth plan 과 동일하게, spec 우선 개정 → 코드 순서를 지킨다. 아래 충돌을 G1 합의로 해소하기 전엔 구현 진입 금지.

| spec 위치 | 현행 문구 | 본 plan 제안 |
|---|---|---|
| `05-비즈니스-정책.md §5.2` | "서버에 영속되는 것은 `users`/`auth_sessions`/`fingerprint_links` 뿐. **SRS·스트릭·커스텀 콘텐츠는 아직 localStorage 전용**" | **계정 사용자에 한해** 학습 데이터 서버 영속/동기화를 허용하도록 §5.2 개정. 익명 사용자는 현행 그대로 localStorage 전용 유지 |
| `05-비즈니스-정책.md §5.2` | "현 시점 계정은 **데이터가 자동 복구된다고 약속하지 않는다**" / "계정이 있어도 현재는 학습 데이터가 자동 복구되지 않는다" | 본 phase 완료 시 **"계정 로그인 시 다기기 복구 보장"** 으로 문구 전환 |
| `05-비즈니스-정책.md §5.5` | SRS 카드상태 저장 = "client-side localStorage (V1) + 서버 백업 (Vercel KV, V2)" | 서버 백업 매체를 **games 전용 Postgres(Supabase)** 로 확정 (Vercel KV 아님 — 이미 auth 가 Postgres 채택). §5.5 갱신 |
| `05-비즈니스-정책.md §5.6` | 계정 사용자 저장 항목 = "이메일 + 비밀번호 해시 + fingerprint" | 학습 행동 데이터(카드 진도·복습 횟수·활동일·커스텀 콘텐츠)가 서버에 추가 저장됨 → **PII/데이터 보존 정책에 학습 데이터 항목 추가·보존기간·삭제 경로 명시**(계정 사용자 한정) |

### ⚠️ 하이퍼캐주얼 룰 경계 (위반 금지 — 본 plan 의 헌법적 제약)

`AGENTS.md` "하이퍼캐주얼 — RPG 패턴 금지" 와 auth plan §2 "랭킹·점수·재화·뱃지 = **설계상 영구 금지**" 는 본 plan 으로 **건드리지 않는다**. 명확히:

- 본 plan 은 **개인 학습 연속성(continuity)의 다기기 복구**일 뿐, 경쟁·비교·메타 진행이 **아니다**.
- 금지(영구): 사용자 간 랭킹 테이블, 점수 리더보드, 전역 비교, 재화/뱃지 집계 컬럼.
- 허용: 본인 카드 SRS 상태, 본인 스트릭(타인과 비교 없음), 본인 커스텀 콘텐츠.
- 검증 게이트: 스키마/응답 어디에도 **타 user 의 데이터를 cross-user 로 노출하는 경로가 없어야** 한다(모든 쿼리 `WHERE user_id = me.id`).

---

## 1. 목표

계정 사용자의 **SRS 카드상태 · 스트릭 · 커스텀 콘텐츠**를 games 전용 Postgres 에 영속하여, **기기를 바꾸거나 브라우저를 클리어해도 로그인하면 학습 진도가 복구**되게 한다. auth phase 에서 깔아둔 `fingerprint_links`(first-writer-wins 토대)를 활용해 **로그인 시 1회 익명 데이터 흡수**를 수행한다.

설계 원칙 (기존 spec 정신 보존):
- **localStorage 우선(offline-first).** 서버는 백업/동기화 매체. 비로그인 경험은 0 변화.
- **계정은 여전히 선택.** 비로그인 사용자는 현행 그대로 동작(서버 호출 0).
- **읽기-통과/쓰기-통과(read-through/write-through).** 로컬을 1차 캐시로 유지, 서버에 비동기 반영.

---

## 2. 비목표 (Scope Out)

- 랭킹·점수·재화·뱃지·리더보드 — **설계상 영구 금지**(§0 경계). 본 plan 과 무관하게 추가 안 함.
- 풀림 플랫폼 통합 유저 테이블 federation — games 독립 계정 결정 유지.
- 실시간 동기화(websocket/CRDT). 본 phase 는 **로그인 시 pull + 쓰기 시 debounce push** 수준. 실시간 협업 아님.
- 익명(비로그인) 사용자의 서버 저장 — 현행 localStorage 전용 유지.
- 커스텀 콘텐츠의 서버측 LLM 재생성·공유·마켓플레이스 — 별 plan.
- LLM quota(`pullim-games:llm-quota:*`)의 서버 강제 — 본 phase 비범위(클라 가드 유지, 서버 quota 는 별 plan). 단 §3 D7 에서 거론.

---

## 3. 사용자 결정 필요 사안 (G1 보고)

> **2026-06-05 eng-review 확정**: D2=(a), D4=자동머지(SRS=LWW), D5=(c) 확인 후 흡수, 커스텀=스냅샷 교체. 상세는 §4.3·§5·§7.

| # | 사안 | 선택지 | 비고/권고 |
|---|---|---|---|
| D1 | **spec 개정 승인** | 승인 / 보류 | ✅ **G1 승인(2026-06-05)** — (1)익명 PII-0 불변 (2)하이퍼캐주얼 룰 불변 (3)계정 사용자 학습 행동 데이터 서버 적재 허용. §5.2·§5.5·§5.6 개정 + 구현 진입 가능 |
| D2 | **동기화 모델** | (a) **로컬 우선 + 서버 백업**(읽기-통과/쓰기-통과) / (b) 서버 권위 / (c) 양방향 머지 | ✅ **(a) 확정** — 기존 "localStorage 우선" 정신·오프라인 내성 보존 |
| D3 | **동기화 시점** | (a) 로그인 시 pull + 쓰기 **배치 debounce push** / (b) 주기적 폴링 / (c) 수동 버튼 | ✅ **(a) 확정** — 단 카드별 단건 X, **dirty 키 모아 배치 델타**(§5 P4). 무마찰 |
| D4 | **다기기 충돌 해소** | per-데이터 머지 규칙(§4.3) 자동 / 사용자 선택 UI | ✅ **자동 머지 확정**. ⚠️ **SRS 는 timestamp LWW = best-effort**(동시학습 시 복습 손실 가능, §4.3 KNOWN-TRADE-OFF). 충돌 UI 는 과함 |
| D5 | **익명→계정 흡수** | (a) 자동 / (b) 안 함 / (c) **사용자 확인 후** | ✅ **(c) 확정** — 공유 기기(학교 PC) 명의오염 차단. 첫 로그인 시 "이 기기 학습기록을 내 계정에 가져올까요?" 프롬프트 후에만 흡수. blind overwrite 아니라 **머지 경유**(§5 P5) |
| D6 | **커스텀 콘텐츠 용량 한도** | 사용자당 과목/단원/카드 N개 + payload 바이트 상한 | ✅ **확정(2026-06-05)** — 카드 **2,000** / 과목 **50** / 단원 **1,000** / 카드 1장 **16KB** / 스냅샷 총 **4MB**. 이중 가드(클라 안내 + **서버 zod 거부**). 상세 §4.4 |
| D7 | **계정 삭제 시 학습 데이터** | `ON DELETE CASCADE`(users 삭제 시 전부 삭제) | ✅ **확정** — auth 스키마와 동일 패턴. 정통망법 파기 의무 정합 |
| D8 | **보존 기간** | (a) 계정 유효 동안 무기한 / (b) activity-log 처럼 retention cutoff | ✅ **확정(2026-06-05)** — **activity_log 만 14일 retention**(로컬 룰 미러). SRS·스트릭·커스텀=계정 유효 동안 무기한 |

---

## 4. 데이터 모델

### 4.1 현행 localStorage 소스 (이전 대상)

| 데이터 | localStorage 키 | 형태 | 소스 파일 |
|---|---|---|---|
| SRS 카드상태 | `pullim-games:srs:<gameId>:<cardId>` | `{ fsrsCard, reviewCount, lastReviewAt }`(직렬화) | `src/lib/core/storage/srs.ts` |
| 스트릭 | `pullim-games:streak`(단일) | `{ current, longest, lastActiveDate }` | `src/lib/core/streak/index.ts` |
| 활동 로그 | `pullim-games:activity-log:<gameId>` | `{ "YYYY-MM-DD": count }`(14일) | `src/lib/core/storage/activity-log.ts` |
| 커스텀 콘텐츠 | `pullim-games:custom:{subjects,curriculum,cards}` | 배열 | `src/lib/core/custom/storage.ts` |

### 4.2 제안 스키마 (`migrations/0002_learning_data.sql`)

> 모든 테이블 `user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE`. cross-user 노출 경로 0.

```sql
-- SRS 카드 상태. PK = (user_id, game_id, card_id). fsrsCard 는 그대로 JSONB.
-- 머지 규칙: last_review_at(또는 updated_at) 이 더 최신인 쪽 채택 (D4).
CREATE TABLE IF NOT EXISTS srs_states (
  user_id        TEXT   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id        TEXT   NOT NULL,
  card_id        TEXT   NOT NULL,
  fsrs_card      JSONB  NOT NULL,         -- SerializedState.fsrsCard
  review_count   INTEGER NOT NULL DEFAULT 0,
  last_review_at BIGINT,                  -- epoch ms, null=미리뷰
  updated_at     BIGINT NOT NULL,
  PRIMARY KEY (user_id, game_id, card_id)
);
CREATE INDEX IF NOT EXISTS idx_srs_states_user ON srs_states(user_id);

-- 스트릭. 사용자당 1행. 머지 규칙: longest=max, current/lastActive=최신일 채택.
CREATE TABLE IF NOT EXISTS streaks (
  user_id          TEXT   PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current          INTEGER NOT NULL DEFAULT 0,
  longest          INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,                  -- "YYYY-MM-DD" 로컬자정 기준
  updated_at       BIGINT NOT NULL
);

-- 활동 로그(대시보드용). ✅ 2026-06-05 R1: PK 에 fingerprint 추가 —
-- **per-device(브라우저) 절대 카운터**. 이유: count=max 머지는 다기기 같은 날
-- 학습량을 합산 못 하고 큰 쪽만 남겨 실제 활동량이 유실됨(A 3회+B 2회→3만 남음).
-- 이건 SRS 같은 근사 허용 지표가 아니라 대시보드 활동량이라 왜곡이 사용자에 직접 노출.
-- 해결: 기기별(fingerprint) 절대 카운터를 따로 저장, 대시보드 표시값 = SUM(count).
-- 각 기기는 자기 fingerprint 행에 본인 절대값을 upsert(단조 증가) → 합산 무손실·멱등.
-- D8: 14일 retention — push/머지 시 cutoff(now-14d) 이전 행 purge. SRS·스트릭·커스텀은 무기한.
CREATE TABLE IF NOT EXISTS activity_log (
  user_id     TEXT   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id     TEXT   NOT NULL,
  date        TEXT   NOT NULL,            -- "YYYY-MM-DD"
  fingerprint TEXT   NOT NULL,            -- per-device 카운터 키(브라우저)
  count       INTEGER NOT NULL,           -- 이 기기의 해당 날짜 절대 활동 수
  PRIMARY KEY (user_id, game_id, date, fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
-- 대시보드 조회: SELECT date, SUM(count) ... WHERE user_id=$1 GROUP BY date.

-- 커스텀 콘텐츠. ✅ 2026-06-05: per-row 가 아니라 **사용자당 컬렉션 스냅샷**.
-- 이유: per-row + updated_at 머지는 "삭제"가 다기기로 전파 안 됨(타 기기에 남은
-- 행이 부활). tombstone 도입 대신 전체 컬렉션을 한 스냅샷으로 POST → 삭제가 자연히
-- 반영(스냅샷에서 빠지면 끝). 커스텀은 사용자당 소량·소유라 통짜 교체가 단순·정확.
-- snapshot = { subjects:[], curriculum:[], cards:[] } 원 JSON 그대로.
CREATE TABLE IF NOT EXISTS custom_content (
  user_id    TEXT   PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  snapshot   JSONB  NOT NULL,             -- {subjects, curriculum, cards}
  updated_at BIGINT NOT NULL              -- 컬렉션 단위 LWW (최신 스냅샷이 이김)
);
```

### 4.3 머지 규칙 (자동 머지)

- **SRS**: 같은 `(game_id, card_id)` 충돌 시 `last_review_at`(없으면 `updated_at`) 더 큰 쪽 채택.
  > ⚠️ **KNOWN-TRADE-OFF (2026-06-05 eng-review): timestamp Last-Write-Wins 는 FSRS 를 정확히 머지하지 못한다.** FSRS 상태는 *복습 이력의 함수*지 timestamp 스냅샷이 아니다. 두 기기가 같은 카드를 각자 오프라인 복습하면, "더 늦은 복습"의 상태만 남고 다른 기기의 복습은 사라진다(게다가 stale base 에서 계산된 값). 즉 다기기 동시 학습 시 **복습 1회 손실·스케줄 약간 어긋남이 발생할 수 있다.** K-12 = 계정당 학습자 보통 1명이라 동시 다기기 충돌 빈도가 낮아 수용. 정확한 머지가 필요해지면 후속 phase 에서 **복습 이벤트 로그 리플레이**(이벤트 소싱 — 복습 이벤트를 append-only 로 적재 후 시간순 재계산)로 승격. 근거 plan: 본 문서.
- **스트릭**: `longest = max(local, server)`, `(current, last_active_date)` 는 `last_active_date` 더 최신인 쪽. 같은 날이면 `current = max`. **best-effort**(연속성 복원은 근사 — 스트릭은 하이퍼캐주얼 비경쟁 지표라 손실 허용).
- **활동 로그**: ✅ **per-device(fingerprint) 절대 카운터**(R1 수정). 같은 `(game_id, date, fingerprint)` 는 본인 기기의 최신 절대값으로 upsert(단조 증가). **대시보드 표시값 = `SUM(count)` (user×date 합산)** → 다기기 같은 날 학습량이 손실 없이 합산. `max` 머지(다른 기기 카운트 유실) 폐기.
- **커스텀**: ✅ **컬렉션 스냅샷 전량 교체** — `updated_at` 더 최신인 스냅샷이 통째로 이김. 삭제는 스냅샷에서 빠지는 것으로 자연 전파(tombstone 불필요). 트레이드오프: 다기기 동시 편집 시 스냅샷 단위 LWW(마지막 저장이 통짜로 이김, 항목 단위 병합 없음) — 커스텀은 단일 사용자 편집이 일반적이라 수용.

### 4.4 커스텀 콘텐츠 용량 한도 (D6 확정 — 2026-06-05)

스냅샷 교체(§4.3)는 변경마다 컬렉션 전체를 POST 하므로, 한도는 **업로드가 무거워지지 않을 크기** + **DB 비대화 방지** 두 목적. 자연 천장: 커스텀은 이미 localStorage(오리진당 ~5MB, SRS·스트릭과 공유)에 살아 물리적으로 몇 MB를 못 넘음 → 서버 한도를 이 현실에 맞춤.

| 항목 | 한도 | 근거 |
|---|---|---|
| 카드 | **2,000 / 사용자** | 카드 1~2KB × 2,000 ≈ 2~4MB ≈ localStorage 천장. 실제 학생은 수십~수백 장이라 넉넉 |
| 과목 | **50** | 학생당 5~10과목 + 헤드룸 |
| 단원(트리) | **1,000** | 과목 50 × 단원 ~20 |
| 카드 1장 payload | **16KB** | 정상 카드 <2KB. blank passage·word-match 8쌍 최대도 여유. **남용 방어선** |
| 스냅샷 총량 | **4MB** | 서버 거부선. 스냅샷 POST 비대화 차단 |

**적용**: 이중 가드 —
1. **클라**: 저장 직전 카운트 초과 시 "한도 도달" 안내(저장 차단). UX 친화.
2. **서버(진짜 가드)**: `/api/sync` POST 의 zod 스키마가 배열 길이·payload 바이트·스냅샷 총 바이트 검증 → 초과 시 413/422 거부. 클라 우회 불가. 스냅샷 모델이라 카운트 검증이 단순(배열 길이만 잼).

---

## 5. 개발 단계

| Phase | 내용 | 산출물 |
|---|---|---|
| P0 | (선결) D1 spec 합의 + D6~D8 결정 확정 | spec §5.2·§5.5·§5.6 개정 커밋 |
| P1 | DB 마이그레이션 | `migrations/0002_learning_data.sql` (4 테이블: srs_states·streaks·activity_log·custom_content) |
| P2 | 서버 모듈 + 순수 머지 | `src/lib/server/learning/{srs,streak,activity,custom}.ts`. **머지는 순수 함수로 분리**(`mergeSrs`·`mergeStreak`·`mergeActivity`·`replaceCustomSnapshot`) → 단위테스트 100% 대상 |
| P3 | 동기화 API | `src/app/api/sync/route.ts` — **GET=증분 pull**(전체 아님), **POST=push 배치 델타(커스텀은 스냅샷 전량 포함)**. 단일 메서드 계약(PUT 미사용). zod 검증 + **401 인증 게이트**. 모든 쿼리 `WHERE user_id=me.id`(cross-user 0). 🔒 **CSRF 가드 필수**(POST): auth/logout/billing 동형의 same-origin(Origin/Referer) + double-submit CSRF 토큰(SameSite=Strict). 미적용 시 외부 사이트가 학습 상태 주입(Codex #116 R1). **증분 pull 계약(R1)**: 클라가 리소스별 `since`(마지막 동기화 `updated_at`)를 보내고 서버는 **변경분만** 반환 — SRS=since 이후 변경 카드만, 커스텀 스냅샷=`updated_at` 미변경 시 304/빈응답(4MB 매번 다운로드 금지), 스트릭/activity=since 이후만. 리소스별 분리 응답이라 게임 오갈 때 대용량 반복 다운로드 없음 |
| P4 | **클라 동기화 엔진(DRY)** | ✅ 단일 `src/lib/sync/engine.ts` — dirty 추적·**배치 debounce flush**(N초/세션종료/`visibilitychange`)·재시도·auth게이트·오프라인 폴백을 **한 곳**에. 리소스별 어댑터(머지fn+직렬화)만 4개. 4x 복붙 금지. **pull 은 로그인/세션 시작 시 1회 증분(`since`)** — 게임 전환마다 X(반복 대용량 다운로드 방지, R1). 이후 게임 시작은 **로컬 캐시만으로 즉시 렌더**. **read-through=비동기**: localStorage 즉시 서빙 → (세션 첫 진입만) 백그라운드 증분 fetch+머지 → 재렌더(블록·스피너 금지). **비로그인 경로 무변화 보장** |
| P5 | 익명→계정 흡수(확인 후) | 첫 로그인 시 로컬 데이터 있으면 **확인 프롬프트**(D5=c) → 동의 시에만 업로드. **blind upsert 아니라 머지 경유**(타 기기서 먼저 쌓인 서버 상태를 오래된 로컬이 덮지 않게). 멱등(`ON CONFLICT`+머지) |
| P6 | 미성년·보존 | D7 CASCADE 확인, D8 보존정책, 계정삭제 시 4테이블 파기 동작 |
| P7 | 테스트·검증 | §6 |

> P4 는 기존 소스(`srs.ts`·`streak/index.ts`·`custom/storage.ts`)를 **수정**하므로 **games FREEZE 해제·다른 세션 충돌 점검 필수**. 별 worktree(base main)에서 작업. 기존 localStorage 키·직렬화 형식은 하위호환 유지(기존 익명 데이터가 그대로 읽혀야 함).

### P4 데이터 흐름 (read-through — 블록 금지, pull은 세션 1회 증분)

```
세션/로그인 시작 (게임 전환마다 X — 1회만)
   │
   └─▶ (로그인 상태면) 백그라운드 GET /api/sync?since=<리소스별 마지막 updated_at>
                │
                ▼   서버는 변경분만 반환(SRS 변경카드 / 커스텀 미변경시 304 / 스트릭·activity since 이후)
        mergeSrs/Streak/Activity(SUM) + replaceCustomSnapshot
                │
                ▼
        병합 결과 localStorage 반영 + 조용히 재렌더
        (비로그인이면 이 가지 전체 skip → 네트워크 0)

게임 시작 (매번)
   │
   └─▶ localStorage 즉시 로드 ──▶ 즉시 렌더(기존과 동일, 0ms 대기, 네트워크 0)

쓰기(복습/커스텀 변경)
   │
   ├─▶ localStorage 즉시 기록(기존과 동일)
   └─▶ engine.markDirty(key) ─▶ debounce ─▶ 배치 POST /api/sync
                                              (오프라인이면 큐 보관, 온라인 복귀 시 flush)
```

---

## 6. 테스트·검증

### 커버리지 목표 (구현과 동시 작성 — 후속 미룸 금지)

```
서버 머지(순수→단위 100%)                사용자 플로우
[+] mergeSrs        local만/server만/충돌/tie-break   [+] 다기기 복구  [→E2E]
[+] mergeStreak     max(longest)+최신일/동일날        [+] 흡수 동의/거부 [→E2E]
[+] mergeActivity   per-device SUM(다기기 합산 무손실)  [+] 오프라인→온라인 flush
[+] 증분 pull       since 이후만/커스텀 304/세션1회      [+] 게임전환 시 추가 pull 0
[+] replaceCustomSnapshot  최신 스냅샷 이김/삭제 전파
[+] engine          dirty·배치 flush·재시도·auth게이트·오프라인 큐
                                                      [+] 회귀(최우선)
[CRITICAL 회귀] 비로그인 = /api/sync 호출 0, localStorage만
```

- **단위**: 위 4 머지 함수 각 케이스 전수(로컬만/서버만/양쪽충돌/동률). SRS due 최신성, 커스텀 삭제 전파(스냅샷에서 빠지면 서버서도 사라짐).
- **흡수 머지 경유**: 서버에 신규 상태가 있을 때 오래된 로컬 흡수가 **덮어쓰지 않음**(blind overwrite 회귀 가드).
- **멱등(idempotent = 여러 번 실행해도 결과 동일)**: 동일 흡수/flush 2회 실행 시 중복·손상 0.
- **격리**: user A 로 user B 데이터 접근 불가 — 모든 쿼리 `WHERE user_id`. **cross-user 노출 0 회귀 테스트**(하이퍼캐주얼 §0 경계 강제).
- **🔴 CRITICAL 회귀(IRON RULE)**: **비로그인 플레이 시 `/api/sync` 호출 0, localStorage만 사용.** 비로그인이 games 기본 경험 — 이 동기화가 익명 플로우를 깨뜨리지 않음을 증명. 깨지면 전체 회귀.
- **read-through 비블록**: 게임 시작이 서버 응답을 기다리지 않음(로딩 스피너 0). 동기 localStorage 렌더 후 백그라운드 머지.
- **활동량 합산 무손실**: 다기기 같은 날 학습(A 3회+B 2회) → 대시보드 5회(SUM). max 머지 유실 회귀 가드.
- **증분 pull 비용**: 세션 1회 pull + 게임 전환 시 추가 GET 0. 커스텀 미변경 시 304(4MB 재다운로드 0).
- **다기기 E2E**: 기기1 학습 → 기기2 로그인 → 진도 복구(Playwright, 2 컨텍스트).
- **CASCADE(연쇄 삭제)**: 계정 삭제 시 4 테이블 전부 파기.

---

## 7. 리스크

| 리스크 | 완화 |
|---|---|
| 하이퍼캐주얼 룰 침범(랭킹/비교로 변질) | §0 경계 — cross-user 쿼리 금지, 리뷰 게이트 + 격리 회귀 테스트로 강제 |
| **SRS 다기기 동시학습 시 복습 손실**(LWW 한계) | §4.3 KNOWN-TRADE-OFF 수용(계정당 1학습자). 필요시 이벤트 리플레이로 승격 |
| **공유 기기(학교 PC) 명의오염** — 익명 데이터가 남 계정에 흡수 | ✅ D5=(c) 확인 후 흡수. 자동 흡수 금지. 실DB 명의격리 보존 |
| **쓰기 증폭**(카드별 POST 폭주) | ✅ P4 배치 debounce flush(세션종료/visibilitychange), 단건 호출 금지 |
| **게임 시작 지연**(서버 read-through 블록) | ✅ P4 비동기 read-through — localStorage 즉시 서빙, 스피너 0 |
| **반복 대용량 pull**(게임 전환마다 4MB 다운로드) | ✅ R1: 증분 pull(`since`) + 세션 1회 + 커스텀 304. 게임 전환 추가 GET 0 |
| **활동량 유실**(다기기 같은 날 max 머지) | ✅ R1: per-device(fingerprint) 절대 카운터 + 서버 SUM. 합산 무손실 |
| 흡수가 서버 신규 상태 덮어씀 | ✅ P5 머지 경유(blind upsert 금지) + 회귀 테스트 |
| 학습 행동 데이터 서버화로 PII 표면 확대 | §0 §5.6 개정 — 항목·보존·파기 명시, CASCADE, 계정 사용자 한정 |
| 커스텀 콘텐츠 DB 비대화 | D6 용량 한도 + payload 바이트 상한(스냅샷 크기 가드 포함) |
| FREEZE·다른 세션 소스 충돌(P4) | 별 worktree(base main), FREEZE 해제 합의 후 진입, 기존 키/형식 하위호환 |
| spec 권위 임의 우회 | §0 거버넌스 — G1 합의 없이 spec/코드 진입 금지 |

---

## 8. 차단 사유 (현재)

- ~~**D1 spec 합의**~~ — ✅ G1 승인(2026-06-05). **P0 완료**: 본 커밋에서 spec §5.2·§5.3(CardState)·§5.5·§5.6 개정 적용(계정 사용자 한정 학습 데이터 Postgres 영속, activity_log 14일, 익명/게스트 무변화).
- **남은 차단 = games FREEZE** — P1~P7 구현 진입은 FREEZE 해제 + 다른 세션 충돌 점검 후. 본 브랜치(`feat/learning-data-server-sync`, base main)는 **P0(spec+plan)만** 포함.

---

## 9. Eng-Review 산출물 (2026-06-05)

### 9.1 이미 존재하는 것 (재사용 — 새로 안 만듦)

| 기존 자산 | 본 plan 재사용 |
|---|---|
| `fingerprint_links`(auth) | 흡수 토대. 단 흡수는 fingerprint 가 아니라 **로그인 user 기준 + 확인 프롬프트**(D5) |
| `src/lib/server/db/client.ts` Pool + 마이그레이션 러너 | `0002_*.sql` 그대로 올림. 새 DB 인프라 0 |
| auth 세션·`getCurrentUser` + same-origin/CSRF 가드(auth·billing 라우트 패턴) | `/api/sync` 의 401 인증 게이트 + POST CSRF 보호에 재사용(새 보안 로직 0) |
| `/api/event` 흡수/이벤트 적재 패턴(리포 내부) | 흡수·이벤트-리플레이 설계 시 games 자체 기존 패턴 활용. **타 풀림 프로젝트 코드 참조 금지**(독립 프로젝트 원칙, CLAUDE.md §4·§7) |
| 기존 localStorage 모듈(srs/streak/activity/custom) | 키·직렬화 형식 유지, 동기화 훅만 추가. 병렬 저장소 신설 X |

### 9.2 NOT in scope (의도적 보류)

- 랭킹·점수·재화 — §0 영구 금지.
- 실시간 동기화(websocket/CRDT) — 본 phase 는 로그인 pull + 배치 push.
- SRS 이벤트-리플레이 정확 머지 — LWW 한계가 실제 문제화되면 후속 phase 승격.
- LLM quota 서버 강제 — 클라 가드 유지.
- 커스텀 콘텐츠 공유/마켓플레이스 — 별 plan.
- 커스텀 항목 단위 다기기 병합 — 스냅샷 LWW 로 단순화(§4.3).

### 9.3 실패 모드 (프로덕션)

| 신규 코드패스 | 현실적 실패 | 테스트 | 에러처리 | 사용자 체감 |
|---|---|---|---|---|
| `/api/sync` POST flush | 네트워크 타임아웃 | ✅ 오프라인 큐 테스트 | ✅ 큐 보관·재시도 | 조용히 나중에 동기화(로컬은 이미 저장) |
| read-through GET 머지 | 서버 5xx | ✅ | ✅ 로컬 폴백 | 무변화(로컬 그대로 플레이) |
| 흡수 머지 | 서버 신규 상태 존재 | ✅ blind-overwrite 회귀 | ✅ 머지 경유 | 손실 0 |
| 비로그인 경로 | 동기화 코드가 익명에 누수 | 🔴 CRITICAL 회귀 | ✅ auth 게이트 | **반드시 무변화** |
| SRS 동시 다기기 | LWW 복습 손실 | ✅ 손실 케이스 명시 | △ 수용된 한계 | 드물게 복습 1회 유실(조용함) → **KNOWN-TRADE-OFF** |

> **critical gap 점검**: "무테스트 + 무에러처리 + 조용한 실패" 조합은 없음. SRS LWW 손실만 조용하지만 테스트로 명시·문서화된 수용 한계라 critical 아님.

### 9.4 Worktree 병렬화 전략

| 단계 | 모듈 | 의존 |
|---|---|---|
| P1 마이그레이션 | `migrations/` | — |
| P2 서버 머지 | `lib/server/learning/` | P1 |
| P3 API | `app/api/sync/` | P2 |
| P4 클라 엔진 | `lib/sync/`, `lib/core/storage/`, `streak/`, `custom/` | P3 |
| P5 흡수 | `lib/sync/`, `components/auth/` | P4 |

- **Lane A**: P1→P2→P3→P4→P5 (대부분 순차 — P4 가 P3 API 계약에 의존, P5 가 P4 엔진에 의존).
- 병렬 여지 작음: 서버 체인이 클라 체인을 막는다. **사실상 순차 구현.** 단 P2 의 4개 순수 머지 함수 + 테스트는 서로 독립이라 4 워크트리로 분할 가능(`mergeSrs`/`mergeStreak`/`mergeActivity`/`replaceCustomSnapshot` 각각).
- 충돌 플래그: P4·P5 둘 다 `lib/sync/` 터치 → 순차 권장.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — (codex 미설치) | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | issues_open | 3 forks 해소, 1 critical 회귀 정의 |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **UNRESOLVED:** D1(spec 승인)만 — G1 대기. D2~D8 전부 확정.
- **VERDICT:** ENG REVIEW 통과(구조·테스트·용량·보존 확정). **spec 합의(D1)만 받으면 구현 진입 가능.**
