-- games 계정 시스템 초기 스키마 (2026-05-29).
-- 근거: proc/plan/2026-05-29_auth-login-signup.md, spec/05 §5.2·§5.6 개정.
-- 독립 계정(풀림 통합 유저 테이블 미사용). PII 최소: 이메일+비번해시만.

-- 회원. 의도적으로 얇게 — 랭킹/점수/재화 컬럼 없음(하이퍼캐주얼 룰), PII 최소.
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  created_at     BIGINT NOT NULL,
  updated_at     BIGINT NOT NULL,
  last_seen_at   BIGINT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- opaque 세션 (JWT 미사용). 쿠키에는 원문 토큰, DB 에는 SHA-256 해시만 저장 →
-- DB 유출 시 세션 탈취 방지. HttpOnly 쿠키로 전달, TTL 7일.
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  BIGINT NOT NULL,
  expires_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
-- 만료 세션 purge(DELETE WHERE expires_at <= now)가 풀스캔 안 되도록.
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- 익명 fingerprint → 계정 연결. 로그인 시 현재 브라우저 fingerprint 를 계정에 귀속.
-- 한 계정이 여러 기기(fingerprint)를 가질 수 있으므로 fingerprint 가 PK.
CREATE TABLE IF NOT EXISTS fingerprint_links (
  fingerprint TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_at   BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fingerprint_links_user_id ON fingerprint_links(user_id);
