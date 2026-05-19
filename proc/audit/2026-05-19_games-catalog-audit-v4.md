# 2026-05-19 — /games 카탈로그 audit v4 (Plan C·D·E·F 진척)

- **대상**: 21 게임 + lib/core + 컴포넌트 + 라우트
- **트리거** (CONVENTION §7):
  - **T6** (5건 머지 누적): 본 세션 5 PR (#76~#81)
  - audit v3 §8 후속 트랙 진척 점검
- **본 audit 의미**: Plan A 종결 후 Plan B·C·D·E·F 진척 자체 점검. v3 대비 증가분만 §.
- **방법**: 본 세션 5 PR 직접 검증.

## 1. 본 세션 5 PR 산출

| PR | 영역 | 산출 |
|---|---|---|
| #76 | proc/plan 폴더 복구 + 4 plan 작성 | .gitkeep + Plan C·D·E·F |
| #77 | Plan F | window.confirm → shadcn AlertDialog (2 호출처) |
| #78 | Plan C Phase 1 | buildDistractors helper (vitest +8) |
| (직접 push) | Plan C Phase 2 | english-word-match → WordMatchComponent (380 → 50 LOC) |
| #79 | Plan C Phase 3 | 카드 수 minimum spec (proc/spec/03 §3.4.1) |
| #80 | Plan D Phase 3 | sanitize helper + AI error 일반화 (vitest +10) |
| #81 | Plan E core | 3 모드 정식 resolveRating (review-queue·time-attack·deep-recall) |

## 2. audit v3 informational 17건 해소·잔존

| # | 영역 | v3 | v4 상태 |
|---|---|---|---|
| 1 | 변별력 정책 추상화 | informational | ✅ Plan C Phase 1 buildDistractors helper |
| 2 | english-word-match 메커니즘 통합 | informational | ✅ Plan C Phase 2 WordMatchComponent + extras |
| 3 | 카드 수 minimum (16 게임 5장) | informational | ✅ Plan C Phase 3 spec 정착 (실제 콘텐츠 확장은 별 트랙) |
| 4 | useAttemptCounter dead hook | informational | ⏳ Phase 6 잔존 |
| 5 | icon 충돌 (Pencil) | informational | ⏳ 잔존 |
| 6 | window.confirm 통일성 | informational | ✅ Plan F (PR #77) |
| 7 | registry getCardsTotal silent 0 | informational | ⏳ 잔존 |
| 8 | GameHubPage Suspense 경계 | informational | ⏳ 잔존 |
| 9 | fingerprint 캐싱 | informational | ⏳ 잔존 |
| 10 | recommendation R<0.85 하드코딩 | informational | ⏳ 잔존 |
| 11 | barrel 중복 export | informational | ⏳ 잔존 |
| 12 | content actions XSS path | informational | ✅ Plan D Phase 3 (PR #80) sanitize helper |
| 13 | PWA start_url | informational | ⏳ 잔존 |
| 14 | AI error 누출 | informational | ✅ Plan D Phase 3 (PR #80) e.message → 일반화 |
| 15 | CorrectBurst reduced-motion | informational | ✅ Plan A Phase 6 (PR #72) |
| 16 | app-header placeholder | informational | ✅ Plan A Phase 6 (PR #72) |
| 17 | manage h1 중복 | informational | ✅ Plan A Phase 6 (PR #72) |

→ **9/17 해소** (53%). 8/17 잔존 — 모두 informational 수준, 즉시 위험 0.

## 3. 단일 백본 진척 (v3 §4 갱신)

| 백본 | 상태 | v4 진척 |
|---|---|---|
| FSRS 알고리즘 (ts-fsrs 5.3.3, FSRS-6) | ✅ COMPLETE | 변화 X |
| 스트릭 | ✅ COMPLETE | 변화 X |
| 활동 로그 (14일) | ✅ COMPLETE | 변화 X |
| modes wrapper | ⚠ → ✅ **모든 모드 rating 정식** | 비-default 3 모드 silent fallback 제거. UI 통합은 별 PR |
| 변별력 distractor helper | (신규) ✅ | Plan C Phase 1 — `buildDistractors` 정착 |

→ 단일 백본 5/5 모두 정식 (이전 4/4, 변별력 helper 추가).

## 4. 알고리즘·의존성 (v3 §5 갱신)

| 항목 | 버전 | 비고 |
|---|---|---|
| ts-fsrs | 5.3.3 (FSRS-6) | 변화 X |
| **@radix-ui/react-alert-dialog** | 1.1.15 | 신규 (Plan F) |
| Next.js | 15 | 변화 X |
| sanitize | regex-based (의존성 0) | Plan D Phase 3 |

## 5. 메트릭

| 항목 | v3 | v4 |
|---|---|---|
| 게임 수 | 21 | 21 |
| critical 미해소 | 0 (12/12) | 0 (잔존: V2 billing C8 = 별 트랙) |
| informational 미해소 | 17 | 8 (53% 해소) |
| vitest | 201 | **221** (+20: distractor 8 + sanitize 10 + modes 2) |
| 단일 백본 완결 | 4/4 | 5/5 (변별력 helper 추가) |
| 모드 wrapper 채택률 | 17/17 default | 17/17 default + 3 모드 정식 (UI 통합 별 트랙) |

## 6. 다음 세션 권장 트랙

### Plan D 잔여 (V2 결제)
- Phase 1: D1~D7 사용자 합의 → spec 신설 (별 회의)
- Phase 2: billing notify 백엔드 (`/api/event` 재사용)

### Plan E 잔여 (modes UI 통합) — 약 430 LOC + 17 호출처
- 타이머 UI 컴포넌트 + 4 메커니즘 통합 (time-attack elapsedMs 측정)
- selectNextCards 확장 (R<0.6 필터, deep-recall)
- URL searchParams mode 추출 (17 호출처)
- UI 진입점 — 홈 추천 옆 링크, 게임 허브 모드 필터

### audit v3 §7 잔존 8 informational (별 fix 트랙)
- useAttemptCounter dead hook (메커니즘 통합 시 활용 권장)
- icon 충돌·registry silent·Suspense·fingerprint·barrel·PWA start_url

### 콘텐츠 트랙 (별)
- 16 official 게임 × +5장 = 80장 신규 카드 (Plan C Phase 3 spec 후속)

## 7. 메모리 룰

| 룰 | 상태 |
|---|---|
| 단일 백본 + 다중 모드 | ✅ 5/5 — modes 비-default rating 정식 |
| 하이퍼캐주얼·외재 보상 회피 | ✅ |
| 학습효과 우선 | ✅ — 카드 수 minimum spec, distractor 추상화 |
| 문서화 먼저 (feedback_docs_first) | ✅ — 본 세션 Plan C·D·E·F 작성 후 fix |
| 결단력 (갈래 묻지 말 것) | ✅ — Plan D·E 의사결정 적절한 시점 ask, 단일 추천 |
| 사용자 진술 의도 그대로 | ✅ |

→ 0 violation.
