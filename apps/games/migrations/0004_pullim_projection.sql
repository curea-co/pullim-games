-- pullim 모드 회원 projection 지원 (2026-07-06).
-- 근거: spec/09 §9.3 키 모델, proc/plan/2026-07-03_games-unified-login-os-delegation.md §2-D.
-- ⚠️ 대상 = **games 자체 Postgres**(DATABASE_URL). pullim-api DB 아님(D3 games DB 존치).
--
-- pullim 모드에서 회원 신원은 pullim-api sub. games 는 이 sub 를 로컬 `users` row 로 lazy upsert
-- (projection)한다 — 저장/조인 키는 계속 `users.id`(무변경), `sub` 는 외부 신원 매핑 컬럼.
-- 단 현행 `users.email`·`password_hash` 는 NOT NULL 이라 email/pw 없는 pullim row 를 못 담는다
-- → nullable 전환 + `sub` 추가 + CHECK 로 row 종류를 legacy(email+pw) XOR pullim(sub)으로 강제.

-- legacy 전용 필수였던 email·password_hash 를 nullable 로 (pullim projection row 는 미보유).
-- (이미 nullable 이어도 DROP NOT NULL 은 무해 — 재실행 안전.)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- pullim 외부 신원 매핑 컬럼(nullable — legacy row 는 NULL). 저장/조인 키는 계속 users.id.
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub TEXT;

-- sub 유일성 — 부분 유니크 인덱스(NULL 다수 허용: legacy row 는 sub NULL, pullim row 만 유일).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_sub ON users(sub) WHERE sub IS NOT NULL;

-- row 종류 강제: legacy(email+password_hash 有, sub NULL) XOR pullim(email+password_hash NULL, sub 有).
-- 더미 email/해시로 pullim row 를 만드는 것(§5.6 PII 분리 위반)·혼선 row 를 차단.
-- (ADD CONSTRAINT 는 IF NOT EXISTS 미지원 → pg_constraint 가드로 재실행 안전.)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_legacy_xor_pullim'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_legacy_xor_pullim CHECK (
      (email IS NOT NULL AND password_hash IS NOT NULL AND sub IS NULL)
      OR (email IS NULL AND password_hash IS NULL AND sub IS NOT NULL)
    );
  END IF;
END $$;
