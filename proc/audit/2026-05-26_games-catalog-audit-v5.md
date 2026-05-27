# 2026-05-26 — /games 카탈로그 audit v5 (Plan D·E·G 정착 + 단일 백본 진척)

- **대상**: 21 게임 + lib/core (FSRS·modes·distractor) + 4 메커니즘 + 라우트/허브 + CI 인프라
- **트리거** (CONVENTION §7):
  - **HARD T3 + T7** — PR #92 머지 (`resolveRating('time-attack')` `elapsedMs` 의존 신설 + `selectCardsForMode` deep-recall R<0.6 필터 = 단일 백본 modes wrapper 학습 로직 확장)
  - **SOFT T4** 2건 — PR #85 (메커니즘 mode prop 통합 16 호출처) + PR #92 (4 메커니즘 TimeAttackTimer 통합)
  - **SOFT T6** — v4(PR #82) 이후 머지 PR 14건 (#84·#85·#86·#87·#89·#90·#91·#92·#93·#94·#97·#98·#99·#100·#101) → 임계 5건의 3배 초과
  - dry-run 산출 (PR #98, `proc/audit/2026-05-22_v5-dry-run.md`) 정합화 + 본 doc 정식 진입
- **본 audit 의미**: dry-run 시점 잠정·추정값 확정. Plan D Phase 1+2 (V2 결제 spec + billing 알림 백엔드) + Plan E Phase 3+4+5 (time-attack 타이머·deep-recall 필터·홈/허브 진입점) + Plan G Phase 1·2·3 (Codex Review + e2e-nightly + AGENTS.md 보강) + Phase 1.7·1.8 (spec/01·09 정합화 follow-up plan) 진척 누계 점검.
- **방법**: dry-run 6 PR + dry-run 이후 머지 8 PR (#91·#92·#93·#94·#98·#99·#100·#101) 직접 검증. v4 informational 잔존 8건은 본 doc 시점 변화 0 확인.

## 1. dry-run 이후 추가 머지 8건 (T6 카운트 확정)

dry-run (PR #98) 시점 카운트 7건 + 본 doc 시점 추가 8건 = **누계 15건**. SOFT T6 5건 임계의 3배.

| PR | 머지 (KST) | 본질 | 카운트 | HARD/SOFT |
|---|---|---|---|---|
| #91 | 2026-05-22 13:49 | Plan D Phase 1+2 — spec/05 §5.7 V2 결제 정책 신설 + `/api/billing/notify` Resend 위임 백엔드 | 8 | — |
| #92 | 2026-05-22 13:49 | Plan E Phase 3+4+5 — `resolveRating('time-attack')` elapsedMs 의존 + deep-recall R<0.6 필터 + 4 메커니즘 TimeAttackTimer + 홈/허브 진입점 | 9 | **HARD T3·T7 + SOFT T4** |
| #93 | 2026-05-22 13:49 | Plan G Phase 1.7 — spec/01 §3 정합화 follow-up plan (docs only) | 10 | — |
| #94 | 2026-05-22 13:49 | Plan G Phase 1.8 — spec/01·09 PII vs spec/05 V1.5 결제 알림 정합화 plan (docs only) | 11 | — |
| #98 | 2026-05-22 13:49 | AGENTS.md 보강 (Plan G Phase 3) + audit v5 dry-run + 2026-05-22 daily work plan | 12 | — |
| #99 | 2026-05-22 13:52 | Plan D D1 (V2=2026 Q4) + Plan E D1.3·D1.4 (30초/카드·`again` 강제) 사용자 합의 메모 | 13 | — |
| #100 | 2026-05-22 13:49 | CI runner 라우팅 `curea-runner-2` 전용 (수정 의도) | 14 | — |
| #101 | 2026-05-22 15:06 | CI runner 라우팅 `group` 단독으로 되돌림 (#100 보정) | 15 | — |

→ HARD T3·T7 발동 PR #92 가 dry-run 직후 머지. dry-run §3.1 예고 그대로 본 doc 진입 의무 충족.

## 2. v4·v5 dry-run informational 잔존 8건 (변화 0)

v4 §2 (audit 2026-05-19) → v5 dry-run §2 (audit 2026-05-22) → 본 doc (2026-05-26) — **3 시점 동일 잔존**.

| # | 영역 | v4 | v5 dry-run | v5 본 doc | 액션 권고 |
|---|---|---|---|---|---|
| 4 | useAttemptCounter dead hook | ⏳ | ⏳ | ⏳ | 메커니즘 신규 통합 시 활용 가능 — fix plan 진입 |
| 5 | icon 충돌 (Pencil) | ⏳ | ⏳ | ⏳ | 단순 lucide alias fix — 별 PR 가능 |
| 7 | registry getCardsTotal silent 0 | ⏳ | ⏳ | ⏳ | 신규 게임 추가 시 noisy 변경 권고 |
| 8 | GameHubPage Suspense 경계 | ⏳ | ⏳ | ⏳ | Plan E Phase 5 진입점 추가로 영향 면적 ↑ → 우선순위 ↑ |
| 9 | fingerprint 캐싱 | ⏳ | ⏳ | ⏳ | spec/09 PII 정합화 (Phase 1.8) 후 검토 권고 |
| 10 | recommendation R<0.85 하드코딩 | ⏳ | ⏳ | ⏳ | deep-recall R<0.6 (PR #92) 와 정책 정합화 검토 |
| 11 | barrel 중복 export | ⏳ | ⏳ | ⏳ | 별 PR — 단순 정리 |
| 13 | PWA start_url | ⏳ | ⏳ | ⏳ | manifest 1줄 fix — 별 PR |

→ 8/8 잔존. **fix plan 진입 권고** — v3 (2026-05-15) 시점부터 누적 3 audit 사이클 동안 fix 0. 다음 daily_outcome 에 trade-off 명시 또는 별 plan 진입 의무.

## 3. v4 §1 17건 → v5 informational 잔존 8건 추이 (해소 흐름)

v3 informational 17건 → v4 9건 해소 (53%) → 본 doc 시점 추가 해소 0 → 잔존 8건. **해소 트랙 정체 8일 (5/19~5/26)**. 정체 사유:

- Plan D·E·G 트랙 우선 — Phase 2~5 코드 작업 + 거버넌스·CI 보강에 본 8일 집중
- informational 8건은 즉시 위험 0 — 우선순위 적정
- **단, 누적 3 사이클은 §8 의 별 fix plan 진입 신호**

## 4. 단일 백본 진척 (CONVENTION §7.4 v3+ 양식 §4)

v4 ✅ 5/5 → v5 dry-run "PR #92 머지 후 modes wrapper 강화 예고" → 본 doc 시점 modes wrapper 학습 로직 본격 진화.

| 백본 | v4 (2026-05-19) | v5 dry-run (2026-05-22) | v5 본 doc (2026-05-26) | 비고 |
|---|---|---|---|---|
| FSRS 알고리즘 (ts-fsrs 5.3.3, FSRS-6) | ✅ COMPLETE | 변화 X | 변화 X | — |
| 스트릭 | ✅ COMPLETE | 변화 X | 변화 X | — |
| 활동 로그 (14일) | ✅ COMPLETE | 변화 X | 변화 X | — |
| modes wrapper | ✅ 4/4 rating 정식 | 잠정 진화 예고 | **✅ 학습 로직 확장 정착** — time-attack `elapsedMs` 의존, deep-recall R<0.6 카드 풀 필터, 4 메커니즘 TimeAttackTimer 통합 | PR #92 / 단순 분기 → 실제 학습 로직 보유 wrapper |
| 변별력 distractor helper | ✅ COMPLETE | 변화 X | 변화 X | — |

**모드 wrapper 채택률** (분모 = 본 리포 21개 게임 전체):
- default: 21/21 게임 (`src/games/*` 21개 디렉터리 모두 modes wrapper 위에서 동작 — PR #73·#74 마이그레이션 완료)
- review-queue: 16 호출처 URL `?mode=review-queue` 진입 (PR #85, 호출처 카운트 — 게임 단위 아님)
- time-attack: 30초/카드 + `again` 강제, 4 메커니즘 TimeAttackTimer 통합 (PR #92, Plan E D1.3·D1.4 합의)
- deep-recall: R<0.6 카드 풀 필터 (PR #92)

→ **단일 백본 + 다중 모드** 메모리 룰 본격 발현. modes wrapper 가 실제 학습 신호(timer·R 필터) 보유 stage 로 진입.

## 5. 알고리즘·의존성 (CONVENTION §7.4 v3+ 양식 §5)

| 항목 | v4 | v5 dry-run | v5 본 doc | 비고 |
|---|---|---|---|---|
| ts-fsrs | 5.3.3 (FSRS-6) | 변화 X | 변화 X | — |
| @radix-ui/react-alert-dialog | 1.1.15 | 변화 X | 변화 X | Plan F 정착 |
| Next.js | 15 | 변화 X | 변화 X | spec/09 §9.1 권위 |
| sanitize | regex-based (의존성 0) | 변화 X | 변화 X | Plan D Phase 3 |
| **Resend (메일 알림)** | — | **잠정 (PR #91 머지 시)** | **fetch only (SDK 의존성 0)** — env: `RESEND_API_KEY` / `RESEND_AUDIENCE_ID` | PR #91 / segment `billing-launch-notify` |
| **TimeAttackTimer** | — | — | **자체 컴포넌트 (의존성 0)** — `setInterval` 기반 | PR #92 / 4 메커니즘 통합 |

→ Plan D V2 결제 알림은 Resend SDK 도입 안 함 (fetch 직접) — 의존성 0 정책 유지. Plan E time-attack 도 외부 lib 0.

## 6. production 동기화 (CONVENTION §7.4 v3+ 양식 §6)

| 항목 | 값 | 출처 |
|---|---|---|
| 마지막 production 배포 시점 | **2026-05-22 10:42:52 KST (01:42 UTC)** | `bunx vercel inspect pullim-games-jw0gjzlx6-powershs-projects.vercel.app` |
| 배포 ID | `dpl_CbvZzdh7i4mMXzRk7o1CSQHc91Sj` | 동 |
| 배포 alias | `pullim-games.vercel.app` (Production Ready) | 동 |
| 배포 시점 main HEAD | (확인 필요: vercel build commit SHA) — 시간상 PR #97 (2026-05-21 16:35 KST 머지) 까지 반영 가능성 농후. PR #91~#94 (2026-05-22 13:49 KST 머지) 는 vercel 배포 (10:42 KST) **이후** 머지로 미반영 | `git log --before='2026-05-22T01:42:52Z'` |
| **production 미반영 PR** | **PR #91·#92·#93·#94·#98·#99·#100·#101 — 8건** (`feat(plan-d) V2 결제 spec + Resend 알림` / `feat(plan-e) time-attack + deep-recall + 진입점` / Plan G Phase 1.7·1.8 plan / AGENTS.md 보강 + audit v5 dry-run / Plan D·E 사용자 합의 메모 / CI runner 라우팅 2회) | 본 audit + `gh pr list --state merged` |
| production 미반영 누적 일수 | **4일** (2026-05-22 → 2026-05-26) | 본 audit 시점 |
| 사용자 본인 액션 의무 | `bunx vercel --prod` 수동 배포 — CLAUDE.md §4 "하면 안 되는 것" 의 "`vercel --prod` 수동 배포 전에 production 검증 보고" + 메모리 룰 `project_deploy_manual` 에 명시. (본 audit 시점 daily_outcome 5/22·5/26 파일은 main 미머지 — 별 PR 로 누적 정리 예정) | CLAUDE.md §4 + 메모리 `project_deploy_manual` |

→ **production 미반영 4일째**. dry-run §3.2 의 "사용자 검증 의무" 항목이 본 doc 시점에 4일 이월. main 머지된 daily_outcome 5/20 시점부터 **production URL 정상 접속 여부** 미확인 상태가 4일 이월 (5/21·5/22·5/26 일자 daily_outcome 자체가 별 PR 로 누적 정리 대기 중 — 본 audit 시점 main 미머지) — 본 doc 직후 사용자 본인 vercel --prod 액션 1회로 일괄 해소 가능.

## 7. CI 인프라 정착 (v3/v4 informational "CI 정착도" → progress)

| CI 변화 | PR | 정착 상태 (v5 본 doc) | 검증 의무 |
|---|---|---|---|
| codex-review.yml 이식 (Plan G Phase 1) | #87 | ✅ self-hosted runner + GitHub App secret 정착. (PR #88 은 검증용 docs PR 로 작성됐으나 main 미머지 — CLOSED 상태로 산출물 `proc/research/2026-05-20_codex-review-port-validation.md` 도 main 부재. 본 audit 의 정착 판단 근거는 아래 "검증 의무" 열의 실 동작 PR 들로 대체) | PR #91·#92·#93·#94 본 PR 들에서 Codex round 5~9 실 동작 확인 (PR #91 9 round, PR #92 다회) |
| e2e-nightly.yml (Plan G Phase 2) | #90 | ✅ cron `0 17 * * *` (KST 02:00) | (확인 필요: 첫 1회 실 작동 결과 — 5/21 02:00 KST 이후) |
| self-hosted runner `pullim-games` 전용 group | #97 | ✅ 정착 | — |
| runner 라우팅 fluctuation (curea-runner-2 → group 복귀) | #100 → #101 | ✅ 안정화 (#101 fix) | 본 시도 학습: runner 이름 직접 지정 회피, group 단독 명시가 안정적 |

→ v3/v4 informational "CI 정착도" 트랙 **본 doc 시점 ✅ 안정화**. e2e-nightly 첫 실 작동 검증은 §8 후속.

## 8. 신규 finding (v5 본 doc 진입)

### 8.1 modes wrapper 학습 로직 추적성

PR #92 가 `resolveRating('time-attack')` 에 `elapsedMs` 의존 + deep-recall 에 R<0.6 매직 넘버 도입. 추후 학습 효과 측정 시 **mode 별 rating 분포 + retention curve** 추적 의무.

- 권고: `proc/spec/06-콘텐츠-데이터.md` 또는 별 spec 에 mode 별 rating 출력 표준 정의 (FSRS-6 의 again/hard/good/easy 매핑 + 30초 압박 시 again 강제 = 학습 신호로 동등 취급 여부)
- v4 §6 의 "콘텐츠 트랙 (16 official 게임 × +5장)" 와 별 트랙

### 8.2 Plan G Phase 1.7·1.8 사용자 합의 정체

PR #93·#94 머지로 plan 신설은 정착했으나 **D1·D2 사용자 합의 0건** (G1/G3/G4 합의 대기). 본 doc 시점 4일 정체.

- Phase 1.7: spec/01 §3 의 Next.js docs 우선 룰 → 본 리포 한정 분기 룰 신설 (A 추천)
- Phase 1.8: spec/01 PII 0 + spec/09 이메일 V2 재검토 ↔ spec/05 §5.7.5 V1.5 외부 위임 정합화 (A 추천 — 예외 조항 신설)
- → **본 audit 와 별개로 차기 daily_outcome (사용자 누적 정리 PR 머지 시) 합의 추천 섹션에 라우팅 의무**

### 8.3 Plan D D2·D3·D4·D6·D7 합의 5건 정체

D1(V2=2026 Q4) + D5(Toss) 합의 완료. 잔여 5건 (가격 모델·기능 비교·가격대·환불·학생할인) 모두 G1/G3/G4 합의 대기.

- D1(2026 Q4) 기준 역산 시 가격 정의 (D2·D4) 가 가장 선행. D3 기능 비교는 D2 모델 따라 가변. D6·D7 는 D2·D4 후
- → **합의 권장 순서**: D4 가격대 → D2 가격 모델 → D3 기능 비교 → D6 환불 → D7 학생할인
- → 본 audit 와 별개로 차기 daily_outcome (사용자 누적 정리 PR 머지 시) 합의 추천 섹션에 라우팅 의무

### 8.4 production 미반영 8 PR 누적

§6 참조. **별 finding 으로 격상**: dry-run 시점 7건 → 본 doc 시점 8건 (#98·#99·#100·#101 추가). 사용자 본인 액션이 4일 이월. 본 audit 후 1회 액션으로 일괄 해소 가능 — 그러나 자동화 불가 (`project_deploy_manual` 메모리 룰: webhook 복구는 admin 권한 이슈로 영구 우회).

## 9. 메트릭 (v3/v4 §5 갱신)

| 항목 | v3 | v4 | v5 본 doc |
|---|---|---|---|
| 게임 수 | 21 | 21 | 21 |
| critical 미해소 | 0 | 0 | 0 |
| informational 미해소 | 17 | 8 | 8 (정체) |
| vitest | 201 | 221 | (확인 필요: PR #91·#92 머지 후 신규 테스트 — `bun test` 1회 실 카운트) |
| 단일 백본 완결 | 4/4 | 5/5 | 5/5 (modes wrapper 학습 로직 확장) |
| 모드 wrapper 채택률 | 21/21 default | 21/21 default + 3 모드 rating 정식 | 21/21 default + review-queue 16 호출처 + time-attack 4 메커니즘 + deep-recall R<0.6 |
| 머지 PR (audit 사이클) | — | 5 (#76~#81) | **15** (#84~#101, 본 audit 본 doc PR 제외) |
| production 미반영 PR | — | — | **8** (#91·#92·#93·#94·#98·#99·#100·#101) |
| CI 워크플로우 | codex-review.yml 없음 | 없음 | codex-review.yml + e2e-nightly.yml + runner group 라우팅 |

## 10. 다음 트랙 (v3/v4 §6 갱신)

### Plan D 잔여
- D2·D3·D4·D6·D7 사용자 합의 — §8.3 권장 순서 (G1·G3·G4)
- 합의 후 spec/05 §5.7 갱신 + `/manage/billing/page.tsx` 유료 플랜 preview 콘텐츠 갱신
- V2 결제 게이트웨이 Toss Payments 실 연동 — V2 출시 시점(2026 Q4) 역산 일정

### Plan E 잔여
- D1.5 mode 별 UI 정착도 audit (홈/허브 진입점은 PR #92 머지로 정착)
- mode 별 rating 분포·retention curve 측정 — §8.1 추적성 표준

### Plan G 후속
- Phase 1.7 사용자 합의 (§8.2)
- Phase 1.8 사용자 합의 (§8.2)
- e2e-nightly 첫 실 작동 검증 (§7)

### v3/v4 informational 잔존 8건 fix plan (§3 정체)
- 누적 3 사이클 정체 → 별 fix plan 진입 신호. 단순 fix 중심: icon alias·barrel 중복·PWA start_url 우선
- GameHubPage Suspense 경계는 Plan E Phase 5 진입점 추가로 영향 면적 ↑ → 우선순위 ↑

### production 동기화
- 사용자 본인 `bunx vercel --prod` 1회 → PR #91~#101 8건 일괄 반영
- 반영 후 본 doc §6 production 동기화 행 갱신 — 별 PR 또는 다음 audit 사이클 (v6)

## 11. 메모리 룰 (v3/v4 §7 갱신)

| 룰 | v4 | v5 본 doc |
|---|---|---|
| 단일 백본 + 다중 모드 (`project_architecture_decision`) | ✅ 5/5 | ✅ — modes wrapper 학습 로직 확장 (PR #92) 으로 메모리 룰 본격 발현 |
| 하이퍼캐주얼 (RPG 금지) (`feedback_scale_hypercasual`) | ✅ | ✅ — time-attack 30초/카드 + 부드러운 색 강조 (RPG 패턴 0) |
| 학습효과 우선 (`feedback_design_priorities`) | ✅ | ✅ — `again` 강제 페널티 = FSRS 재학습 신호. deep-recall R<0.6 = 약점 카드 풀 |
| 문서화 먼저 (`feedback_docs_first`) | ✅ | ✅ — Plan G Phase 1.7·1.8 모두 plan 먼저 작성 후 spec 수정 대기 |
| 결단력 (`feedback_decisive_execution`) | ✅ | ✅ — §8.2·§8.3 모두 추천 1개 명시 |
| 정답 시각 피드백 + 5회 reveal (`feedback_correct_feedback_and_reveal`) | ✅ | ✅ — TimeAttackTimer (PR #92) 도 CorrectBurst + useAttemptCounter 공통 |
| 사용자 진술 의도 그대로 (`feedback_user_intent_literal`) | ✅ | ✅ |
| Vercel 수동 배포 (`project_deploy_manual`) | — | ✅ — §6 production 동기화 행 명시. 자동화 X (룰 그대로 유지) |
| 다른 세션 브랜치 자동 수정 금지 (CONVENTION §6) | ✅ | ✅ — 본 audit 작성 중 main 외 브랜치·다른 세션 파일 0건 수정 |
| AI 검증 거버넌스 — Codex 룰북 회피 금지 (CLAUDE.md §9, 2026-05-20 정착) | — | ✅ — PR #91·#92 모두 Codex 다회 round 받아 코드 fix 로 응답 (룰북 회피 0) |

→ **0 violation**.

## 12. 본 audit 산출 절차

- 본 doc 작성: 별 PR (`chore/audit-v5-and-plan-g-follow-up` 브랜치). 코드 변경 0, docs only.
- 사용자 검증: 본 doc 머지 후 §6 production 동기화 행의 "사용자 본인 vercel --prod" 1회 액션 + §8.2·§8.3 합의 우선순위 확인.
- 다음 audit (v6) 트리거: §10 잔여 트랙 진척 + 사용자 합의 후 spec/01·09·05 정합화 머지 시점.
