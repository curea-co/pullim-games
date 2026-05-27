# 2026-05-19 — Plan D: V2 결제 정책·백엔드 + content sanitize·AI error 처리

- **상태**: PARTIAL-COMPLETE (2026-05-26) — Phase 2 완료, Phase 3 = AI error 일반화 완료 / page.tsx sanitize 통합은 후속(별 plan) 으로 이관, Phase 1 만 D2~D7 **G1·G3·G4** 합의 대기 (`CLAUDE.md §4` 권위 문서 수정 룰 — 합의 주체는 G1·G3·G4 모두).
  - **Phase 2 (billing 백엔드)**: PR #91 머지 — `/api/billing/notify` + Resend 위임 + same-origin + IP rate limit + dev 폴백 키. Codex review round 2·3·5·6 fix 통합
  - **Phase 3 (sanitize·AI error 일반화)**: **부분 완료** — (a) AI error 일반화 = 완료 (PR #80 helper + actions catch + sanitize 단위 10건 + 본 PR-A actions 일반화 회귀 5건), (b) **page.tsx sanitize 통합 = 미완료 / 후속 별 plan** — codex review #104 round 1 지적 (학습 콘텐츠 훼손 위험) 반영하여 본 PR 에서 롤백 → 본 PR 의 page.tsx diff = 0. sanitize 호출 위치는 dangerouslyHTML 도입 시점에 렌더-측에서 적용 (별 plan 트리거)
  - **Phase 1 (V2 결제 정책 spec)**: D5 (Toss Payments, 2026-05-20) 합의 완료 + spec/05 §5.7.1 반영 완료. D1 (V2 출시 2026 Q4, 2026-05-22) **합의 완료, spec 반영 대기** — 현재 `proc/spec/05 §5.7.2` D1 항목이 여전히 TBD 상태이므로 정합화될 때까지 plan 단독 선언으로 남음 (별 PR 에서 spec/05 §5.7.2 → §5.7.1 이동 필요). D2~D7 는 별 plan 트랙으로 분리 (사용자 합의 2026-05-26) — [`2026-05-26_plan-d-v2-pricing-decisions.md`](./2026-05-26_plan-d-v2-pricing-decisions.md) 신설
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
- D1: V2 출시 시점 — **2026 Q4 합의 (2026-05-22)**. 추천 (B) 그대로 채택. D2·D3·D4·D6 일정 역산 기준값. ([daily_outcome/2026-05-22.md](../../daily_outcome/2026-05-22.md))
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
- [~] 사용자 합의 — **D5 합의 완료 (2026-05-20)** + **D1 합의 완료 (2026-05-22, V2 출시 = 2026 Q4)**. D2·D3·D4·D6·D7 합의 대기 (G3·G4)
- [x] `proc/spec/05-비즈니스-정책.md §5.7 결제·구독 정책` 신규 (합의 D5·D1 + 합의 후보 매트릭스 D2·D3·D4·D6·D7 + BR-PAY1~4 비즈니스 룰)
- [x] `proc/spec/05-비즈니스-정책.md §5.6` 출시 알림 신청 PII 정책 추가 (hash·6개월 보존)
- [→] `/manage/billing/page.tsx` 유료 플랜 preview 콘텐츠 갱신 — 별 plan ([`2026-05-26_plan-d-v2-pricing-decisions.md`](./2026-05-26_plan-d-v2-pricing-decisions.md)) 으로 이관, D2·D3·D4 합의 후 진행
- [→] G1·G3·G4 합의 후 §5.7.2 미합의 항목 → §5.7.1 합의 항목 이동 — 별 plan 으로 이관

### Phase 2 — billing 알림 신청 백엔드 (Phase 1 후)

**1차 구현 (Codex review 전, 2026-05-20)**:
- [x] `/api/billing/notify` 라우트 신설 (별도 엔드포인트로 분리 — EventSchema 와 형식 충돌 회피, 보안 boilerplate 적용)
- [x] `BillingNotifySignupSchema` zod 스키마 — emailHash 정규식 검증(`/^[a-f0-9]{64}$/`)
- [x] `hashEmail` helper — Web Crypto SHA-256, normalize(lowercase+trim)
- [x] `billing/page.tsx` mock toast → 실제 POST + email hash (sha256). 이메일 원문은 페이로드에 포함되지 않음

**2차 정착 (Codex review fix, 2026-05-20)**:
Codex 가 hash-only 모델로는 실제 알림 메일 발송이 불가능하다는 **기능 모순**(지적 #1) + zod non-strict 로 raw email 동봉 가능하다는 **PII 누수 경로**(지적 #2) + 누수 테스트 갭(지적 #3) + UI 변경 4 viewport 감사 누락(지적 #4) 을 지적. **사용자 합의: 외부 메일 서비스(Resend) 위임으로 정착** (SPEC §5.7.5 신설).
- [x] SPEC §5.7.5 외부 메일 서비스 위임 정책 신설 — Resend 채택 + 4 axis 비교 매트릭스(Mailchimp·SendGrid·Postmark) + 데이터 흐름 + secret 관리(`RESEND_API_KEY`·`RESEND_AUDIENCE_ID`)
- [x] SPEC §5.6 출시 알림 신청 — hash 모델 → 외부 위임 모델 갱신
- [x] `BillingNotifySignupSchema` `.strict()` 적용 — plain `email` + `source: 'billing-cta'` + `ts` + `action`. 추가 필드 동봉 시 422 (Codex #2 fix)
- [x] `email-hash` helper 폐기 — 외부 위임 모델에서 hash 불필요
- [x] `/api/billing/notify` 라우트 재설계 — Resend audience contact 등록 (fetch 직접 호출, SDK 의존성 0) + secret 미설정 시 503 + 외부 호출 실패 시 502
- [x] `src/lib/server/billing/resend-client.ts` 신설 — `delegateNotifySignupToResend` (deps injection 가능, server-only)
- [x] `billing/page.tsx` 폼·success 카피·PolicyNote — 외부 위임 정직성 카피로 갱신 ("풀림 서버에는 이메일이 저장되지 않아요")
- [x] vitest — 라우트 strict 회귀(추가 필드·legacy `emailHash` 거부) + Resend mock(call body·응답 폐기) + 503·502 분기 + PII 0 회귀(응답 본문 email leak X) — 22 케이스
- [x] vitest — `resend-client` 단위 6 케이스 (env 미설정·정상·auth header·URL encode·4xx·throw)
- [x] e2e — strict 회귀 (4 필드만·`emailHash` undefined) + 외부 위임 카피 검증
- [x] `bun run ui:audit /manage/billing` 4 viewport (320·390·768·1280) 통과 — critical=0, informational 2건(자연 스크롤, gate 통과) — Codex #4 fix

**3차 fix (Codex review round 3, 2026-05-20)**:
Round 3 가 두 가지 잔여 이슈를 지적: (#1) Resend 4xx 중복 응답을 모두 502 로 처리해서 이미 등록된 사용자도 영구 "신청 실패" 가 보임 — idempotent UX 깨짐. (#2) `/api/billing/notify` 가 same-origin 검증·rate limit 0 — 제3자가 임의 이메일을 대량 주입하거나 Resend 무료 한도 소모시키기 쉬움.
- [x] `resend-client.ts` 4xx 분기 — 409 또는 body `already`/`exists` → `ok: true, reason: 'already_exists'` (idempotent success). 기타 4xx 는 `external_error + status` 유지
- [x] `src/lib/server/rate-limit.ts` 신설 — 인메모리 sliding window (`checkRateLimit`·`checkRateLimits`·`extractClientIp`), 인프라 의존 0
- [x] `/api/billing/notify` 라우트 — same-origin 가드(`Origin`/`Referer` vs `NEXT_PUBLIC_SITE_ORIGIN`·`VERCEL_URL`·요청 host) + IP 별 rate limit (1분 5회 + 1시간 10회)
- [x] `billing/page.tsx` — 429 에러 카피 차별화 ("요청이 너무 잦아요")
- [x] vitest — `rate-limit` 단위 12 케이스 (sliding window·다중 rule AND·key 격리·IP 추출 5종)
- [x] vitest — 라우트 추가 케이스: 중복 idempotent 3건 + same-origin 가드 6건 + rate limit 3건
- [x] vitest — `resend-client` 추가 케이스: 409·422+already·400+already·일반 422·401 missing_api_key·5xx — 5건
- [x] SPEC §5.6 보안 boilerplate — same-origin·rate limit·idempotent 분기 명시 (BR-PAY3 학생 보호 연결)
- [x] SPEC §5.7.5 응답 분기 표 신설 + `NEXT_PUBLIC_SITE_ORIGIN` env 추가

**4차 fix (Codex review round 5·6, 2026-05-20)**:
Round 5 가 IP 식별 불가 시 `"anonymous"` 전역 버킷 fallback 의 사이드이펙트(정상 사용자 간 간섭)를 지적 → fail-closed 400 으로 전환. Round 6 가 그 fail-closed 가 `bun dev` localhost·일부 프록시 구성에서 정상 폼 제출까지 막는다고 지적 → production 만 fail-closed 유지, 그 외 환경은 host 기반 dev 폴백 키로 작동시키도록 균형 조정.
- [x] `/api/billing/notify` 라우트 — round 5 fail-closed (전역 anonymous 폴백 제거)
- [x] `/api/billing/notify` 라우트 — round 6 환경별 분기 (`resolveRateLimitKey` 추가): production = IP 필수, 그 외 = `dev:<host>` 폴백
- [x] vitest — round 5 fail-closed 회귀 2건 (production 분기 명시)
- [x] vitest — round 6 dev 폴백 4건 (development·test 모드 200, dev 폴백 rate limit 5/분, 실제 IP 와 키 격리)

### Phase 3 — sanitize + AI error 일반화 (PR #80 + 본 PR-A 통합 완료, 2026-05-26)

**PR #80 (2026-05-19 머지)** — sanitize helper + AI error 일반화 + sanitize 단위:
- [x] `src/lib/core/sanitize/index.ts` 신설 — `sanitizeUserText` (script tag·on* handler·javascript:·data:text/html 정규식 제거, 의존성 0)
- [x] `manage/content/actions.ts` Anthropic error catch + 일반화 메시지 + `console.error` 서버 로그
- [x] vitest — sanitize 패턴 10건 (`src/lib/core/sanitize/index.test.ts` — 일반/빈 문자열/script block/unclosed script/onclick/onload+onerror/javascript:/data:text/html/markdown 보존/연속 패턴)

**PR-A (본 turn, 2026-05-26)** — AI error 일반화 회귀만 통합. page.tsx 통합은 codex 지적 반영하여 본 PR diff 0 으로 롤백:
- [→] `manage/content/page.tsx` 입력 정규식 sanitize 통합 — **codex review #104 round 1 지적 반영하여 본 PR 에서 롤백 (TRADE-OFF)**. 저장 시점 sanitize 는 학습 콘텐츠 (정답·문제·해설에 `javascript:`·`<script>`·`on*=` 같은 문자열이 정답으로 포함될 수 있음 — 컴퓨터·웹 보안 학습 카드 등) 를 영구 변형해서 채점 깨짐·빈 문자열 저장 같은 회귀를 일으킴. **현재 dangerouslyHTML 사용처 0** 이라 React 자동 escape 가 1차 방어로 충분. sanitize helper (`src/lib/core/sanitize/index.ts`) 는 유지하되 호출 위치는 dangerouslyHTML 도입 시점에 렌더-측에서 적용 (별 plan). 본 PR 의 page.tsx diff = 0. 근거: `KNOWN-TRADE-OFF: proc/plan/2026-05-19_plan-d-v2-billing-and-sanitize.md §3 Phase3 — codex review #104`
- [x] vitest — `actions.test.ts` 5건 (rate-limit/auth/network error → 일반화 메시지 회귀, API key·status code 누출 0 검증, console.error 원본 보존, 정상 응답 통과)
- [—] ui:audit 면제 — 본 PR 최종 diff 에 `page.tsx`·UI 컴포넌트 변경 없음 (page.tsx 통합 롤백 후). 면제 근거 = **UI 대상 파일 미변경** (AGENTS.md §"viewport 4 audit" 의 대상 경로 — `src/components/{game-mechanics,game-shell,…}/`·`src/app/**/page.tsx|layout.tsx`·`src/games/*/component.tsx`·`tailwind.config.ts` — 변경 없음). 본 PR 에는 `actions.test.ts` 가 포함되어 docs-only PR 은 아니지만 viewport audit 게이트 대상 파일은 미변경이므로 면제 정당. 정정 근거: codex review #104 round 3
- [x] e2e 비스코프 — `playwright.config.ts` 가 production build 환경이고 `@anthropic-ai/sdk` mock 부담이 큼. **TRADE-OFF** (`KNOWN-TRADE-OFF: proc/plan/2026-05-19_plan-d-v2-billing-and-sanitize.md §3 Phase3`): 대신 vitest unit (5건) 으로 actions catch 분기 + console.error 보존 직접 검증. 회귀 신뢰성 동등 (logic-level coverage)

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
