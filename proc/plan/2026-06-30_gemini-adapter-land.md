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
- prod `GEMINI_API_KEY` 미provisioning 시 콘텐츠 생성 전면 장애

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
- [ ] (후속) prod `GEMINI_API_KEY` provisioning + 기본 provider 플립 PR

## 4. 환경 변수

- `LLM_PROVIDER` (선택): `gemini` 면 Gemini, 그 외/미설정 = **anthropic**(기본).
- `GEMINI_API_KEY`: `LLM_PROVIDER=gemini` 시에만 필요. 기본 경로에선 불필요 → 본 PR 은 새 secret 의존 0.
- 기존 `ANTHROPIC_API_KEY` 경로 무변.

## 5. 거버넌스

- KNOWN-TRADE-OFF(`2026-05-29 ... C 항목`) 정당 해소 — "spec/09 합의 후 별도 PR" 게이트를 사용자 G1 가 직접 waive(본 plan 권한 줄). 회피 아님(코드로 게이트 해소).
- 단일 백본 룰([[project_architecture_decision]]) 위반 아님 — provider 교체는 동일 콘텐츠 생성 백본의 LLM 구현 swap 일 뿐, 게임 백엔드 분리 아님.
