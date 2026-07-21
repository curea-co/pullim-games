-- Pullim Library launch handoff + LearningEvent 수신 저장소 (2026-07-22).
-- PII 0: Library가 발급한 익명 사용자 ID와 학습 이벤트만 저장한다.

-- POST handoff 성공 후 발급하는 짧은 opaque 세션. 쿠키 원문은 저장하지 않고 SHA-256 해시만.
CREATE TABLE IF NOT EXISTS library_launch_sessions (
  token_hash     TEXT  PRIMARY KEY,
  launch_payload JSONB NOT NULL, -- jti/iat/exp/anonymousUserId/sessionId/pinned activity만(launchConfig 미저장)
  created_at     BIGINT NOT NULL,
  expires_at     BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_library_launch_sessions_expires
  ON library_launch_sessions(expires_at);

-- 공통 LearningEvent envelope. event_id PK + event_hash로 동일 재전송은 멱등 승인하고,
-- 같은 ID/다른 본문 충돌은 서버 모듈에서 거부한다.
CREATE TABLE IF NOT EXISTS library_learning_events (
  event_id          TEXT  PRIMARY KEY,
  event_hash        TEXT  NOT NULL,
  launch_id         TEXT  NOT NULL,
  anonymous_user_id TEXT  NOT NULL,
  session_id        TEXT  NOT NULL,
  game_id           TEXT  NOT NULL,
  mode              TEXT  NOT NULL,
  event_type        TEXT  NOT NULL,
  occurred_at       BIGINT NOT NULL,
  event_envelope    JSONB NOT NULL,
  received_at       BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_library_learning_events_session
  ON library_learning_events(session_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_library_learning_events_received
  ON library_learning_events(received_at);
