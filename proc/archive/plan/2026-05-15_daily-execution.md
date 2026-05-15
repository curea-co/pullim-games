# 2026-05-15 (금) 일일 실행 계획

## 목표
어제 잔존 PR 2건(#45, #46) 머지·배포 + correct-feedback 미커밋분 PR화·머지·자가검증 완결 + factorization-discrimination 방향 합의 + design-audit v2 재실행으로 21 게임 findings 0 또는 신규 트랙 확정.

## 작업 항목

### 1. 어제 잔존 PR 머지 (PR #45 / #46) ✅
- [x] PR #45 (UX-1 bio-taxonomy SSR/CSR hydration) 머지 전 regression risk 점검 — bio-taxonomy 단독, SAFE
- [x] PR #45 머지 (사용자 `vercel --prod` 수동 배포 + flash 시각 확인은 production 단계)
- [x] PR #46 (UX-3 image-hotspot 모바일 44×44 hit area) 머지 전 regression risk 점검 — HotspotCanvas 단독, region 좌표 충분히 떨어짐, SAFE
- [x] PR #46 머지 (사용자 `vercel --prod` 수동 배포 + DevTools 검증은 production 단계)

### 2. correct-feedback PR화·머지 (plan: 2026-05-14_correct-feedback-and-5x-reveal.md) ✅
- [x] 미커밋 변경 diff 분석 → **단일 PR** 결단 (16 진입점 공통 패턴, 분리 시 정합성 점검 부담)
- [x] PR #47 생성 — `CorrectBurst.tsx` · `RevealBanner.tsx` · `useAttemptCounter.ts` 신규 + 4 메커니즘 + 12 게임 + audit 갱신
- [x] PR #47 머지 (production dogfooding은 사용자 단계 — §3 참조)

### 3. correct-feedback 잔여 자가검증 ✅
- [x] `e2e/correct-feedback-reveal.spec.ts` 신규 작성 — vocab-typing 5회 wrong → reveal e2e
- [x] e2e spec pass 확인 — 1/1 PASS (CI 포함)
- [x] manual dogfooding 체크리스트 2건 작성 (사용자 production 배포 후 단계로 위임)
- [x] correct-feedback plan §작업항목 [x] 완결 → `proc/archive/plan/2026-05-14_correct-feedback-and-5x-reveal.md` 이관 (PR #48 동봉)

### 4. factorization-discrimination plan 리뷰·합의 + Phase 1 진입 ✅
- [x] plan §1~§5 요약 (drag-to-chip + chip 후보 생성 알고리즘)
- [x] 오늘 진입 / 내일 이월 분리안 — Phase 1 schema/logic 만 오늘, Phase 2~5 별 PR
- [x] §1 drag-to-chip 메커닉 + §2 D1~D4 추천안 ACCEPTED → plan 본문 상태 줄 갱신
- [x] **§작업항목 1건 이상 PR 진입** — Phase 1 전체 (schema distractors + generateDistractors + test 6종) PR #48 진입+머지 완료 (목표 초과)

### 5. design-audit 재실행 ✅
- [x] 어제 audit v2 패턴 재사용 스크립트 식별 — `scripts/`에 audit 자동화 스크립트 부재. 수동 차원 (코드/CI/e2e 인용) 으로 진행
- [x] 21 게임 재검사 — typecheck/test(155/155)/e2e/CI 회귀 0 확인, 시각/인터랙션 차원은 사용자 dogfooding 위임
- [x] `proc/audit/2026-05-15_games-catalog-audit-v2.md` 신규 — v1 6 issue 100% 해소, 신규 finding 0 (코드 차원), 다음 트랙 factorization Phase 2~5 명시

## 블로커·운영 메모
- **Vercel 수동 배포**: webhook 복구 보류, `vercel --prod` 수동 배포로 영구 우회. 머지 ≠ 자동 production 반영 — production 자가검증은 사용자 수동 배포 후 시점.
- **correct-feedback PR 크기**: 15+ files modified + 신규 3 files. 단일 PR(리뷰 부하) vs 분리(정합성 점검 부담) — AI 추천안 채택 후 결정.
- **factorization-discrimination 현실 목표**: 메커닉 재설계 + 콘텐츠/checkAnswer/FSRS 연결까지 폭이 큼. 오늘은 합의 + 진입 단계까지가 현실 목표, 머지 완료는 비현실적.
- **비스코프**: 24 icon 시안 마무리·게임즈 할당은 디자인 트랙(사용자 본인) — AI continuation 없음.
