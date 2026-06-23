# pullim-games 타겟 재포지셔닝 — 고등 → 중등

**작성일**: 2026-06-23
**작성자**: 사용자(G1) 결정 + claude
**상태**: IN PROGRESS — 방향·spec 수정 G1 승인("이제 개발 들어가" 2026-06-23). §2.1 코드 + §2.2 spec 적용 완료, §2.3 정합(회원 학년)은 pullim-api 통합 트랙과 합류, 콘텐츠 재보정은 후속 PR.
**근거**: 사용자(G1) 결정 (2026-06-23) — "고등은 게임 안 할 것 같다, 중등 타겟으로 가자."

## 0. 배경 — 3분할 확정

풀림 게임 제품군의 학령 분할이 플랫폼(pullim-api) 문서로 확인됨:

| 학령 | 제품 | 근거 |
|---|---|---|
| **초등(14세 미만)** | **풀림 주니어** — 별도 앱·별도 구독·별도 가격표·COPPA 가드 | pullim-api `plan.md §95·§313`("주니어=초등 별도앱"), `config-catalog §180`(`TIERS[junior]`), `README #19`(COPPA) |
| **중등** | **pullim-games** ← **본 재포지셔닝의 신규 타겟** | 본 plan |
| **고등** | 대상 아님 (G1: "고등은 게임 안 할 것 같다") | — |

→ 따라서 pullim-games 는 **초등 콘텐츠를 만들지 않는다**(주니어 영역). 기존 "고등 전과목" 포지셔닝을 **중등**으로 이동한다.

## 1. 현황 — 왜 콘텐츠 재보정인가 (삭제 아님)

현재 17개 정식 게임은 전부 고등(高) 콘텐츠. 그러나 **상당수 주제가 중등 교육과정에도 존재**해 메커니즘을 유지한 채 콘텐츠/난이도만 중등으로 재보정 가능하다. 4개 메커니즘(`Blank·QuickQuiz·Typing·WordMatch`)은 학령 무관.

### 1.1 게임 분류

| 분류 | 게임 | 중등 교육과정 근거 |
|---|---|---|
| **중등 재보정** (메커니즘 유지·콘텐츠 교체) | factorization | 중3 다항식의 인수분해 |
| | math-graph-shift | 중2 일차함수·중3 이차함수 평행이동 |
| | math-quick-quiz | 중등 단원 콘텐츠 교체 |
| | bio-taxonomy | 중1 과학 생물의 분류 |
| | genetics-punnett | 중3 과학 유전 |
| | image-hotspot | 중1 과학 식물 구조 |
| | korean-pos-tagging | 중등 국어 9품사 |
| | history-timeline | 중2·중3 역사 |
| | letter-assembly / vocab-typing | 중등 한문·어휘 |
| | english-blank/order/vocab-typing/word-match, cloze-multi | 수능 어휘·어법 → 중등 영어 어휘·문법으로 교체 |
| | custom-{blank,multiple-choice,typing,word-match} | 학령 무관(사용자 입력) |
| **고등 전용 → 보관(hide)** | **physics-vector** | 벡터 = 고등 물리 (중등 부재) |
| | **chemistry-balance** | 몰·화학반응식 균형 = 고등 편향 → **보관 결정**(2026-06-23, 잘못 레벨링된 콘텐츠 노출 회피. 중등 재보정 시 `stage` 해제) |

→ 보관 대상 2개(`stage:"high"`). 본체 작업 = ~19개 콘텐츠 중등 재보정(점진 후속 PR).

## 2. 변경 항목

### 2.1 코드 (games repo — 본 plan 트랙)
- [x] `lib/core/player/index.ts` `GRADES`: `초1~고3` → **`중1·중2·중3`**. `Grade` 타입 자동 축소. `StartForm` 드롭다운 자동 중등화. catalog-loader 는 독립 `CatalogGradeBand` 사용 — 비영향.
  - **마이그레이션(Codex #125)**: 구 grade(초·고) 또는 손상 프로필 감지 시 `getPlayer()` 가 `clearPlayer()` 호출 — 스토리지+`pullim_games_guest` 쿠키 동시 정리. 안 그러면 middleware 가 stale 쿠키로 보호 라우트 통과 + 클라만 무신원 = split-brain(+ auth 장애 시 fail-open 노출). `player.test.ts` 신설로 잠금.
- [x] 게임 노출 제어: `GameMeta.stage?: "middle" | "high"` 추가 + `registry.visibleGames`(stage:"high" 제외). **발견(discovery) 표면만 전환** — 허브(`GameHubPage`)·추천(`RecommendationCard`)·소개(`about`). 라우팅(`getGameById`/`getAllGameIds`)·custom 관리·**대시보드 총합 KPI는 전체 `games` 유지**(보관 게임 직접 URL 플레이 기록도 총계 포함). 단 `dashboard/stats`의 **`perGame`(노출 카드 목록)은 보관 제외** — /home CompactActivity 로 고등 게임 재노출 차단(Codex #125 R2). `physics-vector`·`chemistry-balance` = `stage:"high"`. `registry.test.ts` 신설.
- [x] **회원가입(/signup) 학년 수집(Codex #125 R2)**: `AuthForm` grade `<select>`(중1~중3, StartForm 미러) + `SignupSchema.grade`(`isGrade` refine) + `createUser(grade)` + `migrations/0003_user_grade.sql`(users.grade nullable) + `toPublicUser`/`/me` 노출. 게스트(/start)·회원(/signup) **양 진입점에서 중등 학년 수집·검증** → "중등만 대상" 계약을 회원 경로에서도 판정 가능. `data-cta-priority` 로 보조 footer 링크 audit 통과.
- [x] **회원가입 연령/동의 모델 통일(Codex #125 R3, G1 승인 Option A)**: `over14`(만14세 이상 only) → **`consent`**(게스트 §5.2 와 동일 honest 단일 동의 — "만14세 이상" 또는 "14세 미만+보호자 동의"). 중등 타겟엔 만14세 미만(중1 등) 포함이라 구 게이트가 타겟 사용자 회원 경로 영구 차단하던 문제 해소. `AuthForm`/`schemas`/`client` 동기 변경, 체크박스 카피 StartForm 미러.
- [x] **보관 게임: "집계는 전체, 발견 노출만 visible"(Codex #125 R1·R2·R4·R5 수렴)**:
  - **학습 magnitude 집계(전체 `games`)** — `gamesPlayed`·`totalAttempts`/`Lapses`·`todayAttempts`·`dueSoonCount`·sync. 보관 게임 직접 URL 플레이 기록도 누락 없이 반영(단일 FSRS 백본 불변).
  - **발견(discovery) 노출(visible)** — 허브 그리드·**오늘의 추천 후보 선택**(`RecommendationCard`)·about 쇼케이스·stats `perGame`(노출 카드 목록). 추천은 `GameMeta.stage` 계약상 발견 표면이라 보관 게임을 /home·/games 히어로로 재노출하지 않음.
  - (수렴 과정: R3 gamesPlayed visible 축소 → R4 magnitude 전체 복원 → R5 추천만 visible → R8 empty-state 카운트 분리. 최종 = 집계 전체 / 발견 노출 visible.)
  - **R8·R9 (홈 판정 분리 최종)**: `DashboardStats.visibleGamesPlayed`(노출 게임 플레이 수) 신설. **빈 상태(첫 사용자) 판정 = 전체 `gamesPlayed`**(실제 이력 — 보관만 플레이한 사용자도 빈 상태로 안 되돌림, R9), **헤더 문구·활동 목록만 `visibleGamesPlayed`/`perGame`**(discovery, R8 의 "false N개 만났어요" 차단). `/about` 도 `kind==="official"` 추가(custom-* 게임이 소개 게임 수·메커닉 쇼케이스 부풀리지 않게).
- [ ] 게임 콘텐츠 중등 재보정 — **게임별 후속 PR**(점진, 본 plan 범위는 분류·골격·노출제어까지).

### 2.2 권위 문서 (spec — G1 승인 "이제 개발 들어가" 2026-06-23)
- [x] `spec/02-제품-정의.md`: §2.1 "고등 전과목"→"중등 전과목", §2.4 Primary "고등학생"→"중학생"+민서(고1 17세)→민서(중2 14세), §2.5 V1 단원 "고1 공통수학 인수분해"→"중3 수학 인수분해", 수능→시험.
- [x] `spec/10-개발-로드맵.md`: "고등학생 5명/20명" → 중학생.
- [x] `spec/07-브랜딩.md`: 학령 직접 언급 없음(grep 0) — 검토만, 수정 불요.
- [x] `spec/05-비즈니스-정책.md §5.6`: 계정 가입 정책 `over14`-only → **honest consent**(게스트와 동일, 만14세 미만+보호자 동의 허용). 중등 타겟 정합 + Codex #125 R3 (G1 승인 2026-06-23). 구 정책(Codex #114 R3)은 본 개정으로 대체. 실효적 법정대리인 동의 검증은 pullim-api ADR-033 중앙 위임 시 정착.

### 2.3 정합성
- [ ] #124 pullim-api 핸드오프(별 PR): (a) "games = 플랫폼 `games` 패키지·서비스, `junior`(주니어) 아님" 1줄, (b) **회원 프로필에 `grade`(중1~중3) 필드** 추가 — games-local `users.grade`(0003)는 P4 중앙 인증 이관 시 pullim-api 회원 프로필로 이동. 학습데이터 위임 시 학령 혼선 방지.
- [x] 학년 입력 진입점 정합: `StartForm`(게스트)·`AuthForm`(회원가입) **양쪽 모두 학년 수집** 완료. 회원 학년은 games-local `users.grade` 에 임시 저장(P4 시 pullim-api 이관).

## 3. 비목표 / 주의
- 게임 **삭제 없음** — 고등 전용도 보관(`지우지 말 것`, G1).
- 초등 콘텐츠 **신설 없음** — 풀림 주니어 영역.
- spec 수정은 G1 승인 전 금지(권위문서). 본 plan 은 델타 스테이징까지.
- 학령 게이트 vs 자동필터 UX: 초등 동기 소멸로 우선순위 낮음. 채택 시 "전체 노출 + 사용자 학년 자동 기본필터(변경 가능)" 안(B) 권장.
