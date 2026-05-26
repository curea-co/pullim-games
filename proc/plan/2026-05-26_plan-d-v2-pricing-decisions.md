# 2026-05-26 — Plan D 후속: V2 결제 정책 D2~D7 비즈니스 결정 트랙

- **상태**: DRAFT (2026-05-26) — G1·G3·G4 합의 의무. [`2026-05-19_plan-d-v2-billing-and-sanitize.md`](./2026-05-19_plan-d-v2-billing-and-sanitize.md) Phase 1 의 D2~D7 항목 별 트랙 분리 (사용자 합의 2026-05-26).
- **트리거**: plan-d 본 plan 의 Phase 1 D5·D1 합의 후 D2~D7 매트릭스가 spec/05 §5.7.2 에 미합의 상태로 잔존. plan-d 본문 그대로 두면 한 plan 에 합의/미합의 트랙이 섞여서 archive 시점이 불명확. **결단력 룰**: 갈래를 분리해서 독립 트랙으로.
- **연관**: `proc/spec/05-비즈니스-정책.md §5.7`, `proc/audit/2026-05-26_games-catalog-audit-v5.md §8.3` (D2~D7 합의 권장 순서).

## 0. 현 상태

### A. plan-d 본 plan 의 D5·D1 합의 (완료)

- **D5 결제 게이트웨이** = Toss Payments (2026-05-20, AI 리서치 4 axis 비교 결과 1순위)
- **D1 V2 출시 시점** = 2026 Q4 (2026-05-22, 추천안 (B) 채택)

### B. D2~D7 미합의 (본 plan scope)

| 결정점 | 내용 | 매트릭스 위치 |
|---|---|---|
| D2 | 가격 모델 (월 구독 / 연 구독 / 일회성 / freemium) | `proc/spec/05 §5.7.2` |
| D3 | 무료 vs 유료 기능 비교 | `proc/spec/05 §5.7.2` |
| D4 | 가격대 (목표 가격) | `proc/spec/05 §5.7.2` |
| D6 | 환불 정책 | `proc/spec/05 §5.7.2` |
| D7 | 학생 할인·체험판 | `proc/spec/05 §5.7.2` |

### C. 합의 권장 순서 (audit v5 §8.3)

**D4 → D2 → D3 → D6 → D7**. D1 (2026 Q4) 기준 역산 시 가격 정의 (D4·D2) 가 가장 선행. D3 기능 비교는 D2 모델 따라 가변. D6·D7 는 D2·D4 후.

근거: [`proc/audit/2026-05-26_games-catalog-audit-v5.md`](../audit/2026-05-26_games-catalog-audit-v5.md) §8.3.

## 1. 추천 설계 — Per-decision plan-iteration

각 결정점마다 옵션 매트릭스 + 4 axis 비교 (AI 리서치 → 사용자 합의 → spec/05 §5.7.1 이동) 의 본 plan-d Phase 1 패턴을 그대로 따른다. D5 (Toss Payments) 합의 과정과 동일.

### Phase A — D4 (가격대) 우선

- AI 리서치: KR 학습 SaaS 시장 가격대 (메가스터디·이타스·아카데미X·뤼튼·노다지 등)
- 4 axis: 학습효과 정의 ROI · 학부모 결제 의향 · 경쟁자 가격대 · 풀림 차별화 가치
- 산출: 가격대 후보 3종 (저가/중가/프리미엄) → 사용자 합의 1개

### Phase B — D2 (가격 모델)

- D4 가격대 확정 후 모델 결정. 월 구독·연 구독·일회성·freemium·하이브리드 매트릭스
- 학습 SaaS 도메인 사례 (대다수 월 구독 + 일부 freemium) 분석

### Phase C — D3 (기능 비교)

- D2 모델 따라 freemium gating 또는 trial gating 정의
- 메모리 룰 (하이퍼캐주얼) 위반 X — RPG 식 unlock·뽑기 금지

### Phase D — D6 (환불)

- KR 전자상거래법·구독 해지 정책 베이스라인
- D2·D4 합의 후 자연 도출

### Phase E — D7 (학생 할인·체험판)

- BR-PAY3 (학생 보호) 와 연계. spec/05 §5.7 의 학생 보호 룰과 정합화

## 2. 결정점

본 plan 자체에는 결정점 0 — 각 Phase 가 plan-iteration 단위. Phase A 부터 시작 시 별 daily-outcome 또는 plan-D-A 식 sub-plan 분기.

## 3. 작업 항목

### 본 plan PR (2026-05-26)

- [x] plan-d 본 plan 에서 D2~D7 항목 본 plan 으로 이관 표기 (`[→]` 마커 + 링크)
- [x] 본 plan 신설 — Phase A~E 골격 + 합의 권장 순서 명시
- [x] plan-d 본 plan 본문 상태 갱신 — Phase 1 만 D2~D7 G3 합의 대기 명시

### Phase A — D4 (가격대) 합의 (별 PR)

- [ ] AI 리서치 — KR 학습 SaaS 가격대 비교 (대상 ≥5 종)
- [ ] 4 axis 매트릭스 작성 → 후보 3종 (저가/중가/프리미엄)
- [ ] G1·G3·G4 합의 → spec/05 §5.7.1 D4 항목 이동
- [ ] daily_outcome 기록

### Phase B — D2 (가격 모델) 합의 (별 PR, Phase A 후)

- [ ] D4 확정 가격대 기반 모델 매트릭스 (월/연/일회성/freemium/하이브리드)
- [ ] 학습 SaaS 도메인 사례 분석 ≥5 종
- [ ] G1·G3·G4 합의 → spec/05 §5.7.1 D2 항목 이동

### Phase C — D3 (기능 비교) 합의 (별 PR, Phase B 후)

- [ ] D2 모델 따라 freemium/trial gating 매트릭스
- [ ] 하이퍼캐주얼 룰 정합화 점검 (RPG unlock 금지)
- [ ] G1·G3·G4 합의 → spec/05 §5.7.1 D3 항목 이동

### Phase D — D6 (환불) 합의 (별 PR, Phase A·B 후)

- [ ] KR 전자상거래법 기반 baseline
- [ ] G1·G3·G4 합의 → spec/05 §5.7.1 D6 항목 이동

### Phase E — D7 (학생 할인·체험판) 합의 (별 PR, Phase A·B 후)

- [ ] BR-PAY3 (학생 보호) 정합화
- [ ] G1·G3·G4 합의 → spec/05 §5.7.1 D7 항목 이동

### 종결

- [ ] D2~D7 모두 합의 후 spec/05 §5.7.2 (미합의) 항목 0 → 본 plan archive

## 4. 비스코프

- **V2 결제 게이트웨이 실제 연동** (Toss Payments SDK 통합·webhook 처리·결제 흐름 e2e) — D2~D7 합의 후 별 plan
- **법적 약관** (이용약관·환불정책·개인정보 결제 부분) — 별 plan
- **`/manage/billing/page.tsx` 유료 플랜 preview 갱신** — D2·D3·D4 합의 후 본 plan Phase B·C 의 PR 에 포함

## 5. 영향도

| 작업 | 변경 | LOC |
|---|---|---|
| 본 plan 신설 + plan-d 본문 갱신 | docs only | ≈+150 |
| Phase A (D4) | spec/05 + plan + audit | ≈+50 |
| Phase B (D2) | spec/05 + plan + billing/page.tsx preview | ≈+80 |
| Phase C (D3) | spec/05 + plan | ≈+50 |
| Phase D (D6) | spec/05 + plan | ≈+30 |
| Phase E (D7) | spec/05 + plan | ≈+30 |

→ 본 plan 종결까지 ≈+390 LOC, 모두 docs/spec. 코드 변경은 V2 결제 실 연동 별 plan 에서.

## 6. 거버넌스

- 권위 문서(`proc/spec/05-비즈니스-정책.md §5.7`) 수정은 `CLAUDE.md §4 "사용자 명시 확인 후"` 룰 — G1·G3·G4 합의 의무. 매 Phase 마다 합의 후 spec 이동
- codex review 룰북 회피 금지 — codex 가 D2~D7 미합의 매트릭스를 "결정 미달" 로 지적하더라도 본 plan 진행 중 사실을 spec/05 §5.7.2 에 명시했으므로 정당한 trade-off (`KNOWN-TRADE-OFF: proc/plan/2026-05-26_plan-d-v2-pricing-decisions.md`)
