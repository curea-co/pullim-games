# [철회] 핸드오프 → pullim-games: 회원 재연결(P-B) — 취소·fresh-start 로 대체

**작성일**: 2026-07-07 (철회 2026-07-08)
**From**: pullim-api 세션
**To**: pullim-games 세션
**상태**: ⛔ **철회(SUPERSEDED).** 이 핸드오프가 요청한 `emailMatchHash` 기반 재연결(P-B)은 **취소**한다. pullim-api 측 구현(PR #369)도 **revert(PR #373)** 했다.

---

## 왜 철회하나

- games 회원 데이터 저장은 **아직 라이브 아님**(`PULLIM_MEMBER_DATA_ENABLED=off`). pullim-Q 도 같은 상황에서 **fresh-start(신규 신원부터 기록, legacy 재연결 미구현)** 로 처리했다(선례: `docs/q/2026-06-19_pullim-api-reply_q-cutover-status.md`, Q Supabase P4 fresh-start 리셋).
- games 도 **같은 fresh-start 패턴**을 따른다 — 즉 **legacy email 계정 ↔ 새 `sub` 재연결을 위한 별도 메커니즘(공유 salt·emailMatchHash·역조회)을 만들지 않는다**. 새 공유 시크릿(`GAMES_EMAIL_MATCH_PEPPER`)·새 governed 포트는 **불필요**(운영 시크릿 주입 부담 제거).

## 지금 games 가 할 일

- **없음(pullim-api 의존 P-B 작업 0).** 재연결을 전제한 dormant 소비 코드도 걷어내도 된다.
- SSO 로그인·`/games/me`(sub·displayName)는 그대로 유효(그건 별건, 이미 라이브 계약).

## 나중에(games 실회원 go-live 시)

- 그 시점에 **정말 legacy 데이터 보존이 필요한지**부터 판단한다. fresh-start(신규만 기록)로 충분하면 재연결 자체가 불요. 보존이 꼭 필요하면 그때 형태(해시 매칭/명시적 계정연결 UX 등)를 **다시 설계**한다 — 지금 선구현하지 않는다.

> pullim-api 는 이 건으로 **지금 추가 작업·시크릿 프로비저닝을 요구하지 않는다.**
