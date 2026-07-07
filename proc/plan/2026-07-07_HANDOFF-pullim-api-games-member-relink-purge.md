# 핸드오프 → pullim-api: 회원 재연결(P-B) · 중앙 삭제 파기 전파(P-C)

**작성일**: 2026-07-07
**From**: pullim-games (FE·데이터) 세션
**To**: pullim-api 세션
**상태**: HANDOFF DRAFT — pullim-api 수용·구현·운영은 pullim-api 자체 거버넌스 따름.
**연계**: games plan `proc/plan/2026-07-03_games-unified-login-os-delegation.md §2-D P-B·P-C`, spec `05-비즈니스-정책.md §5.2/§5.5/§5.6`, `09-기술-환경.md §9.3`. 관련 진행: PR-1 게이트(#141) merged, P-A(displayName pullim-api #330 + games 소비, grade games-side #146/#147) 구현 진행 중. ⚠️ **P-A 완료 판정은 본 핸드오프가 하지 않는다** — games plan `§2-D` P-A 체크는 아직 열려 있고 `AuthUser` 최종 배선·회원 grade UX 마감은 PR-2 로 추적 중이다(본 문서 범위 밖). 즉 **활성화 blocker 가 P-B/P-C 만 남았다는 뜻이 아니다** — 본 문서는 그중 **pullim-api 의존 두 계약**만 다룬다.

> 🎯 **범위 — pullim 모드 회원 서버 데이터 저장(활성화) 의 pullim-api 의존 두 precondition.** games 는 회원 학년(`grade`)·학습 데이터를 **games 전용 Postgres 의 `sub` projection row** 에 저장하려 하는데(§9.3 키 모델: 저장 키는 `users.id`, `sub`=매핑 컬럼), 이 저장을 켜려면 두 계약이 선행 필수다 — ⑴ **기존 legacy 회원의 데이터를 새 `sub` 에 재연결**(P-B, 데이터 유실·고아 방지), ⑵ **중앙 계정 삭제 → games projection 파기 전파**(P-C, 법적 파기). 이 둘은 **games 단독으로 못 닫는다** — identity·삭제 권위가 pullim-api 에 있기 때문. ⚠️ **활성화 blocker 는 P-B/P-C 가 전부가 아니다** — P-A(회원 메타데이터 계약)의 games-side 마감(PR-2)이 별도로 진행 중이며 그 완료 판정은 games plan `§2-D` 가 추적한다(본 문서 범위 밖). 본 문서는 *pullim-api 에 무엇이 필요한지*(방향+요구)를 전하고, **최종 계약 세부는 pullim-api 와 공동 확정**한다(단정 아님). games 측 소비 코드는 이미 dormant 로 대기(활성화 게이트 `PULLIM_MEMBER_DATA_ENABLED`=off).

---

## 0. 왜 지금 이 둘인가 (활성화 게이트 해제 조건)

games 는 회원 서버 데이터 저장을 서버 플래그 `MEMBER_DATA_STORAGE_ENABLED`(env `PULLIM_MEMBER_DATA_ENABLED`, 기본 off) 로 게이트한다. 이 플래그를 켜려면 **P-B·P-C 둘 다 닫혀야** 한다.

- **P-C 정정 이력(중요)**: 구 계획은 "회원 서버 데이터 0 이라 클라 sync GA 까지 파기 계약 유예 가능"이었으나, **grade 를 games projection 에 저장(P-A⑵ #146/#147)하는 순간 서버 회원 데이터가 존재**한다 → 파기 전파 precondition 이 sync GA 가 아니라 **grade 저장을 포함한 활성화 시점**으로 당겨졌다(spec §5.5·§5.6, plan §2-D P-C). 즉 grade 하나만 저장해도 P-C 는 필수다.
- **키 모델 불변식**(양 repo 공유 전제): games 학습데이터·grade FK 는 로컬 `users(id) ON DELETE CASCADE`. `sub` 는 그 `users` row 의 **매핑 컬럼**(`users.sub UNIQUE`, partial index WHERE sub IS NOT NULL). 따라서 파기·재연결 모두 **"`sub` 에 매핑된 로컬 `users` row"** 단위로 일어난다(`sub` 를 저장 키로 직접 꽂지 않음, §9.3).

---

## P-B. 기존 legacy 회원 ↔ pullim `sub` 재연결

### 문제

games 는 SSO 이전에 자체 email+비밀번호 계정(legacy `users` row: `email`·`password_hash` NOT NULL, `sub` NULL)을 운영했고, 그 계정에 fingerprint(`fingerprint_links`)·학습 데이터가 귀속돼 있다. pullim 모드 활성화 후 **기존 회원이 SSO 로 로그인하면 games 는 `/games/me` 의 `sub` 로 새 projection row(`sub` NOT NULL, `email`/`pw` NULL)를 만든다** — 이 새 row 는 옛 legacy row 와 **자동 연결되지 않는다**. 결과: 회원 관점 "로그인했는데 내 진도·커스텀이 사라짐"(실제로는 옛 row 에 고아로 잔존).

- `fingerprint_links` 는 **first-writer-wins**(§5.2 — 처음 귀속한 계정이 fingerprint 소유, 공유기기 silent 재귀속 방지)라, 같은 브라우저라도 옛 legacy row 가 fingerprint 를 계속 쥐고 있어 새 `sub` row 로 자동 승계되지 않는다.
- **silent auto-merge 금지**(§5.2): 같은 기기에서 다른 사람이 로그인해 남의 데이터를 흡수하는 사고를 막기 위해, 재연결은 **본인 확인이 선 강한 근거** 위에서만 일어나야 한다.

### games 가 못 닫는 이유 → pullim-api 요청

재연결의 매칭 키는 **"이 `sub` 가 어느 legacy email 계정과 같은 사람인가"** 인데, pullim 모드에서 **games 는 회원 email 을 보관하지 않는다**(§5.6 identity PII 중앙 소유) — `/games/me` 응답에도 email 이 없다. 즉 games 는 `sub`↔legacy-email 대응을 **혼자 알 수 없다**. pullim-api 만이 `sub` 의 (검증된) email 을 안다.

**요청: pullim-api 가 `sub`↔(검증된)email 재연결 근거를 제공** — 아래 옵션 중 pullim-api 인프라·프라이버시 정책에 맞는 형태를 **공동 확정**(games 는 특정 방식을 단정하지 않음):

| 옵션 | 형태 | 트레이드오프 |
|---|---|---|
| **B-1. `/games/me` 에 `emailHash` 노출** | 정규화 email 의 **결정적 salted 해시**(games·pullim-api 공유 salt, 평문 email 미노출) | games 가 자기 legacy row 도 같은 해시로 인덱싱해 **로그인 시점 lazy 재연결**. §5.6 준수(평문 미보관). ⚠️ salt 관리·해시 정규화(소문자·trim) 계약 필요 |
| **B-2. 배치 매핑 export** | 일회성 `{sub, emailHash}` 목록을 pullim-api 가 games 마이그레이션에 제공 | offline 일괄 재연결. 노출면 좁으나 신규 가입분은 미포함(one-shot) → lazy 경로(B-1) 병행 권장 |
| **B-3. games→pullim-api 역조회** | games 가 자기 legacy `emailHash` 목록을 보내고 pullim-api 가 매칭 `sub` 반환 | games 가 email 평문 없이 해시만 보유하면 성립. API 신설 부담 |

- **권장 출발점**: **B-1(lazy, `/games/me` emailHash)** — 신규/기존 로그인 모두 자연 커버, one-shot 마이그레이션 불필요, §5.6 평문 미보관 유지. B-2 는 대량 기존 회원 즉시 정리가 필요할 때 보조.
- **재연결 규칙(games 측 마이그레이션, 참고 — 핸드오프 아님)**: `sub` row 최초 생성 시 같은 `emailHash` 의 legacy row 발견 → **legacy row 의 `fingerprint_links`·학습데이터·grade 를 `sub` row 로 이관 후 legacy row 를 tombstone/파기**. 1:1 매칭만 자동(다중 매칭·충돌은 보류+수동). **silent 흡수 방지**: 매칭 키가 pullim-api 검증 email 이므로 "본인" 근거는 충족되나, games 는 재연결을 로그 감사 + idempotent(재실행 무해)로 구현.
- **활성화 순서 함의**: 재연결 규칙이 닫히기 전엔 **기존 games email 회원이 있는 환경에서 pullim 모드 활성화 금지**. 신규 환경·게스트 위주 환경은 legacy row 가 없어 P-B 공백 없이 활성화 안전(단 P-C 는 여전히 필수).

### pullim-api 에 묻는 결정 포인트

1. `sub`↔email 재연결 근거를 **어느 형태**로 제공할지(B-1 해시 노출 / B-2 배치 / B-3 역조회).
2. B-1 채택 시 **해시 계약**: 정규화(lowercase+trim) + 알고리즘(SHA-256 등) + **공유 salt** 관리 주체·회전 정책. (games 가 legacy email 원본을 아직 보유하므로 같은 규칙으로 재해시 가능.)
3. legacy 회원 email 이 pullim-api 가입 email 과 **다를 수 있는** 케이스(사용자가 다른 email 로 SSO 가입) 처리 — 이 경우 자동 재연결 불가, **명시적 계정 연결 UX**(후속)로 이관하는 정책 합의.

---

## P-C. 중앙 계정 삭제 → games projection 파기 전파 (법적 파기)

### 문제

pullim 모드에서 회원 identity 는 pullim-api 소유이고 games 로컬 `users` 는 projection 이다. games 학습데이터·grade FK 는 로컬 `users(id) ON DELETE CASCADE` 라 **CASCADE 는 로컬 `users` row 가 삭제될 때만** 발동한다. 그런데 회원은 games 에서 계정을 삭제하지 않는다(가입·탈퇴 권위 = 중앙). 따라서 **중앙에서 계정을 삭제해도 games projection row 는 남고, 귀속된 학습데이터·grade 가 파기되지 않는다** → 법적 파기 미이행.

### 좋은 소식 — pullim-api 에 이미 발행 포트가 있다

pullim-api `src/auth/modules/account-deletion/` 는 이 전파에 필요한 계약을 **이미 갖고 있다**:

- **삭제 라이프사이클**: `request-deletion` → `status=delete_requested`(유예 `DELETE_GRACE_DAYS=30`) → `account-deletion-sweep.service` 만료 sweep → `status=deleted` + `account-pii-scrub.service` PII 스크럽. 유예 내 `cancel-deletion` 철회 가능.
- **도메인 이벤트 포트** `AccountEventPublisherProviderInterface`(`interface/account-event-publisher-provider.interface.ts`) — 발행 이벤트:
  - `account.deletion_requested` (유예 시작)
  - `account.deletion_cancelled` (철회 → active 복원)
  - **`user.deleted`** (유예 만료 sweep → `deleted` 전이) ← **games 파기 트리거로 이것을 소비**
  - 페이로드 = **PII 비포함**(`{ type, userId, occurredAt }`) — games 파기에 정확히 충분(`userId` 로 projection 찾기).
- 현재 바인딩은 `LoggingAccountEventPublisher`(Phase A placeholder, 구조화 audit 로깅만). 설계상 최종 백엔드 = EventBridge(실 인프라 write 는 사람 게이트 후속).

즉 **새 이벤트 계약을 만드는 게 아니라, 기존 `user.deleted` 이벤트를 games 가 실제로 수신할 전달 채널(delivery)을 배선**하는 문제다.

### 요청: `user.deleted` 이벤트를 games 가 소비할 전달 경로 확정

games 가 `user.deleted`(그리고 필요 시 `account.deletion_requested`)를 받아 **`userId` 에 매핑된 로컬 `users` row 를 삭제** → CASCADE 로 학습데이터·grade·`fingerprint_links` 일괄 파기. 전달 방식은 pullim-api 인프라에 맞춰 **공동 확정**:

| 옵션 | 형태 | 비고 |
|---|---|---|
| **C-1. games 수신 webhook** | pullim-api → `POST https://<games>/api/pullim/account-events`(서명·재시도·idempotency-key) | games 가 소비 엔드포인트 신설. 서명 검증(HMAC 공유 secret)·재시도(at-least-once)·중복 무해 필요 |
| **C-2. EventBridge → games consumer** | 설계상 최종 백엔드(signup-consent.md). pullim-api 가 EventBridge 로 발행, games 가 rule/target 으로 소비 | 인프라 write=사람 게이트라 시점 조율 필요. C-1 을 브리지로 선행 가능 |
| **C-3. games poll 조회 API** | pullim-api 가 `GET /games/deleted-subs?since=<cursor>` 제공, games 배치가 주기 pull | push 인프라 없이 성립(보조). 파기 지연(배치 주기)이 법적 SLA 허용 범위인지 확인 |

- **권장 출발점**: **C-1 webhook**(now) — games 가 자기 엔드포인트만 신설하면 되고, 나중에 C-2 EventBridge 로 무중단 교체 가능(포트 바인딩 변경만, pullim-api `account.module.ts`). 파기 지연 최소.
- **삭제 트리거 시점**: **`user.deleted`(유예 만료·실삭제)** 를 파기 트리거로 삼는다(요청 즉시가 아니라). 유예 내 `cancel-deletion` 철회 가능성 때문 — `account.deletion_requested` 에서 미리 지우면 철회 시 데이터 복구 불가. 단, games 가 유예 창 동안 **soft-freeze**(회원 접근 차단·표시)만 하고 실파기는 `user.deleted` 에서 하는 2단계도 옵션(pullim-api 30일 유예와 정합).
- **games 측 파기(참고 — 핸드오프 아님)**: `user.deleted{userId}` 수신 → `DELETE FROM users WHERE sub = $userId`(존재 시) → CASCADE. idempotent(이미 없으면 no-op 200), 서명 검증 실패 시 거부, at-least-once 재수신 무해.

### pullim-api 에 묻는 결정 포인트

1. **전달 채널**: C-1 webhook(즉시) / C-2 EventBridge / C-3 poll 중 무엇으로 시작할지. (games 는 C-1 을 지금 구현 가능한 최단 경로로 봄.)
2. **`userId` == `sub` 계약 확정**: `AccountEvent.userId` 가 games 가 `/games/me` introspection 으로 저장한 **`sub` 와 동일 값**인지 **명시 보장**. (다르면 games 가 projection 을 못 찾아 파기 실패 — 이 등식이 P-C 전체의 정합 축.) 다르면 이벤트에 `sub` 를 함께 실어달라는 요청으로 전환.
3. **전달 신뢰성 계약**: at-least-once + idempotency-key + 서명(HMAC)·재시도·DLQ 유무. games 는 중복·순서역전을 무해하게 처리하되, **유실은 법적 파기 미이행**이라 at-least-once 보장이 핵심.
4. **유예/철회 반영**: games soft-freeze 를 둘지, 아니면 `user.deleted` 단일 트리거로 충분한지(pullim-api 30일 유예를 games 가 미러할 필요가 있는지).
5. **backfill**: 활성화 이전 이미 중앙에서 삭제된 회원(games projection 이 생기기 전이라 대상 0일 것)·활성화 이후 이벤트 채널 배선 전 삭제분의 backfill 필요 여부(C-3 poll 이 backfill 도 겸할 수 있음).

---

## 검증 (반영 후 — games·pullim-api 합동)

- **P-B**: 기존 legacy email 회원이 SSO 로그인 → 옛 진도·커스텀·grade 가 새 `sub` 세션에서 그대로 보임(재연결 성공). 다른 사람 기기 로그인은 흡수 안 됨(silent auto-merge 0).
- **P-C**: 중앙 계정 삭제(유예 만료) → games projection row 삭제 → 학습데이터·grade·fingerprint_links CASCADE 파기 확인(잔존 0). 이벤트 재수신·중복 무해(idempotent). 유예 내 철회 시 데이터 보존.
- 두 계약 닫힘 → games `PULLIM_MEMBER_DATA_ENABLED` 활성화 가능(회원 서버 저장 개시).

## 관련 파일

**pullim-api (참고 — 소유·구현은 pullim-api)**
- `src/auth/modules/account-deletion/interface/account-event-publisher-provider.interface.ts` (이벤트 포트·`user.deleted` 계약)
- `src/auth/modules/account-deletion/infrastructure/logging-account-event-publisher.adapter.ts` (현 placeholder — 실 전달 어댑터로 교체 지점)
- `src/auth/modules/account-deletion/service/account-deletion-sweep.service.ts` (유예 만료 sweep → `user.deleted` 발행 지점)
- `src/auth/common/constants/auth-policy.constants.ts` (`DELETE_GRACE_DAYS=30`)
- `src/games/modules/me/` (`/games/me` — P-B 채택 시 `emailHash` 노출 지점)

**games (소비 — dormant 대기, PR-2 후속)**
- `apps/games/lib/server/auth/pullim-member.ts` (`ensurePullimMember`·`MEMBER_DATA_STORAGE_ENABLED` 게이트 — P-B·P-C 확정 후 켬)
- `apps/games/lib/server/auth/users.ts` (`users.sub` 매핑 컬럼·CASCADE)
- `apps/games/migrations/0004_pullim_projection.sql` (sub 매핑·XOR CHECK)
- games-side 런북: `proc/plan/2026-07-03_games-unified-login-os-delegation.md §2-D`
