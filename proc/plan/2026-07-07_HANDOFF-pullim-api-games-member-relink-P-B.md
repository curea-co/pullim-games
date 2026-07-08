# 핸드오프 → pullim-games: 회원 재연결(P-B) 근거 준비됨 — `/games/me` `emailMatchHash`

**작성일**: 2026-07-07
**From**: pullim-api 세션
**To**: pullim-games (FE·데이터) 세션
**방향**: 이번엔 **pullim-api → games** (지난 `2026-07-07_HANDOFF-...-member-relink-purge`(games→api)의 P-B 요청에 대한 **응답+계약 확정**).
**상태**: pullim-api 측 **표면 구현 완료**(미커밋 — 사람 게이트 대기). games 는 이 계약으로 **재연결 소비 코드**를 착수하면 된다.
**연계**: games 핸드오프 `proc/plan/2026-07-07_HANDOFF-pullim-api-games-member-relink-purge.md §P-B`(옵션 B-1 권장), pullim-api 카드 `docs/games/2026-07-07-games-member-relink-P-B/`.

> 🎯 **한 줄**: games 가 요청한 **B-1(lazy, `/games/me` emailHash)** 을 채택·구현했다. `GET /games/me` 응답에 **`emailMatchHash`**(검증된 email 의 결정적 keyed 해시)를 추가했으니, games 는 자기 legacy `users.email` 을 **같은 salt·같은 정규화로 해시**해 인덱싱하고, 로그인 시점 `sub` row 생성 시 같은 `emailMatchHash` 의 legacy row 를 찾아 **1:1 재연결**하면 된다. 평문 email 은 여전히 안 넘어간다(§5.6 준수).

---

## 0. 왜 B-1 인가 (채택 근거)
- games 는 pullim 모드에서 email 을 보관 안 함 → `sub`↔legacy-email 대응을 혼자 못 안다. pullim-api 만 검증된 email 을 안다.
- B-1(lazy 자기 `/games/me`)은 **신규/기존 로그인 모두 자연 커버**, one-shot 마이그레이션 불필요, **§5.6 평문 미보관** 유지. B-3(역조회 API)보다 **열거·역인덱스 표면이 없어 안전**(본인만 자기 해시를 봄).
- B-2(배치 export)는 대량 기존회원 즉시 정리가 필요할 때 **보조**로만(지금은 B-1 lazy 로 충분 판단 — 필요하면 별도 요청).

---

## 1. 계약 (v1) — `emailMatchHash`

`GET /games/me` 응답(기존 `{ sub, globalRole, gamesFlagLevel, displayName }`)에 **필드 1건 추가**:

```jsonc
{
  "sub": "user_...",
  "globalRole": "user",
  "gamesFlagLevel": null,
  "displayName": "홍길동",
  "emailMatchHash": "d1bb…ebb"   // ← 신규. string | null
}
```

### 해시 정의 (games 가 legacy email 에 **동일 적용**할 규칙 — 바이트 일치 계약)
```
emailMatchHash = HMAC_SHA256( key = 공유salt, msg = normalize(email) )  →  hex(소문자)
normalize(email) = email.trim().toLowerCase()
```
- **알고리즘**: HMAC-SHA256, **hex 소문자 인코딩**.
- **정규화**: `trim()` 후 `toLowerCase()` **만**. gmail dot/plus 등 provider별 정규화 **미적용**(취약·비대칭 — pullim-api 저장 email 이 정본).
- **prefix 없음**: 메시지는 정규화된 email 그 자체(도메인 prefix 안 붙임).

### 참조 구현 (games 측, Node 예)
```js
import { createHmac } from 'node:crypto';
function emailMatchHash(email, salt) {
  const n = email.trim().toLowerCase();
  return createHmac('sha256', salt).update(n).digest('hex');
}
```

### 테스트 벡터 (실 salt 아님 — 알고리즘 일치 검증용)
- salt = `"pb-test-salt"`, email = `"  User@Example.COM "`
- normalize → `"user@example.com"`
- **기대 hex** = `d1bbcc480bd202e0abc38c0d2119fbce944b42bb7e014fe1cd22d2ef4ac63ebb`
> games 구현이 이 값을 내면 pullim-api 와 바이트 일치. (pullim-api e2e 도 이 벡터를 실 서비스 경로로 고정함.)

### `null` 조건 (games 가 처리해야 할 폴백)
- **email 없음**(게스트·행 없음) → `null`.
- **salt 미프로비저닝(fail-soft)** → `null`. 이 경우 pullim-api 는 부팅·200 유지하되 해시를 못 준다 → **games 재연결은 dormant**(어차피 `PULLIM_MEMBER_DATA_ENABLED=off` 와 정합). salt 주입되면 자동으로 실 해시가 나오기 시작.

---

## 2. 🔴 공유 salt 프로비저닝 (양 레포 공동 — 사람 게이트)

**핵심**: 두 시스템이 **같은 email → 같은 해시**를 내려면 **동일한 salt 값**을 양쪽이 가져야 한다.

- **키 이름**: **`GAMES_EMAIL_MATCH_PEPPER`** (pullim-api 는 통합 시크릿 `pullim/<env>/backend` 의 flat key 로 로드 — config-catalog §3 등재됨).
- **games 측**: 자기 시크릿 저장소(env·secret manager)에서 **동일 값**을 로드해 §1 해시에 사용.
- **값 생성·공유**: 충분한 엔트로피의 랜덤(예: 32B 이상) 시크릿을 **한 번 생성해 양 레포에 안전 채널로 동일 주입**. **PASSWORD_PEPPER 등 기존 시크릿 재사용 금지**(games 와 공유하면 그 비밀이 새어 다른 보안이 약화됨 — pullim-api 도 전용 새 키를 씀).
- **회전**: salt 회전 시 **신규 재연결만 영향**(회전 후 로그인은 새 해시로 매칭). 기존에 이미 재연결된 row 는 무영향. 대량 회전이 필요하면 사전 조율.
- **누가**: BE 담당/오너가 값 생성·주입 주체. games·pullim-api 어느 세션도 실값을 코드/문서에 커밋하지 않는다.

> **시퀀싱 이점**: pullim-api 코드는 **fail-soft** 라 salt 없이도 머지·부팅된다(그동안 `emailMatchHash:null`). 즉 "코드 배포"와 "salt 주입"을 분리할 수 있다 — games 소비 코드도 salt 주입 전까진 dormant 로 두면 안전.

---

## 3. games 측이 할 일 (이 핸드오프의 소비 — games 소관)

> 아래는 games 레포 작업 제안(핸드오프 아님 — 최종 구현은 games 거버넌스). pullim-api 는 §1 계약·§2 salt 만 제공.

1. **legacy email 인덱싱**: games `users` 의 legacy row(`email` NOT NULL, `sub` NULL)에 **`email_match_hash` 컬럼**(또는 조회 인덱스)을 §1 규칙(같은 salt·normalize)으로 채운다. 원본 email 은 games 가 아직 보유하므로 재해시 가능.
2. **로그인 시점 lazy 재연결**: `sub` row 최초 생성(=SSO 로그인) 시 `/games/me.emailMatchHash` 를 받아, **같은 해시의 legacy row** 를 찾으면 → legacy 의 `fingerprint_links`·학습데이터·grade 를 `sub` row 로 **이관 후 legacy row tombstone/파기**.
3. **안전 규칙**(§5.2):
   - **1:1 매칭만 자동**. 다중 매칭·충돌은 **보류 + 수동**(자동 흡수 금지).
   - **silent auto-merge 금지** — 매칭 키가 pullim-api **검증된** email 이라 "본인" 근거는 성립하나, **로그 감사 + idempotent**(재실행 무해)로 구현.
   - `emailMatchHash: null` 이면 재연결 스킵(폴백 — dormant/무email).
4. **활성화 순서**: 이 재연결이 닫히기 전엔 **기존 games email 회원이 있는 환경에서 `PULLIM_MEMBER_DATA_ENABLED` 활성화 금지**. 신규/게스트 위주 환경은 legacy row 없어 P-B 공백 없이 안전(단 P-C 는 별도 필수 — 아래 §5).

---

## 4. 검증 (반영 후 — games·pullim-api 합동)
1. **알고리즘 일치**: games 가 §1 테스트 벡터(dummy salt)로 `d1bb…ebb` 재현 확인.
2. **실 salt 매칭**: 같은 회원의 legacy email 을 games 가 해시한 값 == 그 회원 로그인 시 `/games/me.emailMatchHash`.
3. **재연결 성공**: 기존 legacy email 회원 SSO 로그인 → 옛 진도·커스텀·grade 가 새 `sub` 세션에서 그대로 보임.
4. **silent 흡수 0**: 다른 사람 기기 로그인은 남의 데이터 흡수 안 함(다중/불일치 = 보류).
5. **fail-soft**: salt 미주입 상태에서 `emailMatchHash:null` → games 재연결 dormant(에러 아님).

---

## 5. 범위 / 관련

**이 핸드오프 범위**: P-B(재연결 근거) 만.
- **email 불일치 케이스**(사용자가 games legacy 와 **다른** email 로 SSO 가입) → 자동 재연결 불가. **명시적 계정연결 UX**(후속, 별 트랙)로 이관 — 이번 계약 밖.
- **P-C(중앙삭제 파기 전파)**: 이미 별도로 닫힘 — pullim-api `GET /account/deletions` **poll feed** 제공(#347 merged). games 는 그 feed 를 소비해 projection 파기(games 소관, 별 핸드오프). P-B·P-C **둘 다** 닫혀야 `PULLIM_MEMBER_DATA_ENABLED` 활성화 가능.

**pullim-api 관련 파일(참고 — 구현·소유는 pullim-api)**
- `src/games/modules/me/controller/dto/games-me-response.dto.ts` — `emailMatchHash` 필드
- `src/games/modules/me/use-cases/get-games-me.use-case.ts` — governed 포트 조회 조립
- `src/common/profile/email-match-hash.interface.ts` — governed 포트(email 원문 경계 밖 미유출)
- `src/auth/modules/account/service/email-match-hash.service.ts` — HMAC 계산(auth 경계·fail-soft)
- `docs/design/services/games/api.md §me` — 표면 SoT · `docs/design/_platform/config-catalog.md §3` — `GAMES_EMAIL_MATCH_PEPPER`

**계약 확정 필요(games ↔ pullim-api 공동)**
1. `GAMES_EMAIL_MATCH_PEPPER` 실값 생성·양 레포 동일 주입 주체·시점(§2).
2. email 불일치(다른 email SSO) 회원의 명시적 계정연결 UX 정책(후속 트랙 착수 여부).
