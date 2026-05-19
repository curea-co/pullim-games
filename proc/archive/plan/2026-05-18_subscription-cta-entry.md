# 2026-05-18 — 구독/결제 CTA 진입점

- **상태**: ACCEPTED (2026-05-18) — §1 합의 완료. D1~D5 모두 A 채택 (관리 탭 신설, /manage/billing, 라벨 "결제", placeholder + mock toast, 정책 별 plan). 오늘 진행 범위 = Phase 1 (탭 + placeholder).
- **트리거**: 사용자 피드백 — "GNB에 결제(구독) 접근 CTA 필요. GNB 직접 X. 사용자 메뉴 vs '관리' 탭 신설 중 잘 판단."
- **메모리 룰**: 하이퍼캐주얼 + 학습효과 우선 (memory: feedback_scale_hypercasual / feedback_design_priorities). 결제 UI는 학습 흐름 방해 최소화.
- **연관 spec**: `proc/spec/05-비즈니스-정책.md` (현재 결제·구독 명세 0).

---

## 0. 현 상태 분석

### A. 결제·구독 — 미구현 (0건)
- 코드베이스 grep — `subscription`/`billing`/`payment`/`premium`/`pricing`/`plan(요금제)` 0 매치.
- `proc/spec/05-비즈니스-정책.md` 에 결제·구독 정책 부재.
- V1 = 비로그인 (browser fingerprint), V2+ Magic link/SSO 검토 상태.

### B. 사용자 메뉴 — 부재
- `src/components/shell/app-header.tsx` 우측 영역에 검색·알림·프로필 placeholder만 (미구현).
- 사용자 드롭다운 메뉴 X. V0.4+ 예정.

### C. 관리 페이지 탭 — 5개
- `src/components/manage/ManageNav.tsx`:
  1. `/manage` 홈
  2. `/manage/subjects` 과목
  3. `/manage/curriculum` 교육과정
  4. `/manage/content` 콘텐츠 입력
  5. `/manage/custom-games` 내 게임

### D. GNB nav-config — 4개 항목
- `nav-config.ts`: 홈 / 게임 허브 / 관리 / 소개하기. 사용자 메뉴 X.

---

## 1. 추천 — "관리" 탭 신설 (`/manage/billing`)

### A. 진입점 위치 결정 (단일 추천)

| 옵션 | 진입성 | 자연스러움 | 작업 폭 | 채택 |
|---|---|---|---|---|
| (A) "관리" 탭 신설 (`/manage/billing` 또는 `/manage/plan`) | 중 — 1단계 (관리 진입 → billing 탭) | 높음 — 관리는 학습 환경 관리, 결제는 학습 환경 일부 | 작음 — 기존 ManageNav 6번째 항목 + 페이지 1개 | **✅ 채택** |
| (B) 사용자 메뉴 드롭다운 신설 + 결제 항목 | 높음 — 직접 진입 | 약함 — V1 비로그인, "사용자" 개념 약함. 드롭다운 신설 폭 ↑ | 큼 — 메뉴 시스템 신설 + 결제 항목 | 배제 |
| (C) GNB 우측 영역 칩 ("내 플랜" 텍스트) | 높음 — 항상 노출 | 약함 — GNB 4개 항목 + 칩 = 시각 부담. 학생용 학습 게임 톤 위배 | 중 — header 우측 슬롯 컴포넌트 | 배제 |

→ **A 채택**. 

**판단 근거**:
1. **V1 비로그인** → 사용자 메뉴는 placeholder. 결제 진입을 빈 메뉴에 넣는 건 부자연.
2. **관리는 이미 학습 환경 hub** → 과목·교육과정·콘텐츠·내 게임이 모두 학생 학습 환경 관리. 결제(=학습 환경 활성/확장)도 같은 카테고리.
3. **하이퍼캐주얼 톤** → GNB·헤더에 결제 CTA 노출은 PVE 학습 게임의 캐주얼한 느낌과 어긋남. 관리 탭 안에 두면 의도적 진입.
4. **작업 폭 최소** → ManageNav 6번째 탭 + placeholder 페이지 1개. 사용자 메뉴 시스템·GNB 칩 슬롯 신규 추가 X.

### B. 진입 보강 (옵션 — Phase 2 별 PR)

(B-1) 홈 대시보드 — 와이드 view 우상에 작은 "내 플랜: 무료 · 업그레이드 보기" 텍스트 링크. 모바일 미노출.
(B-2) GNB 우측 영역 — 사용자 메뉴 V0.4+ 도입 시 함께 통합. 현 단계는 X.

→ Phase 1 핵심은 **관리 탭 진입만**. 보강은 Phase 2 (별 PR).

### C. 페이지 내용 — V1 placeholder

V1 단계 (오늘):
1. **현 플랜 상태** — "무료 (V1 모든 기능 사용 가능)".
2. **유료 플랜 비교 (placeholder)** — "준비 중. V2 정식 출시 시 안내" + 무료/유료 예상 차이 1~3줄 (예: 광고 제거·custom 게임 무제한 등 — 정책 합의 후 확정).
3. **알림 신청 CTA** — "출시 알림 받기" 이메일 입력 (V2 출시 시 push 발송). placeholder 동작 — 입력 → "신청 완료" 토스트만 (실제 저장은 별 plan).
4. **정책 안내** — `proc/spec/05-비즈니스-정책.md` 결제 정책 §링크 (별 plan에서 작성).

→ 결제 연동 (Stripe/Toss·구독 라이프사이클) **본 plan 비스코프**. V2 정식 출시 별 plan.

---

## 2. 결정점

### D1 — 진입점 위치
- **(A 추천)** "관리" 탭 신설.
- (B) 사용자 메뉴 드롭다운 신설.
- (C) GNB 칩.

→ A 채택.

### D2 — 라우트명
- **(A 추천)** `/manage/billing` — 영문 명확, 검색·기록 친화.
- (B) `/manage/plan` — 짧음, "요금제"와 결.
- (C) `/manage/subscription` — 길지만 의미 명확.

→ **A 채택** (`/manage/billing`). 다른 라우트(`/manage/subjects`·`/manage/curriculum`)도 영문이라 일관성.

### D3 — 탭 라벨 (한국어)
- **(A 추천)** "결제" — 짧고 명확.
- (B) "요금제" — 가격 비교 hint.
- (C) "구독" — 정기 결제 hint.

→ **A 채택**. V2 정식 가격 책정 전이라 "요금제" 단정 회피. "결제" 가 가장 중립.

### D4 — V1 페이지 동작 강도
- **(A 추천)** placeholder + 알림 신청 (실제 저장은 mock — 신청 완료 토스트만).
- (B) 알림 신청 진짜 저장 (Vercel KV 또는 외부 form 서비스). V2 ready 시 push.
- (C) "준비 중" 만 — 알림 신청 X.

→ **A 채택** (mock toast). 본 plan 비스코프 분리 — 진짜 저장은 V2 출시 plan.

### D5 — 정책 명세 위치
- **(A 추천)** 본 plan은 **UI 진입점만**. 정책(가격·기능 비교·법적 약관)은 별 plan + `proc/spec/05-비즈니스-정책.md` §결제·구독 신규.
- (B) 본 plan에서 정책 함께 작성.

→ A 채택. 영역 분리 — UI 진입 / 정책·연동은 별 트랙.

---

## 3. 작업 항목

### Phase 1 — 관리 탭 + placeholder 페이지 (PR #N5)
- [ ] `src/app/manage/billing/page.tsx` 신규 — 4 섹션 (현 플랜 / 유료 placeholder / 알림 신청 / 정책 안내).
- [ ] `src/components/manage/ManageNav.tsx` — 6번째 탭 "결제" (`/manage/billing`) 추가. 순서: 홈 / 과목 / 교육과정 / 콘텐츠 / 내 게임 / **결제** (오른쪽 끝).
- [ ] `src/app/manage/billing/loading.tsx` (Skeleton — 선택, 다른 manage 페이지 패턴 따름).
- [ ] 알림 신청 form — toast `"신청 완료"` (실제 저장 X).
- [ ] e2e — `/manage/billing` 진입 200 + 4 섹션 렌더 + 알림 신청 → 토스트.

### Phase 2 — 진입 보강 (옵션, 별 PR — 사용자 합의 시 진입)
- [ ] 홈 대시보드 우상 "내 플랜: 무료" 텍스트 링크 (와이드만).
- [ ] 또는 GNB 우측 사용자 메뉴 V0.4 도입 시 통합.

### Phase 3 — 검증 + audit 갱신
- [ ] typecheck/lint PASS.
- [ ] vitest 회귀 0.
- [ ] e2e 회귀 0 + billing 라우트 신규 spec.
- [ ] plan §1~§2 [x] 완결 → archive.

---

## 4. 비스코프 (별 plan 트리거)

- **결제 연동** (Stripe/Toss) — V2 출시 plan.
- **구독 라이프사이클** (활성·만료·갱신·취소) — V2 plan.
- **가격·기능 비교 정책** — `proc/spec/05-비즈니스-정책.md` §결제·구독 신설 별 plan.
- **알림 신청 진짜 저장** — Vercel KV 또는 외부 form 서비스. V2 ready 시 별 plan.
- **법적 약관** (이용약관·환불정책·개인정보 처리방침 결제 부분) — V2 plan.
- **사용자 메뉴 드롭다운** — V0.4+ 별 plan. 도입 시 결제 진입 통합 검토.
- **GNB 우측 결제 칩** — 영구 배제 (하이퍼캐주얼 톤 위배).

---

## 5. 영향도

| 영역 | 변경 | 추정 LOC |
|---|---|---|
| `src/app/manage/billing/page.tsx` (신규) | placeholder 페이지 | ≈80 |
| `src/components/manage/ManageNav.tsx` | 6번째 탭 추가 | +3 |
| `src/components/manage/billing/` (선택, 신규 폴더) | 섹션 컴포넌트 분리 시 | ≈+60 |
| e2e | `/manage/billing` spec 신규 | ≈+30 |

→ 총 ≈+170 LOC 추가. 1 PR 단일 머지 (Phase 1).

---

## 6. 사용자 합의 필요 항목

§2 D1~D5 채택안 5건 + 오늘 진행 범위 (Phase 1 머지 / plan만 머지) — 합의 후 진입.
