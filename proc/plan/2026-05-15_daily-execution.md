# 2026-05-15 (금) 일일 실행 계획

## 목표
어제 잔존 PR 2건(#45, #46) 머지·배포 + correct-feedback 미커밋분 PR화·머지·자가검증 완결 + factorization-discrimination 방향 합의 + design-audit v2 재실행으로 21 게임 findings 0 또는 신규 트랙 확정.

## 작업 항목

### 1. 어제 잔존 PR 머지 (PR #45 / #46)
- [ ] PR #45 (UX-1 bio-taxonomy SSR/CSR hydration) 머지 전 regression risk 1줄 점검 (hydration 변경의 다른 페이지 영향)
- [ ] PR #45 머지 → 사용자 `vercel --prod` 수동 배포 대기 → bio-taxonomy hydration flash 사라짐 시각 확인
- [ ] PR #46 (UX-3 image-hotspot 모바일 44×44 hit area) 머지 전 regression risk 1줄 점검 (hit area 확대의 다른 region overlap)
- [ ] PR #46 머지 → 사용자 `vercel --prod` 수동 배포 대기 → 모바일 viewport tap target ≥44×44 DevTools 검증

### 2. correct-feedback PR화·머지 (plan: 2026-05-14_correct-feedback-and-5x-reveal.md)
- [ ] 미커밋 변경 15+ files diff 분석 → PR 분리 단위 추천안 1줄 (단일 vs A 공통 인프라/B 4 메커니즘/C 12 게임/D 문서)
- [ ] 추천안 사용자 합의 → 선택된 분리 단위로 PR 생성 (`CorrectBurst.tsx`·`RevealBanner.tsx`·`useAttemptCounter.ts` 신규 + 4 메커니즘 + 12 게임 + audit 갱신)
- [ ] PR 머지 → 사용자 수동 배포 → 4 메커니즘 + 12 게임 정답 시 CorrectBurst 노출 / typing 5회 wrong → RevealBanner + 정답 공개 dogfooding

### 3. correct-feedback 잔여 자가검증
- [ ] `e2e/correct-feedback-reveal.spec.ts` 신규 작성 — typing 5회 wrong → reveal e2e 1건
- [ ] e2e spec pass 확인
- [ ] manual dogfooding 체크리스트 2건 작성·체크 (CorrectBurst 정답 노출 / RevealBanner 5회 후 노출)
- [ ] plan §작업항목 [x] 완결 → `proc/archive/plan/2026-05-14_correct-feedback-and-5x-reveal.md` 이관

### 4. factorization-discrimination plan 리뷰·합의 (plan: 2026-05-14_factorization-discrimination.md)
- [ ] plan §1~§5 요약 (drag-to-chip 메커닉 + chip 후보 생성 알고리즘 중심)
- [ ] 오늘 진입 가능 작업항목 vs 내일 이월 권장 항목 분리안 작성
- [ ] §1 메커닉 방향(drag-to-chip) 사용자 합의 → plan 본문에 합의 메모 추가
- [ ] §작업항목 1건 이상 PR 진입 (`feat/factorization-discrimination` 브랜치 + 첫 커밋) **또는** 작업 폭 과대 판단 시 `proc/archive/plan/` 이관(보류)

### 5. design-audit 재실행 (v2 패턴)
- [ ] 어제 audit v2 패턴(production 21 게임 visual + 인터랙션 simulation) 재사용 스크립트 식별 또는 신규 작성
- [ ] 21 게임 재검사 — 특히 BUG-2 fix 후 factorization + CorrectBurst 통합 후 4 메커니즘
- [ ] `proc/audit/2026-05-15_games-catalog-audit-v2.md` 신규(또는 v2 본문 갱신) — findings 0 또는 신규 트랙 plan 1건 이상 작성

## 블로커·운영 메모
- **Vercel 수동 배포**: webhook 복구 보류, `vercel --prod` 수동 배포로 영구 우회. 머지 ≠ 자동 production 반영 — production 자가검증은 사용자 수동 배포 후 시점.
- **correct-feedback PR 크기**: 15+ files modified + 신규 3 files. 단일 PR(리뷰 부하) vs 분리(정합성 점검 부담) — AI 추천안 채택 후 결정.
- **factorization-discrimination 현실 목표**: 메커닉 재설계 + 콘텐츠/checkAnswer/FSRS 연결까지 폭이 큼. 오늘은 합의 + 진입 단계까지가 현실 목표, 머지 완료는 비현실적.
- **비스코프**: 24 icon 시안 마무리·게임즈 할당은 디자인 트랙(사용자 본인) — AI continuation 없음.
