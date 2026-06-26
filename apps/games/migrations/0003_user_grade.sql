-- 회원 학년(중등 타겟) 컬럼 추가 (2026-06-23).
-- 근거: proc/plan/2026-06-23_middle-school-repositioning.md + Codex #125.
-- 중등 재포지셔닝 — 게스트(/start)뿐 아니라 회원가입(/signup) 진입점에서도 학년을 수집해
-- "중등만 대상" 규칙을 양 경로에서 판정 가능하게 한다. nullable: 레거시 회원(학년 도입 전)
-- 호환 + prod 데이터 0(클린). 신규 가입은 API 스키마(z.refine isGrade)가 중1~중3 강제.
-- pullim-api 중앙 인증 위임(P4) 시 이 컬럼은 pullim-api 회원 프로필로 이관(핸드오프 §A).
ALTER TABLE users ADD COLUMN IF NOT EXISTS grade TEXT;
