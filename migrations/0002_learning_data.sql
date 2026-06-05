-- 계정 사용자 학습 데이터 서버 동기화 (2026-06-05).
-- 근거: proc/plan/2026-06-05_learning-data-server-sync.md §4.2 (Codex #116 9R 반영본).
-- 익명/게스트는 localStorage 전용 — 본 테이블은 계정 사용자 전용. 전부 user_id CASCADE.

-- 증분 pull 커서 = **단조 시퀀스**(벽시계 ms 아님, #117 R8). 같은 ms 에 두 write 가
-- 같은 updated_at 을 받아 다음 pull 이 영구 누락하던 충돌 방지. srs/streak/custom 의
-- updated_at 을 nextval 로 stamp(LWW 는 last_review_at/exportedAt 가 담당, updated_at 은 커서 전용).
CREATE SEQUENCE IF NOT EXISTS learning_sync_seq;

-- SRS 카드 상태. PK (user_id, game_id, card_id). fsrs_card 는 클라 SerializedState.fsrsCard 그대로.
-- 충돌 해소: 서버 updated_at(서버 write 시각) LWW — 클라 시계 미사용(클럭 스큐 방어).
CREATE TABLE IF NOT EXISTS srs_states (
  user_id        TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id        TEXT    NOT NULL,
  card_id        TEXT    NOT NULL,
  fsrs_card      JSONB   NOT NULL,
  review_count   INTEGER NOT NULL DEFAULT 0,
  last_review_at BIGINT,                  -- epoch ms (FSRS 도메인 필드). null = 미리뷰.
  updated_at     BIGINT  NOT NULL,        -- 서버 write 시각(epoch ms). 증분 pull cursor + LWW 기준.
  PRIMARY KEY (user_id, game_id, card_id)
);
CREATE INDEX IF NOT EXISTS idx_srs_states_user ON srs_states(user_id);
CREATE INDEX IF NOT EXISTS idx_srs_states_updated ON srs_states(user_id, updated_at);

-- 스트릭. 사용자당 1행. 머지: longest=max, (current,last_active_date)=최신일.
CREATE TABLE IF NOT EXISTS streaks (
  user_id          TEXT    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current          INTEGER NOT NULL DEFAULT 0,
  longest          INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,                  -- "YYYY-MM-DD" 로컬자정 기준.
  updated_at       BIGINT  NOT NULL       -- 서버 write 시각(epoch ms).
);

-- 활동 로그(대시보드용). PK 에 device_id(fingerprint 아님 — 소유권 의미 분리, R5).
-- per-device 절대 카운터: 대시보드 표시값 = SUM(count).
-- 14일 retention·집계 window 는 **date 버킷 기준**(R3 — updated_at 기준이면 오래된 date 가
-- 재동기화만으로 retention 연장·heatmap 재등장). updated_at 은 LWW write 시각 기록용.
CREATE TABLE IF NOT EXISTS activity_log (
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id    TEXT    NOT NULL,
  date       TEXT    NOT NULL,            -- "YYYY-MM-DD" (클라 로컬 활동일 = retention/집계 기준)
  device_id  TEXT    NOT NULL,            -- 동기화 전용 랜덤 UUID (fingerprint 아님)
  count      INTEGER NOT NULL,            -- 이 기기의 해당 날짜 절대 활동 수
  updated_at BIGINT  NOT NULL,            -- 서버 write 시각(epoch ms). LWW 기록용.
  PRIMARY KEY (user_id, game_id, date, device_id)
);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON activity_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_activity_log_date ON activity_log(date);  -- 주기 cleanup(WHERE date<cutoff)용

-- 커스텀 콘텐츠. 사용자당 컬렉션 스냅샷 1행(삭제 전파 위해 per-row 아님, R-커스텀).
-- snapshot = { version, subjects[], curriculum[], cards[] }(CustomDataExport).
CREATE TABLE IF NOT EXISTS custom_content (
  user_id    TEXT   PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  snapshot   JSONB  NOT NULL,
  updated_at BIGINT NOT NULL              -- 서버 write 시각(epoch ms). 컬렉션 단위 LWW.
);
