# Gemini LLM 어댑터 랜딩 — WIP rot 종결 + provider switch

> 작성: Claude Opus 4.8 (에이전트) · 2026-06-30
> 근거: `proc/plan/2026-05-28_gemini-adapter.md`(어댑터 설계) · `daily_outcome/2026-06-30.md` E 항목
> 권한: 사용자 G1 — "각 게이트 협의 대신 가장 추천하는 방식으로 진행" 위임(2026-06-30). spec/09 합의 게이트 waive.
> 연결: `2026-05-29_curriculum-phase1-commit-and-gemini-gate.md`(그룹 C GATED 해소) · [[project_architecture_decision]]

## 0. 문제 — 11일+ untracked WIP rot

`gemini.ts`(476줄)·`index.ts`(provider switch) 가 **죽은 경로** `apps/games/src/lib/server/ai/` 에 untracked 로 11일+ 방치. `src/` 래퍼는 #122 모노레포 재구조화에서 제거됨 → 현 정식 코드는 `apps/games/lib/...`. 즉 WIP 가 더 이상 존재하지 않는 디렉터리 구조에 떠 있었음. actions.ts 는 `KNOWN-TRADE-OFF` 주석으로 anthropic 직접 import 유지 중이었음.

## 1. 결정 — behavior-neutral 랜딩 (기본 anthropic)

WIP 의 `index.ts` 는 **기본 provider 를 Gemini 로** 두고 있었음("recurring 무료 티어"). 그대로 랜딩하면:
- 동작이 Gemini 로 바뀜 (behavior-neutral 아님)
- prod `GOOGLE_AI_STUDIO_API_KEY` 미provisioning 시 콘텐츠 생성 전면 장애

→ **기본값을 anthropic 으로 뒤집어 랜딩**. 현 동작 100% 유지, Gemini 는 `LLM_PROVIDER=gemini` 명시 opt-in. 기본 provider 플립(무료 티어 채택)은 prod 키 provisioning 후 별도 1줄 PR.

## 2. 변경 내역

| 파일 | 변경 |
|---|---|
| `apps/games/lib/server/ai/gemini.ts` (신규, 이동) | `src/lib/server/ai/gemini.ts` → 정식 경로. 내용 무수정. anthropic.ts 와 동일 public API(`generateFromSourceLLM`·`generateFromCurriculumLLM` + 4 타입) |
| `apps/games/lib/server/ai/index.ts` (신규, 이동) | provider switch. **기본 anthropic** 로 정정(`LLM_PROVIDER === "gemini" ? gemini : anthropic`), 타입 re-export 도 anthropic 기준 |
| `apps/games/app/manage/content/actions.ts` | import 출처 `@/lib/server/ai/anthropic` → `@/lib/server/ai`(스위치). KNOWN-TRADE-OFF 주석 해소 |
| `apps/games/app/manage/content/actions.test.ts` | mock 경계 `@/lib/server/ai/anthropic` → `@/lib/server/ai` + `generateFromCurriculumLLM` mock 추가 |
| `apps/games/package.json` | `@google/genai ^2.10.0` 의존성 추가 |

## 3. 검증 (자가 검증 체크리스트)

- [x] `bun run typecheck` green — gemini.ts 정식 경로에서 컴파일(이전 "WIP gemini 제외" 단서 해소)
- [x] `bun run lint` green
- [x] `bun run test` — **492/492 pass** (이전 487 + actions.test.ts 5 복구)
- [x] `bun run build` green (전 라우트, 15.4s)
- [ ] e2e — 별도(`2026-06-30_e2e-infra-fix.md`). 본 변경은 server action import 경계만, 기본 동작 무변
- [ ] (후속) prod `GOOGLE_AI_STUDIO_API_KEY` provisioning + 기본 provider 플립 PR

## 4. 환경 변수

- `LLM_PROVIDER` (선택): `gemini` 면 Gemini, 그 외/미설정 = **anthropic**(기본).
- `GOOGLE_AI_STUDIO_API_KEY`: `LLM_PROVIDER=gemini` 시에만 필요(gemini.ts `getClient()` 가 읽음 — 계약 정합: `2026-05-28_gemini-adapter.md` §43·§67). 기본 경로에선 불필요 → 본 PR 은 새 secret 의존 0.
- 기존 `ANTHROPIC_API_KEY` 경로 무변.

## 5.1 Codex Review round 1 — 코드 fix 응답 (회피 아님, 거버넌스 §9)

PR #128 codex 가 머지 전 차단 2건 지적 → 둘 다 코드 fix 로 응답:

1. **secret 이름 불일치** — 코드는 `GOOGLE_AI_STUDIO_API_KEY`(gemini.ts `getClient()`)인데 본 plan 초안이 `GEMINI_API_KEY` 로 오기. 계약 정식 이름은 `GOOGLE_AI_STUDIO_API_KEY`(2026-05-28 plan·전 daily 일치) → plan·index.ts 주석을 코드에 맞춰 정정. 코드 env 이름 무변.
2. **Zod 런타임 검증 누락 (spec/01 §21)** — gemini.ts `cardsJsonToDrafts` 가 외부 AI JSON 을 `as TypingJson` 타입 단언으로 받던 것을 → 4 kind 별 Zod 스키마(`safeParse`) 검증으로 교체. API `responseJsonSchema` 1차 강제 + 파싱 결과 2차 Zod 재검증(신뢰 경계 밖 입력). 검증 실패 → `[]` 반환 → 호출자 친절 에러. (참고: anthropic.ts `toolInputToDrafts` 도 동일 `as` 패턴이나 본 PR delta 밖 — 후속 정합 대상)

## 5.2 Codex Review round 2 — 코드 fix 응답

round1 fix 반영 후 codex 가 새 차단 2건 지적 → 코드 fix:

1. **`LLM_PROVIDER` 오타 silent fallback** — `=== "gemini" ? gemini : anthropic` 는 `gemni` 같은 오타를 조용히 anthropic 으로 흘려 운영 오설정을 은폐(silent fallback 금지 위반). → `getLlmProvider()` 가 미설정=anthropic 유지하되, **인식 못 하는 값은 throw**. 설정 실수를 즉시 드러냄.
2. **객관식 `correctIndex` 정수성 미보장** — Zod `z.number()` 는 비정수(2.5)·범위밖을 통과시켜 `choices[idx]=undefined` → 풀 수 없는 카드 생성 가능. → `z.number().int().min(0).max(3)` 로 강제(responseJsonSchema 의 `type:integer, 0~3` 와 런타임 정합).

검증: typecheck·lint green, test 492/492.

## 5. 거버넌스

- KNOWN-TRADE-OFF(`2026-05-29 ... C 항목`) 정당 해소 — "spec/09 합의 후 별도 PR" 게이트를 사용자 G1 가 직접 waive(본 plan 권한 줄). 회피 아님(코드로 게이트 해소).
- 단일 백본 룰([[project_architecture_decision]]) 위반 아님 — provider 교체는 동일 콘텐츠 생성 백본의 LLM 구현 swap 일 뿐, 게임 백엔드 분리 아님.
