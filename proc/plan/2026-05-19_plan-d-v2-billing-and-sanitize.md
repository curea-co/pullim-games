# 2026-05-19 — Plan D: V2 결제 정책·백엔드 + content sanitize·AI error 처리

- **상태**: PARTIAL-COMPLETE (2026-05-20) — Phase 3 (sanitize·AI error 일반화) PR #80 머지. **D5 결제 게이트웨이 = Toss Payments 사용자 합의 (2026-05-20)**. **Phase 1 spec(D5 합의분 + D1~D4·D6·D7 합의 후보 매트릭스) + Phase 2 billing 백엔드(`/api/billing/notify` + sha256 hash + 정직성 카피)** 본 세션 진입 (브랜치 `feat/plan-d-phase1-2-billing`). D1·D2·D3·D4·D6·D7 결정은 사용자 G3 합의 대기.
- **트리거**: audit v3 §7 informational 4건 + critical C8(V2 트리거) 통합:
  - C8: `billing/page.tsx` 알림 신청 이메일 백엔드 전송 0 (mock toast)
  - informational: 결제 정책 명세 부재 (`proc/spec/05-비즈니스-정책.md §결제 없음`)
  - informational: content actions XSS path (dangerouslyHTML 도입 시 깨짐)
  - informational: AI error 누출 (Anthropic API rate-limit `e.message` 사용자 노출)
- **메모리 룰**: 학습효과 우선 · 사용자에게 형식 강요 금지 (구독 정책도 동일 결).
- **연관**: `proc/spec/05-비즈니스-정책.md`, `proc/archive/plan/2026-05-18_subscription-cta-entry.md`.

## 0. 현 상태

### A. 결제 V1 = 0
- `proc/spec/05-비즈니스-정책.md` 결제·구독 명세 0
- V1 = 비로그인 (fingerprint), V2+ Magic link/SSO 미정
- `/manage/billing` placeholder + mock 알림 신청 (어제 PR #58)

### B. content sanitize
- `manage/content/page.tsx` 사용자 입력 → localStorage 저장 → 게임 렌더
- React 자동 escape 1차 방어. `dangerouslyHTML` 사용처 0 (현재 안전).
- 향후 콘텐츠 출처 다양화 시 sanitize 필요.

### C. AI error 누출
- `manage/content/actions.ts` Anthropic API 호출 — `e.message` 그대로 클라이언트 노출
- rate-limit / auth 에러 메시지가 사용자에게 보임

## 1. 추천 설계 — 3 Phase

### Phase 1 — V2 결제 정책 spec 신설 (별 plan trigger — 사용자 결정 의무)

**사용자 합의 필요 항목 (D1~D7)**:
- D1: V2 출시 시점 (분기? 연도?)
- D2: 가격 모델 (월 구독 / 연 구독 / 일회성 / freemium)
- D3: 무료 vs 유료 기능 비교 (광고 제거·custom 무제한·클라우드 동기화 외 추가 기능?)
- D4: 가격대 (목표 가격)
- D5: 결제 게이트웨이 — **Toss Payments 합의 (2026-05-20)**. AI 리서치 4 axis(수수료·정기구독 깊이·KR 결제수단·SDK/DX) 비교 결과 1순위. 사유: 개발 인력 1명 한국어 문서·SDK 품질이 통합 시간 최소화(1~2일), Stripe는 KR 법인 개설 불가로 즉시 탈락, PortOne 멀티-PG는 현 단계 오버엔지니어링. 글로벌 진출 시 PortOne 어그리게이션으로 확장 가능. ([daily_outcome/2026-05-20.md](../../daily_outcome/2026-05-20.md))
- D6: 환불 정책
- D7: 학생 할인·체험판

산출: `proc/spec/05-비즈니스-정책.md §결제·구독` 신규 (≈200 LOC docs)

### Phase 2 — billing 알림 신청 백엔드 (1 PR)
C8 fix — 본 plan §1 후 진행.

옵션:
- (A 추천) `/api/event` 재사용 — `{action: "billing.notify.signup", email_hash}` POST. 익명 hash + 6개월 보존 (V1 정책 일치)
- (B) 외부 form 서비스 (Formspree·Mailchimp 등) 의존성 추가
- (C) Vercel KV 직접 저장

→ A 채택 권장. 의존성 0, V1 정책 일치.

### Phase 3 — content sanitize + AI error 일반화 (1 PR)

#### content sanitize
- 현재 `dangerouslyHTML` 사용 0 — 즉시 위험 없음
- 안전판: `manage/content/page.tsx` 입력 시 `.trim()` 외 정규식 sanitize (script tag·on* 속성 제거)
- 또는 `isomorphic-dompurify` 의존성 추가 (작은 lib)

#### AI error 누출
- `manage/content/actions.ts` `e.message` → 일반화 메시지 + 서버 로그 분리
- 패턴:
  ```ts
  try { /* anthropic call */ }
  catch (e) {
    console.error("[content/actions] anthropic error:", e);
    throw new Error("콘텐츠 생성에 실패했어요. 잠시 후 다시 시도해주세요.");
  }
  ```

## 2. 결정점

### D-Phase1 — V2 결제 정책 7건 (위 §1 Phase 1)
- 사용자 합의 필수. 본 plan 작성 시점에 모두 미확정.

### D-Phase2 — billing 백엔드 단위
- **(A 추천)** `/api/event` 재사용
- (B) Vercel KV 신규 — 의존성 ↑
- (C) 외부 form 서비스 — 의존성 ↑

→ A.

### D-Phase3 — sanitize 도구
- **(A 추천)** 정규식 + 안전 패턴만 (의존성 0). dangerouslyHTML 미사용 상태 유지가 1차 방어.
- (B) `isomorphic-dompurify` 도입 — 의존성 추가하지만 표준 sanitize.

→ A 채택 (현 상태에서 dangerouslyHTML 미사용이라 의존성 추가 불필요).

## 3. 작업 항목

### Phase 1 — V2 결제 정책 spec (사용자 합의 후 진행)
- [~] 사용자 합의 — **D5 합의 완료 (2026-05-20)**. D1·D2·D3·D4·D6·D7 합의 대기 (G3·G4)
- [x] `proc/spec/05-비즈니스-정책.md §5.7 결제·구독 정책` 신규 (합의 D5 + 합의 후보 매트릭스 D1~D4·D6·D7 + BR-PAY1~4 비즈니스 룰)
- [x] `proc/spec/05-비즈니스-정책.md §5.6` 출시 알림 신청 PII 정책 추가 (hash·6개월 보존)
- [ ] `/manage/billing/page.tsx` 유료 플랜 preview 콘텐츠 갱신 (D2·D3·D4 합의 후 실제 가격·기능 비교)
- [ ] G1·G3·G4 합의 후 §5.7.2 미합의 항목 → §5.7.1 합의 항목 이동

### Phase 2 — billing 알림 신청 백엔드 (Phase 1 후)
- [x] `/api/billing/notify` 라우트 신설 (별도 엔드포인트로 분리 — EventSchema 와 형식 충돌 회피, 보안 boilerplate 적용)
- [x] `BillingNotifySignupSchema` zod 스키마 — emailHash 정규식 검증(`/^[a-f0-9]{64}$/`)
- [x] `hashEmail` helper — Web Crypto SHA-256, normalize(lowercase+trim)
- [x] `billing/page.tsx` mock toast → 실제 POST + email hash (sha256). 이메일 원문은 페이로드에 포함되지 않음
- [x] 알림 신청 완료 메시지 정직성 강화 — "출시 시 알림을 받기 위해 신청됐어요. 입력한 이메일은 해시(hash) 처리되어 저장되고, 출시 알림 발송 외 용도로는 사용하지 않으며 6개월 후 자동 삭제됩니다."
- [x] PolicyNote 갱신 — Toss Payments 명시 + hash·6개월 보존 명시
- [x] vitest — `/api/billing/notify` 8 케이스 (성공·invalid JSON·schema 위반·plain email rejection 등)
- [x] vitest — `hashEmail` 7 케이스 (deterministic·RFC sha256 일치·normalize·collision·plus-aliasing·빈 문자열 throw)
- [x] e2e — 신청 → POST 호출 mock + 페이로드에 plain email 미포함 검증 + 정직성 카피 노출 검증

### Phase 3 — sanitize + AI error 일반화 (1 PR, Phase 1·2와 독립)
- [ ] `manage/content/page.tsx` 입력 정규식 sanitize (`<script>`, `on*=`, `javascript:` 패턴 제거)
- [ ] `manage/content/actions.ts` Anthropic error catch + 일반화 메시지 + `console.error` 서버 로그
- [ ] vitest — sanitize 패턴 5건 (XSS injection 시도)
- [ ] e2e — AI error 시 일반화 메시지 표시 검증

## 4. 비스코프

- **결제 게이트웨이 실제 연동** — Phase 1 spec 합의 + Phase 2 백엔드 정착 후 별 plan
- **법적 약관** (이용약관·환불정책·개인정보 결제 부분) — 별 plan
- **학생 할인 검증** — V2+ 별 트랙

## 5. 영향도

| Phase | 변경 | LOC |
|---|---|---|
| 1 (spec) | docs only | ≈+200 |
| 2 (백엔드) | `/api/event` action + billing form | ≈+80 |
| 3 (sanitize·error) | content/page.tsx · actions.ts | ≈+50 |

→ Phase 1·2는 사용자 합의 의존. Phase 3 만 즉시 진행 가능.
