-- P-B 회원 재연결 인덱스 (2026-07-08).
-- 근거: proc/plan/2026-07-08_pb-member-relink-consume.md §A,
--       proc/plan/2026-07-07_HANDOFF-pullim-api-games-member-relink-P-B.md §1·§3.
-- ⚠️ 대상 = **games 자체 Postgres**(DATABASE_URL). pullim-api DB 아님.
--
-- pullim 모드에서 games 는 email 을 보관하지 않지만, legacy(email+password_hash) row 는
-- 평문 email 을 아직 보유한다. legacy 회원이 SSO 로그인할 때 그 회원의 옛 데이터를 새 `sub`
-- projection 으로 1:1 재연결하려면, legacy email 을 pullim-api 와 **동일 salt·동일 정규화**로
-- HMAC 한 지문(email_match_hash)을 미리 인덱싱해 두어야 로그인 시점 O(1) 조회가 된다.
-- 해시 계약(HMAC-SHA256 hex, key=GAMES_EMAIL_MATCH_PEPPER, msg=email.trim().toLowerCase())은
-- 핸드오프 §1 을 따른다. salt 미주입 환경에선 백필 자체가 dormant → 이 컬럼은 NULL 로 남는다(무해).

-- 재연결 조회 키(nullable). legacy row 만 채워짐(pullim projection row 는 email 미보유 → NULL).
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_match_hash TEXT;

-- 로그인 시점 재연결 조회용 부분 인덱스(NULL 다수 허용 — 게스트·pullim row·백필 전 legacy 는 NULL).
-- UNIQUE 아님: 이론상 서로 다른 legacy email 이 같은 해시일 확률은 무시할 수준이나,
-- 재연결은 "정확히 1건 매칭만 자동"(다중 매칭=보류) 규칙으로 앱 계층에서 방어한다(핸드오프 §3, spec/05 §5.2).
CREATE INDEX IF NOT EXISTS idx_users_email_match_hash
  ON users(email_match_hash) WHERE email_match_hash IS NOT NULL;
