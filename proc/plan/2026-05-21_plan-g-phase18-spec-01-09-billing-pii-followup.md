# 2026-05-21 — Plan G Phase 1.8: spec/01·09 PII 정책 ↔ spec/05 V1.5 결제 알림 정합화

- **상태**: ACTIVE / PARTIAL (2026-05-27) — D1 추천안 A (spec/01·09 예외 조항 신설) **G1 단독 승인만 완료 · D2 (G3·G4 합의 채널) 대기**. CLAUDE.md §4 "권위 문서 수정 G1/G3/G4 합의" 룰 미충족 → spec/01·09 본문 변경은 본 PR 에서 분리. **본 PR scope = 본 plan doc 갱신 (상태·scope 정정)** (docs only, plan 자체는 `proc/plan/` 활성 트랙에 유지 — 기존 DRAFT plan 의 상태/범위 갱신 PR 이며 신규 파일 생성은 아님). 실제 spec/01·09 본문 수정 + 본 plan archive 이동은 G3·G4 합의 후 별 PR — CLAUDE.md §4/§9 거버넌스 + §6 archive 계약 (완료된 plan만 archive) 준수 (사용자 결단 2026-05-27, Codex Review round 1·2 지적 수용). 현 시점 권위 문서에 대리 합의·우회 규칙 없음 — 정착하려면 별 PR 로 거버넌스 자체 개정 필요.
- **트리거**: PR #91 의 Codex round 9 지적 #1 — "spec/05 가 V1.5 이메일 수집·외부 위임 허용으로 갱신됐는데 spec/01:36 + spec/09:20,42-45,209 의 `PII 0`·`이메일 수집은 V2 재검토` 권위 룰이 그대로라 source of truth 충돌".
- **거버넌스 룰** (CLAUDE.md §9 — 2026-05-20 정착): 권위 문서(`proc/spec/01·09`) 수정은 §4 "사용자 명시 확인 후" 룰 — G1/G3/G4 합의 의무. PR #91 scope 초과로 별 PR 분리.
- **연관**: `proc/plan/2026-05-19_plan-d-v2-billing-and-sanitize.md`, `proc/spec/05-비즈니스-정책.md §5.7`, PR #93 (spec/01 §3 정합화 follow-up plan — plan doc only PR 의 동일 패턴 선행 사례. PR #105 는 그 후속 spec 본문 갱신 PR 이며 본 PR 의 별 PR 단계에 해당).

## 0. 현 상태

### A. spec/05 V1.5 변경 사항 (PR #91 머지 후 main 적용)

- **§5.7 결제·구독 정책 신설** (PR #91 b0d0c3f) — D5 Toss Payments 채택, D1·D2·D3·D4·D6·D7 미합의 매트릭스
- **§5.7.5 외부 메일 위임 정책** (PR #91 53f4c3b) — Resend 채택, 본 서버 PII 저장 0, segment marker `billing-launch-notify`
- **§5.6 알림 정직성 카피 강화** — "출시 시 알림 받기, 6개월 보존, 외부 메일 서비스 위임"

### B. spec/01·09 의 PII 룰 (현 권위)

- **`proc/spec/01-AI-명령지침.md:36`** — "PII 0 원칙" 명시 (이메일 등 식별 가능 정보 수집 X)
- **`proc/spec/09-기술-환경.md:20,42-45,209`** — "이메일 수집은 V2 재검토 트리거" + V1 fingerprint 정책

### C. 충돌 본질

| spec | V1.5 결제 알림 |
|---|---|
| spec/01:36 | "PII 0" — V1.5 의 외부 위임 (이메일을 받아서 Resend 로 전달) 도 PII 일시 보유로 해석 가능 |
| spec/09:20,42-45,209 | "이메일 수집은 V2 재검토" — V1.5 에서 받기 시작하는 게 spec/09 룰 위반 |
| spec/05 §5.7.5 | "본 서버 저장 0 + 외부 위임 = PII 정책 위반 아님" 주장 |

→ 두 권위가 충돌. 후속 작업자가 어느 룰을 따라야 하는지 모호.

## 1. 추천 설계

### A. 정합화 방향 (옵션 매트릭스 — 결단력 룰)

| 옵션 | 변경 | 영향 | 추천 |
|---|---|---|---|
| **A** | spec/01 §PII + spec/09 §이메일 수집 룰에 *예외 조항* 추가 — "외부 메일 서비스 위임 + 본 서버 저장 0 + 카피 정직성 만족 시 V1.5 알림 신청 한정 허용" | spec/01·09 가 spec/05 의 V1.5 예외 인정. 명확. | **★ 권고** |
| B | spec/05 §5.7 의 V1.5 외부 위임 정책 삭제 — "PII 0 룰 엄수, 알림 신청 X" | UX 손상 (PR #91 #91 옵션 (B) 와 동일) | 비추천 |
| C | spec/01·09 의 PII 룰 자체 완화 — "외부 위임 PII 는 PII 아님" 명시 | 폭넓은 변화, 다른 V2 결제 트랙에도 영향 | 위험 |
| D | 우회 선언 유지 (현재 상태) | source of truth 모호 영속 | 비추천 |

→ **A 채택 권고** — spec/01·09 에 예외 조항 신설. spec/05 의 V1.5 알림 신청은 정합한 예외로 정착.

### B. spec/01 §PII 예외 조항 (Draft)

```markdown
### PII 정책 예외 — V1.5 알림 신청

본 리포 PII 0 원칙의 **예외**: V1.5 결제 출시 알림 신청 (`/manage/billing` → `/api/billing/notify`) 한정.

조건 (3 의무):
1. **본 서버 PII 저장 0** — 받은 이메일은 외부 메일 서비스(Resend 등) 위임 즉시 메모리 폐기. DB·logfile·캐시 어떤 영속 채널에도 잔존 X
2. **외부 위임 정직성 카피** — 사용자 화면에 "외부 메일 서비스 위임" 명시. spec/05 §5.6 일치
3. **segment marker** — 외부 서비스 측 contact 에 `source = 'billing-launch-notify'` + `consented_at` ISO 마커. spec/05 §5.7.5 일치

위 3 조건 모두 만족 시 V1.5 알림 신청은 본 PII 0 룰의 예외로 인정. 다른 신규 이메일 수집 경로는 V2 합의 (G1/G3/G4) 후 별 plan.
```

### C. spec/09 §이메일 수집 룰 갱신 (Draft)

```markdown
### 이메일 수집 트리거 V2 재검토 — 예외

본 리포 V1 fingerprint 정책의 이메일 수집 트리거 = V2 재검토 의무. **예외**: V1.5 결제 출시 알림 신청 (spec/01 §PII 예외 조건 충족 시).

- V1.5 알림 신청 외 이메일 수집은 V2 합의 후 별 plan
- V2 결제 게이트웨이(Toss Payments) 통합 시점에 본 §재검토 — 이메일이 결제 흐름의 의무 입력이 될 수 있음
```

## 2. 결정점

### D1 — 정합화 방향
- **(A 권고)** spec/01·09 예외 조항 신설
- (B) spec/05 V1.5 외부 위임 정책 삭제
- (C) spec/01·09 PII 룰 완화
- (D) 우회 선언 유지

→ A.

### D2 — G1/G3/G4 합의 채널
- spec/01·09 수정은 4 풀림 공통 룰. 본 리포 한정 예외 조항이면 영향 최소. 사용자 결정 의무.

## 3. 작업 항목

### Phase 1.8 — D1·D2 합의 후 (G1/G3/G4)

#### 본 PR (#106) scope — plan doc 갱신 (상태·scope 정정)

- [ ] D1 — G1/G3/G4 합의 (§2 정의대로) — **미완료**. G3·G4 합의 D2 와 함께 후속 PR 에서 정착 예정
- [x] D1 보조 — G1 단독 의견 기록 (2026-05-27, 추천안 A 방향) — D1 정식 합의 아님, 후속 G3·G4 합의 시 참고용
- [ ] D2 — G1/G3/G4 합의 채널 (§2 정의대로) — G3·G4 미합의로 **미완료**. 후속 PR 에서 정착 예정
- [x] 본 plan doc 갱신 — 상태 DRAFT → ACTIVE/PARTIAL, scope·체크리스트·한계 정정 (docs only, 기존 파일 수정. plan 본문 자체는 PR #91 머지 후 별 plan 으로 이미 신설된 상태)
- [x] Codex Review round 1 지적 수용 — "G3·G4 합의 보류 상태에서 권위 문서 본문 박아 넣는 행위 = CLAUDE.md §4/§9 위반" → spec/01·09 본문 변경 revert, scope 축소
- [x] Codex Review round 2 지적 수용 — "archive 이동 + D1·D2 체크박스 [x] = CLAUDE.md §6 archive 계약 + D2 정의 위반" → plan 을 `proc/plan/` 활성 트랙 복귀 + D2 체크박스 미완료 분리
- [x] Codex Review round 5 지적 수용 — (1) D1 체크박스 의미 모호 → D1 정식 합의 미완료 [ ] 로 되돌리고 "D1 보조 — G1 단독 의견 기록" 항목으로 분리, (2) `segment marker` 표현이 spec/05 §5.7.5 의 optional segment 와 필수 `properties.source` 마커 혼동 → `contact properties source marker` 로 정정 + §5.6 (정직성 카피) 출처 명시 분리

#### 별 PR (D2 완료 = G3·G4 합의 후)

- [ ] D2 G3·G4 합의 — 본 plan §1.B (spec/01 §PII 예외 draft) + §1.C (spec/09 §이메일 수집 예외 draft) 검토 및 합의
- [ ] `proc/spec/01-AI-명령지침.md §5` 갱신 — "V1.5 알림 신청 예외" 항목 신설, 3 의무 조건 (본 서버 영속 저장 0 · 정직성 카피 · contact properties source marker = `properties.source = 'billing-launch-notify'` + `consented_at`) 명시, spec/05 §5.6 (정직성 카피) + §5.7.5 (외부 위임 정책) 권위 인용 (RESEND_SEGMENT_ID 기반 segment 추가는 spec/05 §5.7.5 선택 사항이며 필수 조건 아님)
- [ ] `proc/spec/09-기술-환경.md`:
  - §9.2.2 "이메일 수집 트리거 — V1.5 예외" 단락 신설 — fingerprint 합침 트리거 (옵션 B) 와 V1.5 외부 위임 경로 구분 명시
  - §9.8 에러 트래킹 항목에 V1.5 예외 인지 + 이메일 누출 0 회귀 의무 명시
- [ ] codex review 자동 트리거 → 권위 정합 확인
- [ ] 본 plan 을 `proc/archive/plan/` 로 이동 (위 작업 모두 완료 후 — CLAUDE.md §6 archive 계약 준수)

## 4. 비스코프

- spec/05 §5.7 의 V1.5 외부 위임 정책 자체 수정 — 본 plan 한정 X (이미 PR #91 머지)
- V2 결제 게이트웨이 통합 (Toss Payments 실 연동) — 별 plan
- 다른 풀림 프로젝트(planner·Q·classbot) PII 룰 운용 — 본 plan 범위 0

## 5. 영향도

| 작업 | LOC |
|---|---|
| spec/01 §PII 예외 신설 | ≈+25 |
| spec/09 §이메일 수집 예외 명시 | ≈+15 |

→ 총 ≈+40 LOC, docs only.

## 6. 본 PR 의 한계

본 PR (#106) 은 plan doc 갱신만 (docs only — 기존 DRAFT plan 의 상태/scope 정정. 신규 파일 생성 아님). 본 plan 은 `proc/plan/` 활성 트랙에 유지 — D2 (G3·G4 합의 채널) 미완료이므로 CLAUDE.md §6 archive 계약 ("완료된 plan·design-audit만 archive") 을 따라 `proc/archive/plan/` 이동은 후속 PR (별 PR) 에서 실시. 실제 spec/01·09 본문 수정은 G3·G4 합의 후 별 PR — 동일 패턴 선행 사례: **PR #93** (spec/01 §3 정합화 follow-up plan doc only PR). PR #105 는 그 후속 spec 본문 갱신 PR 이며 본 PR 의 별 PR 단계에 해당. 본 PR scope 축소 결단은 **사용자 결단 2026-05-27** 근거 (Codex Review round 1·2 지적 수용, CLAUDE.md §4 권위 문서 G1/G3/G4 합의 룰 + §6 archive 계약 + §9 거버넌스 회피 금지 룰 준수).
