# P-B 회원 재연결 소비 — `/games/me` `emailMatchHash` lazy 재연결

> ⏸️ **보류(DEFERRED) — 2026-07-08.** pullim-api 가 `/games/me` 의 `emailMatchHash` 를 **revert**(pullim-api PR #373)했다. 따라서 이 소비 코드(#149: `pullim-relink.ts`·`pullim-member.ts` relink 경로·introspect·마이그레이션 0005/0006)는 **영구 dormant/inert** 상태다 — API 가 `emailMatchHash` 를 안 주므로 재연결이 발동하지 않는다(introspect 가 옵션 필드로 fail-soft 처리 → null → no-op). games 회원 데이터 자체가 아직 미라이브(`PULLIM_MEMBER_DATA_ENABLED=off`)라 pullim-Q 선례처럼 **fresh-start·보류**로 정렬했다(핸드오프 `2026-07-07_...member-relink-P-B.md` = 철회). **이 코드는 의도적으로 파킹된 것이며 dead-path 결함이 아니다** — 제거(A1) 대신 보존(A2) 결정. games 실회원 go-live 시 재판단(그때 정말 필요하면 pullim-api emailMatchHash 부활 또는 대안 설계).

## 목표

pullim-api가 회신한 P-B 계약(`GET /games/me` 의 `emailMatchHash`)을 games 가 소비해,
**기존 legacy email 회원이 SSO 로그인하는 순간 옛 학습데이터·grade·fingerprint 를 새 `sub`
projection row 로 1:1 재연결**한다. `GAMES_EMAIL_MATCH_PEPPER` 미주입 시 `emailMatchHash:null`
→ 재연결 **dormant**(에러 아님). P-C(삭제 파기)·service key 프로비저닝은 **본 계획 범위 밖**(다음 단계).

**완료 기준**: legacy email 회원 SSO 로그인 → 옛 진도·스트릭·커스텀·grade 가 새 sub 세션에서 그대로 보임.
다중 매칭·불일치는 자동 흡수 0(보류). 재실행 무해(멱등). salt 미주입 환경에선 dormant(회귀 없음).

## 배경 · 근거

- 회신 핸드오프: `proc/plan/2026-07-07_HANDOFF-pullim-api-games-member-relink-P-B.md`
- 원 요청: `proc/plan/2026-07-07_HANDOFF-pullim-api-games-member-relink-purge.md §P-B` (옵션 B-1 채택)
- 상위 plan: `proc/plan/2026-07-03_games-unified-login-os-delegation.md §2-D`
- spec: `05 §5.2/§5.6`(silent auto-merge 금지·PII 분리), `09 §9.3`(키 모델: 저장 키 `users.id`, `sub`=매핑 컬럼)

### 현재 코드 상태 (조사 결과)

- legacy 회원 데이터는 `users`(email NOT NULL, sub NULL) row + `user_id` CASCADE 자식들에 잔존 — **재해시 가능**(평문 email 보유).
- SSO 로그인 시 `ensurePullimMember(sub)`(`lib/server/auth/pullim-member.ts:37`)가 **새 sub row 만 생성** — 옛 데이터 이어붙이는 로직 **없음**(= P-B 공백).
- `/games/me` 소비(`lib/server/auth/pullim-introspect.ts:45`, `lib/auth/client.ts:226`)는 `sub`·`displayName` 만 매핑 — **`emailMatchHash` 미소비**.
- 재연결 대상 테이블(전부 `users(id) ON DELETE CASCADE`): `fingerprint_links`·`auth_sessions`(0001), `srs_states`·`streaks`·`activity_log`·`custom_content`(0002). grade 는 `users` row 자체 컬럼.
- DB: `pg.Pool` 직접(ORM 無), 커스텀 마이그레이션 러너(`migrations/*.sql` 알파벳순 + `schema_migrations`), advisory lock. crypto: `node:crypto` 사용 중.

## 해시 계약 (바이트 일치 — 핸드오프 §1)

```
emailMatchHash = hex_lower( HMAC_SHA256( key = GAMES_EMAIL_MATCH_PEPPER, msg = email.trim().toLowerCase() ) )
```
- 테스트 벡터: salt=`"pb-test-salt"`, email=`"  User@Example.COM "` → `d1bbcc480bd202e0abc38c0d2119fbce944b42bb7e014fe1cd22d2ef4ac63ebb`
- gmail dot/plus 등 provider 정규화 **미적용**(trim+toLowerCase 만).

## 작업 항목

### A. 마이그레이션 0005 — legacy 재연결 인덱스
- [x] `migrations/0005_email_match_hash.sql`: `users` 에 `email_match_hash TEXT` 컬럼 추가(nullable)
- [x] 부분 인덱스 `CREATE INDEX ... ON users(email_match_hash) WHERE email_match_hash IS NOT NULL` (재연결 조회 O(1))
- [x] 재실행 안전(IF NOT EXISTS / pg_constraint 가드 패턴 0004 답습)

### B. 해시 유틸 + pepper 로딩
- [x] `lib/server/auth/email-match-hash.ts`: `emailMatchHash(email, pepper)` 순수 함수(HMAC-SHA256 hex) + 단위테스트로 테스트 벡터 고정
- [x] `GAMES_EMAIL_MATCH_PEPPER` env 로딩 헬퍼(`getEmailMatchPepper(): string | null`) — 미설정 시 `null`(dormant 신호)
- [x] `.env.example` 에 `GAMES_EMAIL_MATCH_PEPPER` 문서화(실값 커밋 금지, 사람 게이트 주석)

### C. legacy `email_match_hash` 백필 (dormant-safe)
- [x] pepper 존재 시 legacy row(email NOT NULL, email_match_hash NULL)를 §해시로 채우는 idempotent 백필
- [x] pepper 미주입이면 skip(백필 자체가 dormant) — 앱 부팅·기존 흐름 무영향
- [x] 대량 회원 대비 배치 처리(전체 스캔 1회, 이후 신규 legacy 없음 — 마이그레이션 이후 legacy 생성 경로 없음 확인)

### D. `/games/me` `emailMatchHash` 소비
- [x] `pullim-introspect.ts` 응답 파싱에 `emailMatchHash: string | null` 추가
- [x] 소비 경계 타입(`AuthUser`/introspect 결과)에 전달 — email 원문 아님(해시만)

### E. 로그인 시점 lazy 1:1 재연결 (핵심)
- [x] `ensurePullimMember` 경로(또는 SSO 로그인 트랜잭션)에서, sub row 최초 생성 시 `emailMatchHash` 로 legacy row 조회
- [x] **1:1 매칭만 자동**: 정확히 1개 legacy row 매칭 시에만 이관. 0개=신규(스킵), 2개+=충돌(보류+감사로그, 자동 흡수 금지)
- [x] 이관: `user_id` 자식들(`fingerprint_links`·`srs_states`·`streaks`·`activity_log`·`custom_content`)을 legacy id → sub id 로 재지정. PK 충돌 시 LWW(`updated_at` max) 머지
- [x] grade: sub row 가 grade 없으면 legacy grade 승계
- [x] legacy row 파기(tombstone/DELETE) — 이관 완료 후. 전 과정 **단일 트랜잭션 + 멱등**(재실행 시 legacy 이미 없으면 no-op)
- [x] **감사 로그**: 재연결 성사/보류(다중·불일치)를 구조화 로그로 기록(§5.2 silent 금지)
- [x] `emailMatchHash: null`(pepper 미주입/게스트/무email) → 재연결 스킵(dormant 폴백)

### F. 검증
- [x] 단위: 해시 테스트 벡터 `d1bb…ebb` 재현
- [x] 통합: legacy email 회원 SSO 로그인 → 옛 진도·커스텀·grade 새 sub 에서 노출
- [x] 안전: 다중/불일치 매칭 시 흡수 0(보류)
- [x] 멱등: 같은 로그인 재실행·중복 시 데이터 중복·손상 0
- [x] fail-soft: pepper 미주입 → `emailMatchHash:null` → dormant(에러·회귀 없음)
- [x] `bun run typecheck && bun run lint && bun test`

## G. Codex #149 리뷰 반영 (2차)

- [x] **dormant 영구 스킵 회귀 fix**: `created` 게이트 → `relink_resolved_at`(종결 상태) 게이트(마이그레이션 0006). pepper 미주입(dormant)·다중매칭(ambiguous)은 미종결 유지 → 다음 진입 재시도. linked·no_match 만 종결.
- [x] **전 outcome 감사 로그**: linked·no_match·ambiguous·dormant 모두 구조화 로그(운영 추적성).
- [x] **grade 승계 정규화**: `isGrade` 통과값만 승계(범위 밖 legacy grade 잔존 방지).
- [x] **전용 로그인 트리거**(설계 결정 — 사용자 승인): `POST /api/pullim/session-init`(same-origin+CSRF)를 GradePrompt 가 모달 판정 전 호출 → 로그인 직후 확정 재연결. legacy 회원이 옛 grade 복원받아 모달 오탐·dismiss 지연 제거. #146 GET=읽기전용 계약 유지(물질화는 POST 만).
- [x] **백필 요청경로 분리**: `ensureLegacyBackfillOnce`(프로세스당 1회 자체 트랜잭션 커밋) + `sub IS NULL` 정밀 타겟 → grade/session 저장 요청이 O(N) 쓰기 안 떠안음.

## 범위 밖 (다음 단계)

- **P-C(중앙 삭제 파기 전파)**: `GET /account/deletions` poll feed 소비 + `GAMES_SYNC_SERVICE_KEY` — 별 계획.
- **pepper 실값 프로비저닝**: 사람 게이트(BE 오너). 본 계획은 dormant 코드까지. pepper·service key 주입 후 P-B·P-C 함께 `PULLIM_MEMBER_DATA_ENABLED=1` 활성화.
- **email 불일치 회원(다른 email SSO)**: 명시적 계정연결 UX — 후속 트랙(계약 밖).
