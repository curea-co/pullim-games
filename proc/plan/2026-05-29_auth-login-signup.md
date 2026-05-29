# 2026-05-29 — 로그인/회원가입 도입 plan (games)

**작성자**: 컨트롤타워 AI (2차) — 사용자(PM/G1) 지시
**상태**: **PROPOSAL — 권위 spec 변경 합의 + DB 자격증명 대기. 구현 보류.**
**브랜치**: `feat/auth-login-signup` (worktree `/private/tmp/pullim-games-auth`, base `main` 719d2b0)

---

## 0. 권위 충돌 — 반드시 먼저 합의 (거버넌스 경로)

이 작업은 **games의 권위 spec과 정면 배치**된다. `proc/spec/01~10`이 권위 문서이고, 변경은 [CLAUDE.md §4]·§9 + `proc/spec/01 §2 명세 우선 원칙`에 따라 **① 별 plan(본 문서) → ② 사용자(G1) 합의 → ③ spec 수정 → ④ 코드** 순서를 강제한다 (임의 spec 우회 금지 = "검사관 매수 금지").

충돌 항목:

| spec 위치 | 현행 문구 | 본 plan 제안 |
|---|---|---|
| `05-비즈니스-정책.md §5.2` | "**V1 = 비로그인. 로그인/회원가입 화면 V1에 없음**" | 로그인/회원가입 도입 → §5.2를 **V1 비로그인 우선 + 선택적 계정** 정책으로 개정 |
| `05-비즈니스-정책.md §5.6` | "**수집 항목 0개. 이름·이메일·전화·학교·학년 수집 X**" | 계정 도입 시 **이메일 수집·저장** 발생 → PII-0 정책 개정 (계정 사용자 한정) |
| `05-비즈니스-정책.md §5.6` | "만 14세 미만: V1 비로그인이라 정통망법 적용 안 됨. **로그인 도입 시 재검토**" | 로그인 도입 = 정통망법 적용 트리거 → 미성년 보호 절차 신설 |
| `09-기술-환경.md §9.2.2` | Magic link / SSO를 **V2 검토**로만 기재 | 계정 인증을 V1.x로 승격 |

> ⚠️ 본 문서는 spec을 **수정하지 않는다.** spec 개정은 G1 합의 후 별도 커밋. 본 문서는 그 합의를 위한 제안서.

---

## 1. 목표

games에 **로그인/회원가입(계정)**을 도입해, 익명 fingerprint에 묶여 silent loss 되던 학습 데이터(SRS 진척·스트릭·커스텀 콘텐츠)를 계정에 귀속시켜 보존·다기기 동기화한다. **games·games-arcade = 완전 독립 계정**(2026-05-29 사용자 결정)이므로 풀림 플랫폼 통합 유저 테이블을 쓰지 않고 **games 자체 계정 시스템**을 구축한다.

**완료 기준**
- games 자체 Supabase(Postgres) + `users`/`auth_sessions` 테이블 + 마이그레이션 러너
- 이메일+비밀번호 회원가입·로그인·로그아웃 동작
- 익명 fingerprint → 계정 연결(로그인 시 기존 localStorage 학습 데이터 흡수)
- 비로그인 플레이는 그대로 유지(계정은 선택) — spec의 "무마찰 진입" 원칙 보존
- spec/05 §5.2·§5.6 개정 반영(G1 합의 후)

---

## 2. 비목표 (Scope Out)

- 소셜 로그인(카카오/구글) — 추후
- 풀림 SSO federation — 독립 계정 결정에 따라 본 plan 범위 밖
- 랭킹·점수·재화·뱃지 — **설계상 영구 금지**(AGENTS.md 하이퍼캐주얼 룰). 계정 도입과 무관하게 추가 안 함
- 결제/구독 — 별 plan

---

## 3. 사용자 결정 필요 사안 (G1 보고)

| # | 사안 | 선택지 | 비고 |
|---|---|---|---|
| D1 | **spec 개정 승인** | 승인 / 보류 | §0 충돌. 승인해야 §5.2·§5.6 수정·구현 진입 |
| D2 | **games Supabase 프로젝트** | (a) 신규 프로젝트 생성 / (b) arcade 프로젝트 재사용(독립 결정과 충돌) | DATABASE_URL 자격증명 필요. **사용자 제공 필수 — AI가 인프라 생성 불가** |
| D3 | **인증 방식** | (a) 이메일+비밀번호(arcade와 동형) / (b) 매직링크(PII 최소·spec V2안) / (c) 둘 다 | "회원가입"이면 (a) 자연스러움. 단 spec의 PII 최소 정신은 (b)가 부합 |
| D4 | **익명 데이터 마이그레이션** | 로그인 시 1회 업로드 흡수 / 안 함 | fingerprint→user_id 연결 |
| D5 | **미성년 보호 범위** | 가입 시 생년/학년 수집 + 만14세 동의 / 익명 유지로 회피 | 로그인 도입 시 정통망법 트리거 (spec §5.6) |
| D6 | **계정 강제 여부** | 선택(비로그인 유지) / 특정 기능만 로그인 게이트 | spec의 무마찰 진입 원칙 보존 권고 = 선택 |
| D-ENUM | **signup 이메일 열거** | (a) 409 email_taken 유지 + rate-limit 완화(현재) / (b) generic 응답 + 이메일 검증 | 코덱스 라운드3 지적. 완전 차단은 이메일 발송 인프라(후속 phase) 필요 → 현재 (a) 수용(KNOWN-TRADE-OFF), 이메일 검증 phase 시 (b) 전환 |

**권고 기본값**: D1 승인 / D2 신규 프로젝트 / D3 이메일+비밀번호(arcade 검증된 패턴 재사용) / D4 흡수 / D5 가입 시 학년+만14세 동의 / D6 선택(비로그인 유지).

---

## 4. DB 토폴로지 — arcade 패턴 미러

games는 DB·서버스택이 전무하므로, **arcade의 검증된 패턴을 템플릿으로** 신설한다 (arcade `proc/research/2026-05-27_인증-1차구현.md`·`migrations/0001_init.sql` 참조 — 코드 복사가 아닌 구조 차용, 독립 레포 룰 준수).

- prod DB: **games 전용 Supabase**(신규 프로젝트, D2)
- 클라이언트: `pg` (node-postgres) Pool 싱글톤
- 마이그레이션: **raw SQL 파일 + 시작 시 적용 러너**(`schema_migrations` 추적) — 도구 미도입
- dev DB: docker-compose Postgres 16, **호스트 포트 5436**(5432=본체/5433=Q/5434=classbot/5435=arcade 점유 → 충돌 회피)
- 세션: opaque 토큰 + HttpOnly 쿠키(JWT 미사용, arcade 동형)

### 제안 스키마 (최소)

```sql
-- users: 의도적으로 얇게 (PII 최소·랭킹/재화 금지 유지)
users (
  id             TEXT PRIMARY KEY,        -- randomUUID
  email          TEXT NOT NULL UNIQUE,    -- 소문자 정규화
  password_hash  TEXT NOT NULL,           -- bcryptjs cost 12 (D3=a) / magic면 NULL 허용
  created_at     BIGINT NOT NULL,         -- Unix ms
  updated_at     BIGINT NOT NULL,
  last_seen_at   BIGINT                   -- 리텐션 신호
)

auth_sessions (
  token       TEXT PRIMARY KEY,           -- randomBytes(32).hex
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  BIGINT NOT NULL,
  expires_at  BIGINT NOT NULL             -- now + 7d
)

-- 익명→계정 연결 (D4)
fingerprint_links (
  fingerprint TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_at   BIGINT NOT NULL
)
```

> 학습 데이터(SRS·스트릭·커스텀)의 서버 영속은 **본 plan 범위에서 분리** — 우선 계정+연결만. 서버 동기화는 후속 phase/별 plan (localStorage 우선 유지).

---

## 5. 개발 단계

| Phase | 내용 | 산출물 |
|---|---|---|
| P0 | (선결) D1 spec 합의 + D2 Supabase 자격증명 확보 | spec §5.2·§5.6 개정 커밋 |
| P1 | DB 인프라 | `pg` deps, docker-compose(5436), `src/lib/server/db/client.ts`(Pool+마이그레이션 러너), `migrations/0001_init.sql`, `.env.example` |
| P2 | 서버 인증 | `src/lib/server/auth/{password,session,users}.ts` (해시·세션·CRUD) |
| P3 | API 라우트 | `src/app/api/auth/{signup,login,logout}/route.ts` + zod 검증 |
| P4 | 클라이언트 | 로그인/회원가입 UI(4 viewport audit 의무), `src/lib/auth/client.ts`, 셸 진입점 |
| P5 | 익명 연결 | 로그인 시 fingerprint→user 연결 + (선택) 데이터 흡수 |
| P6 | 미성년 보호 | D5에 따라 가입 폼 + 동의 |

---

## 6. 테스트·검증

- 단위: vitest (password 해시·세션 만료·zod 스키마)
- e2e: playwright (가입→로그인→로그아웃→재로그인, 익명 연결)
- UI: 로그인/회원가입 화면 **4 viewport audit**(320/390/768/1280) 머지 전 의무 (CONVENTION §8)
- 정적: `bunx tsc --noEmit && bun run lint`

---

## 7. 리스크

| 리스크 | 완화 |
|---|---|
| spec 권위 충돌 임의 우회 | §0 거버넌스 경로 — G1 합의 없이 spec/코드 진입 금지 |
| 무마찰 진입 훼손(가입 강요로 이탈) | D6 = 비로그인 유지, 계정은 선택 |
| 미성년 개인정보(정통망법) | D5 만14세 동의 절차 |
| 독립 레포 룰 위반(arcade 코드 직접 참조) | 패턴만 차용, import 금지 |
| 더러운 curriculum WIP와 충돌 | 별 worktree(`feat/auth-login-signup`, base main)에서 작업 |

---

## 8. 현재 차단 (구현 진입 불가 사유)

1. **D1 미합의** — 권위 spec 변경 승인 전까지 코드 진입 금지(거버넌스).
2. **D2 미확보** — games Supabase 프로젝트·DATABASE_URL 없음. AI가 인프라 생성 불가 → 사용자 제공 필요.

→ 위 둘 해소 시 P1부터 즉시 진행.
