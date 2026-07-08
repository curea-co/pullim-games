# 핸드오프 → pullim-games: 중앙 삭제 파기 전파(P-C) 소비 — `GET /account/deletions` poll feed

**작성일**: 2026-07-08
**From**: pullim-api 세션
**To**: pullim-games (데이터·서버) 세션
**방향**: pullim-api → games. 지난 `2026-07-07_HANDOFF-...-member-relink-purge`(games→api)의 **P-C 요청에 대한 응답 확정 + 소비 안내**.
**상태**: pullim-api 측 **구현 완료·머지됨**(#347 `feat(auth): GET /account/deletions 서비스 폴링 피드`). games 는 이 feed 를 **폴링·소비**해 projection 을 파기하면 된다.
**연계**: games 핸드오프 §P-C(옵션 C-1/C-2/C-3), pullim-api 표면 SoT `docs/design/services/auth/api.md §2 GET /account/deletions`.

> 🎯 **한 줄**: games 가 물었던 3옵션 중 **C-3(poll feed)** 로 확정·구현됐다. games 는 `GET /account/deletions` 를 **서비스 키로 주기 폴링**해서, 반환된 삭제 회원 `sub`(=`users.id`) 마다 로컬 `DELETE FROM users WHERE sub=<sub>` → **CASCADE 로 학습데이터·grade·fingerprint_links 일괄 파기**하면 된다. **`sub`==games 가 `/games/me` 로 저장한 그 sub** — 정합 축 확정(아래 §2).

---

## 0. 왜 C-3(poll) 인가 (확정 근거)
- games 핸드오프는 C-1(webhook)/C-2(EventBridge)/C-3(poll) 중 **C-1 을 최단 경로로** 봤으나, pullim-api 는 **C-3(poll feed)** 로 구현했다:
  - **push 인프라(EventBridge·서명 webhook·DLQ) 없이 지금 성립** — 삭제 집합을 커서로 pull 하므로 **at-least-once·backfill·재처리가 커서 하나로 자연 보장**(webhook 유실·재시도·순서 문제를 games 가 안 떠안음).
  - EventBridge(C-2, ADR-007 push)는 후속으로 무중단 교체 가능(포트 바인딩 변경). 지금은 poll 로 파기 지연을 배치 주기로 통제.
- **트리거 시점**: feed 는 **`status='deleted'`(유예 만료·실삭제)만** 반환한다. 유예 중(`delete_requested`)·철회(`cancelled`)는 **feed 에 안 나옴** → games 가 조기 파기하지 않고, 철회 회원 데이터는 **보존**된다(games 핸드오프 §P-C 결정4 = `user.deleted` 단일 트리거로 충분, soft-freeze 불요).

---

## 1. 계약 — `GET /account/deletions`

```
GET https://<api-host>/account/deletions?cursor=<opaque>&limit=<1..500>
Header: x-service-key: <GAMES_SYNC_SERVICE_KEY>     ← member 쿠키 아님(삭제 회원=세션 없음)
```

### 요청
| 파라미터 | 형태 | 기본 |
|---|---|---|
| `cursor` | opaque base64url(직전 응답 `nextCursor`). 없으면 처음부터. **malformed → 400** | 없음(처음부터) |
| `limit` | 정수 1..500 | 100 |

### 응답 (200, bare DTO — envelope 없음)
```jsonc
{
  "items": [
    { "sub": "a3f1c2d4-…", "deletedAt": "2026-07-07T03:12:45.000Z" }
  ],
  "nextCursor": "MjAyNi0wNy0wN1QwMzoxMj…"   // string | null
}
```
- **정렬**: `(deleted_at, id)` 복합 커서 **오름차순**(같은 sweep 배치의 동일 `deleted_at` 행도 건너뛰지 않음).
- **`sub`** = `users.id` = **삭제된 회원의 pullim sub**(games projection 파기 키).
- **`deletedAt`** = 실제 파기 전이 시각(ISO8601 UTC, `users.deleted_at` — sweep 시 1회 set·불변·monotonic).
- **`nextCursor`** = 마지막 항목 커서. **빈 페이지 = 끝 → `null`**(폴링 종료 신호).
- **PII 없음**: `sub` + `deletedAt` 만.

### 상태 코드
- **200** 정상 · **400** malformed cursor · **401** 서비스 키 부재·불일치·미설정(generic — 값·사유 비구분, timing-safe).

---

## 2. ✅ `sub` == games 저장 sub — 정합 축 확정 (games 핸드오프 §P-C 결정2)

games 핸드오프가 "**`AccountEvent.userId` 가 games 가 `/games/me` 로 저장한 `sub` 와 동일 값인지 명시 보장**"을 물었다. **확정**:
- feed 의 `item.sub` = pullim-api `auth.users.id` = **`GET /games/me` 응답의 `sub` 와 같은 값**(둘 다 동일 신원의 `users.id`). games 가 projection 저장 키로 쓴 그 sub 그대로다.
- 따라서 games 는 **`DELETE FROM users WHERE sub = item.sub`** 로 정확히 그 projection 을 찾는다. 별도 매핑·변환 불요. (P-B 의 emailMatchHash 와 무관 — P-C 는 sub 직접 매칭.)

---

## 3. games 측이 할 일 (소비 — games 소관, 참고)

> 아래는 games 레포 작업 제안. 최종 구현은 games 거버넌스. pullim-api 는 §1 feed·§4 서비스 키만 제공.

**폴링 루프(의사코드)**
```
cursor = load_persisted_cursor()        // 없으면 처음(전체 backfill)
loop:
  res = GET /account/deletions?cursor=cursor&limit=100  (x-service-key)
  for item in res.items:
     DELETE FROM users WHERE sub = item.sub    // CASCADE 파기(idempotent — 이미 없으면 no-op)
  if res.items is empty: break               // 이번 주기 끝(nextCursor=null)
  cursor = res.nextCursor
  persist_cursor(cursor)                       // ★ 반드시 영속화(재시작·유실 대비)
// 주기(cron)마다 마지막 cursor 부터 재개
```

**규칙**
1. **커서 영속화 필수**: 마지막 처리 `nextCursor` 를 games 가 저장하고 다음 주기에 재개한다. 이게 **at-least-once·backfill·재처리 안전망**(중간 유실/재시작해도 커서부터 다시 pull). **malformed 커서면 400** — 조용히 처음부터 재시작하면 처리분을 무한 재처리하므로 pullim-api 가 명시 실패시킨다(games 는 저장 커서 손상 시 알람).
2. **idempotent**: `DELETE ... WHERE sub=?` 는 이미 없으면 no-op. at-least-once 재수신·중복·순서역전 무해하게(파기는 멱등).
3. **CASCADE 확인**: games `users(id) ON DELETE CASCADE` 로 학습데이터·grade·`fingerprint_links` 가 딸려 파기되는지 스키마 확인(핸드오프 §9.3 키 모델).
4. **유예/철회**: feed 에 `deleted` 만 나오므로 games 는 **추가 처리 불요**(유예 중·철회 회원은 애초에 안 옴 → 보존). soft-freeze 미러 불필요.
5. **폴링 주기**: 파기 SLA(법적 파기 기한) 허용 범위로 cron 주기 설정(예: 시간 단위). push(C-2)가 필요할 만큼 즉시성이 요구되면 별도 협의.

---

## 4. 🔴 서비스 키 프로비저닝 (양 레포 공동 — 사람 게이트)

- **키 이름**: **`GAMES_SYNC_SERVICE_KEY`** — pullim-api 통합 시크릿(`pullim/<env>/backend`, config-catalog §6.8) 에서 로드. games 는 폴러가 `x-service-key` 헤더로 **동일 값**을 보낸다.
- **fail-closed**: pullim-api 는 이 키가 **미설정이면 무조건 401**(무설정=열림 아님). 즉 키가 양쪽에 주입되기 전엔 feed 호출이 전부 거부된다 — games 폴러도 그때까진 dormant.
- **값 생성·주입**: 충분한 엔트로피 랜덤 시크릿을 한 번 생성해 **pullim-api 시크릿 + games 폴러 시크릿에 동일 주입**(안전 채널). 코드·문서에 실값 커밋 금지. 주체 = BE/오너.
- **회전**: 회전 시 양쪽 동시 교체(회전 창 동안 이전·신규 둘 다 허용하려면 별도 협의 — 현 구현은 단일 키 비교).

---

## 5. 검증 (반영 후 — games·pullim-api 합동)
1. **인증**: 올바른 `x-service-key` → 200, 없거나 틀리면 401.
2. **파기**: 중앙에서 회원 삭제 → 유예(`DELETE_GRACE_DAYS=30`) 만료 → sweep → feed 에 그 `sub` 등장 → games 폴러가 `DELETE users WHERE sub=…` → 학습데이터·grade·fingerprint_links **CASCADE 파기(잔존 0)**.
3. **철회 보존**: 유예 내 철회 회원은 feed 에 **안 나옴** → games 데이터 보존.
4. **멱등·재개**: 같은 페이지 재수신·폴러 재시작(커서 영속) 시 중복 파기 무해, 처리분 누락 0.
5. **backfill**: 커서 없이 처음 폴링 시 그간 삭제된 전체 집합을 순회(활성화 이전 삭제분 대상은 projection 이 없으면 no-op).

---

## 6. 범위 / 관련

- **P-C 는 pullim-api 측 완료**(#347 머지) — games 는 **소비만** 하면 된다. P-B(재연결)는 별건(`2026-07-07_HANDOFF-...-member-relink-P-B.md`, emailMatchHash). **P-B·P-C 둘 다 닫혀야 `PULLIM_MEMBER_DATA_ENABLED` 활성화 가능.**
- **후속(pullim-api)**: EventBridge(C-2) push 전환은 ADR-007 후속 — poll(C-3)을 브리지로 무중단 교체 가능(games 폴러→consumer). 지금은 poll 로 충분.

**pullim-api 관련 파일(참고 — 구현·소유는 pullim-api)**
- `src/auth/modules/account-deletion/controller/deletion-feed.controller.ts` — `GET /account/deletions`(ServiceKeyGuard)
- `src/auth/modules/account-deletion/controller/dto/list-deletions-{query,response}.dto.ts` — 커서·응답 계약
- `src/auth/modules/account-deletion/service/{deletion-feed,account-deletion-sweep}.service.ts` — 커서 판정·sweep 전이(`deleted_at` set)
- `src/common/service-auth/{service-key.guard,service-key.config}.ts` — `x-service-key`↔`GAMES_SYNC_SERVICE_KEY`(fail-closed)
- `docs/design/services/auth/api.md §2 GET /account/deletions` — 표면 SoT

**계약 확정 필요(games ↔ pullim-api 공동)**
1. `GAMES_SYNC_SERVICE_KEY` 실값 생성·양 레포 동일 주입 주체·시점(§4).
2. 폴링 주기(파기 SLA) — poll(C-3) 지연 허용 범위. 즉시성 필요 시 C-2(push) 전환 협의.
