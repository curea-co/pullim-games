-- 회원 학년(중등 타겟) 컬럼 추가 (2026-06-23).
-- 근거: proc/plan/2026-06-23_middle-school-repositioning.md + Codex #125.
-- 중등 재포지셔닝 — 게스트(/start)뿐 아니라 회원가입(/signup) 진입점에서도 학년을 수집해
-- "중등만 대상" 규칙을 양 경로에서 판정 가능하게 한다. nullable: 레거시 회원(학년 도입 전)
-- 호환 + prod 데이터 0(클린). 신규 가입은 API 스키마(z.refine isGrade)가 중1~중3 강제.
-- ⚠️ SUPERSEDED (2026-07-05, spec/05 §5.2⒜⑵·§5.6): 구 "P4 pullim-api 회원 프로필 이관" 노트 폐기.
-- grade 는 콘텐츠 preference(identity 아님)라 pullim-api 이관하지 않고 games-side 존치 —
-- 중앙 signup 이 grade 미수집·auth 스키마에 grade 부재. 이 컬럼은 pullim 모드에서도 회원 grade
-- projection(sub 귀속)으로 계속 사용(§9.3 키 모델). 근거: 2026-07-03 delegation plan §2-D P-A⑵.
ALTER TABLE users ADD COLUMN IF NOT EXISTS grade TEXT;
