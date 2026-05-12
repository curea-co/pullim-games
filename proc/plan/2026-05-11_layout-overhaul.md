# 레이아웃 정책 정비 (F1·F2·F3)

- **상태**: 확정 (2026-05-11) — 세 결정점 모두 추천안 채택
- **트리거**: design-review audit ([/tmp/pullim-games-design-audit-20260511/design-audit-pullim-games.md](/tmp/pullim-games-design-audit-20260511/design-audit-pullim-games.md)) Goodwill 52/100 — 빈 공간이 "밉다"의 주범
- **스코프**: 3개 레이아웃 결정 + 코드 변경. 디자인 묶음 PR로 진행

## 0. 확정안 (one-line)

| ID | 채택 | 핵심 |
|---|---|---|
| F1 | A | 홈 콘텐츠 max-w 캡 + 중앙 정렬 (640~720px) |
| F2 | B | 게임 페이지 minimal chrome — 사이드바 hidden, 헤더는 ✕ + 게임명 + 진행도 bar만 |
| F3 | B | GameShell aside slot 이 비면 lg+ 에서도 hide → 단일 컬럼 max-w 중앙 |

---

## 1. 풀고자 하는 문제

| ID | 증상 | 사용자 인지 |
|---|---|---|
| F1 | 홈 데스크탑 우측 ~330px 죽은 공간 | "미완성"·"비었다" |
| F2 | 게임 플레이 중 사이드바 + 헤더 + 브레드크럼 그대로 노출 | 몰입 깨짐, 5분 한판 무드 X |
| F3 | split 4개 게임 모두 lg+ 에서 우측 aside slot이 빈 흰 칸 | "여백인가 미완성인가" 모호 |

공통 원인: **"한 화면을 어디까지 채울 것인가"의 정책이 부재**. spec/09 §9.7 에 코드 구조는 있지만 "데스크탑에서 어디까지가 콘텐츠 영역인가"의 룰은 없음.

---

## 2. 갈래 — 정책 결정점 (사용자 합의 필요)

### 2.1 F1 홈 데스크탑

세 방향:

**A) max-w 캡 + 중앙 정렬 (가장 가벼움)**
- 콘텐츠 max-w를 640~720px 로 잡고 메인 칸 중앙 정렬
- 양옆 여백은 의도된 호흡으로 인지
- 작업량: globals/layout 한두 곳

**B) 좌 hero + 우 보조 영역 (대시보드 톤)**
- 좌측: 메인 카드 + CTA
- 우측: "최근 학습" / "오늘의 추천 2개" / "내 진행도"
- 작업량: 큼. 우측 영역의 데이터·로딩·empty state 별도 설계

**C) 풀폭 hero 카드 (게임 시작 명령형)**
- 화면 전체 폭(좌측 nav 제외)을 메인 카드가 차지
- sparkle + 헤딩 + CTA가 hero 한 덩어리
- 작업량: 중. nav 폭 조정도 같이

**recommend**: A. 학습 게임 컨셉 단계에선 우측 정보가 진짜 없음. "비었다" 인상의 원인이 "넓은데 안 채움"이라면 "처음부터 안 넓게" 가 솔직. B는 데이터·진행도 신호가 충분히 쌓인 V2~V3에 검토.

---

### 2.2 F2 게임 chrome — 어디까지 숨길까

**A) 전체 fullscreen (chrome 0)**
- 사이드바·헤더 전부 hidden, X 버튼만 우상단
- 가장 몰입. 다만 뒤로 가기·진행도 같은 단서가 모두 X 하나에 응축

**B) Minimal header만 (사이드바 hidden)**
- 좌 사이드바 collapse(또는 hidden)
- 상단에 ✕ + 게임명 + 진행도 bar만
- 검색/알림/아바타 제거

**C) 현 chrome 유지 + 게임 영역만 강조**
- chrome은 그대로, 단 max-w로 게임 캔버스를 명확한 박스로 그림
- 가장 가벼움, 대신 몰입은 한계

**recommend**: B. 5분 한판 모델에 fullscreen은 과함(언제든 빠져나가야), C는 "밉다"가 안 풀림. B는 검색/알림 같은 학습과 무관한 chrome만 제거.

---

### 2.3 F3 aside slot — 노출 정책

spec/qa-playwright-setup §4.5 에 "split = lg+ aside 노출" 적혀 있지만 현재 콘텐츠 부재.

**A) 콘텐츠 채우기 — 모든 split 게임 공통 aside 콘텐츠 정의**
- 진행도 바 + 힌트 토글 + 예시 카드 + "다음 카드 미리보기"
- 정의 후 게임마다 채움

**B) 콘텐츠 없으면 aside 숨김**
- GameShell 의 aside slot prop 이 비어있으면 lg에서도 hide
- 단일 컬럼 max-w 게임 영역 중앙 정렬
- F2 와 자연 결합

**C) 슬롯 자체 제거**
- aside 정책을 spec 에서 retire
- 모든 게임 단일 컬럼

**recommend**: B를 V1 — 콘텐츠 없으면 숨김. F2(chrome minimal)와 같이 가면 "게임 캔버스 + 진행도 bar" 깔끔. A는 V2 — 실제 학습 데이터 쌓이고 힌트/예시 노출 가치가 생기면.

---

## 3. 추천 묶음 (제일 가벼운 방향)

| 항목 | 추천 | 작업량 |
|---|---|---|
| F1 | A — max-w 캡 + 중앙 정렬 | S |
| F2 | B — minimal header (사이드바 hidden, ✕ + 게임명 + 진행도 bar) | M |
| F3 | B — aside slot 콘텐츠 없으면 hide | S |

세 가지 모두 "안 채움 > 채움" 방향. 학습 게임 컨셉 단계에 맞고, "밉다" 의 원인인 빈 공간을 **레이아웃에서 제거** 함.

---

## 4. 비 추천 — 갈 만한 길이 아닌 이유

- F1-B (대시보드) → 데이터 신호 없음. 빈 카드 채우려고 더 빈 카드 만들기
- F2-A (full fullscreen) → 학습 중단 의지를 매번 X 버튼으로 표현해야 함. 5분 학습 자유도 ↓
- F3-A (콘텐츠 채우기) → 게임마다 aside 데이터 정의 작업 큼. spec/06 카드 데이터에도 영향

---

## 5. 작업 항목 + 자가 검증

머지 후 다음 체크리스트로 자가 검증.

- [ ] spec/09 §9.7 에 "콘텐츠 영역 max-w 정책" 추가
  - **검증**: 9.7 끝에 표 형태로 페이지 타입 × max-w 정책 행 존재
- [ ] [src/app/page.tsx](src/app/page.tsx) 홈 콘텐츠 max-w 캡 (≤ 720px 중앙)
  - **검증**: 데스크탑 1280px 뷰에서 메인 카드·CTA 컬럼이 좌우 균형 (우측 ~330px 죽은 공간 0)
- [ ] [src/app/games/\[gameId\]/layout.tsx](src/app/games/[gameId]/layout.tsx) 신설 — 게임 페이지에 chrome minimal 적용
  - **검증**: `/games/factorization` 데스크탑에서 사이드바 영역 hidden, 헤더는 ✕(뒤로) + 게임명 + 진행도 bar
- [ ] [src/components/shell/app-shell.tsx](src/components/shell/app-shell.tsx) `variant` prop 추가 — `"default" | "game"`
  - **검증**: variant="game" 시 사이드바 컴포넌트 자체 미렌더 (DOM 부재)
- [ ] [src/components/shell/app-header.tsx](src/components/shell/app-header.tsx) `variant="game"` 추가 — 검색/알림/프로필 제거, ✕ + 게임명 + thin progress 노출
  - **검증**: 게임 페이지 헤더에 검색·알림 버튼 DOM 부재
- [ ] [src/components/game-shell/GameShell.tsx](src/components/game-shell/GameShell.tsx) — `header`/`cta` 외에 콘텐츠가 없는 split 의 우측 aside 영역 제거. 게임이 별도 aside 콘텐츠를 prop 으로 안 넘기면 단일 컬럼 max-w 중앙
  - **검증**: 4개 split 게임(quick-quiz, chemistry, word-match, ...) 데스크탑에서 게임 영역이 화면 중앙 max-w 안에 정렬 (우측 빈 흰 칸 0)
- [ ] e2e [e2e/viewport.spec.ts](e2e/viewport.spec.ts) — 게임 페이지 데스크탑에서 사이드바 nav DOM 부재 케이스 추가
  - **검증**: `bun run test:e2e` 60 + 신규 케이스 green
- [ ] design-audit 보고서의 F1·F2·F3 fix-status "verified" 표기
  - **검증**: before/after 캡처 첨부

---

## 6. 자가 검증 결과 (2026-05-11 머지 직전)

- [x] spec/09 §9.7 — "콘텐츠 영역 max-w 정책" 표 추가 + "Chrome 분기" 단락 추가
- [x] [src/app/page.tsx](../../src/app/page.tsx) `<main>` 에 `mx-auto max-w-[720px]` 적용
- [x] AppShell — pathname 자동 분기 (variant prop override 가능). game variant 시 사이드바·breadcrumb 미렌더
- [x] AppHeader — variant="game" 추가. ✕(`/games`) + 로고만, 검색/알림/프로필 placeholder 제거
- [x] GameShell — `aside?: ReactNode` prop. split + aside 미지정 시 lg+ 단일 컬럼 max-w-[640px] 폴백
- [x] e2e 60/60 green (19.6s) — viewport.spec.ts 회귀 없음
- [x] typecheck ✓ · lint ✓
- [x] before/after 캡처 — `/tmp/pullim-games-design-audit-20260511/screenshots/` (F1-after, F2-factorization-after, F3-quickquiz-after, F3-chemistry-after)

추가 관찰:
- 게임 페이지 메인 진입로가 `/games` 게임 허브로 일관됨 (✕ 클릭 시 허브 복귀). 이전엔 사이드바로 임의 이동 가능
- chemistry-balance 의 "균형 확인" CTA 가 단일 컬럼 전환 시 풀폭 outline 버튼으로 자연 정렬 — 별 수정 불필요
- design Score / Goodwill 재측정은 본 PR 머지 후 design-review 재실행으로 확정 (별 작업)
