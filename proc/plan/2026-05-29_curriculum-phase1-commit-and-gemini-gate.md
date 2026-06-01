# Curriculum Phase 1 커밋 + Gemini GATE — 2026-05-29

> 작성: Claude Sonnet 4.6 (에이전트) · 2026-05-29
> 근거: `daily_outcome/2026-05-29.md` A·B·C 단계
> 연결: `proc/plan/2026-05-27_curriculum-ai-content-creation.md` · `proc/plan/2026-05-28_gemini-adapter.md`

## 목적

WIP 56개(38개 파일, git diff --stat 기준) 가 단일 working tree 에 혼재한다.
이를 3 커밋 그룹(curriculum Phase 1 / Gemini prep GATED / dashboard 삭제 분류보류)으로 스코프 분리하고,
curriculum Phase 1 분만 브랜치(`feat/curriculum-phase1`) 에 커밋한다.
Gemini adapter 및 spec 변경분은 합의 대기(GATED) 상태로 기록만 남긴다.

---

## WIP 56개 3그룹 분류표

| 그룹 | 파일 | 커밋 여부 | 사유 |
|---|---|---|---|
| **A — curriculum Phase 1** | `src/lib/core/curriculum/catalog/` (신규 dir 전체: types.ts, catalog-loader.ts, catalog-loader.test.ts, 5 영어 JSON + 5 수학·국어 JSON = 10 JSON) | 커밋 O | Phase 1 핵심 데이터·로더 |
| A | `src/lib/core/curriculum/index.ts` | 커밋 O | catalog re-export 2줄 추가 |
| A | `src/lib/core/curriculum/seed-loader.ts` | 커밋 O | `listSeedSubjects` 제거 (V1.5 통합 picker 이관) |
| A | `src/lib/core/curriculum/converters.test.ts` | 커밋 O | `listSeedSubjects` import 제거·테스트 삭제 |
| A | `src/lib/core/curriculum/types.ts` | 커밋 O | `SeedSubjectMeta` 인터페이스 제거 |
| A | `src/lib/core/custom/types.ts` | 커밋 O | `CustomCardSource` 타입 + `source?` 필드 추가 (spec/06 §6.11) |
| A | `src/lib/core/custom/index.ts` | 커밋 O | `llm-quota` · `llm-cache` re-export |
| A | `src/lib/core/custom/llm-quota.ts` (신규) | 커밋 O | 일일 30회 가드 (spec/06 §6.12) |
| A | `src/lib/core/custom/llm-cache.ts` (신규) | 커밋 O | 7일 TTL localStorage 캐시 (spec/06 §6.10) |
| A | `src/lib/server/ai/anthropic.ts` | 커밋 O | `generateFromCurriculumLLM` 추가 (Mode A) |
| A | `src/app/manage/content/actions.ts` | 커밋 O | catalog+LLM 경로 추가 (`generateFromCurriculumAction` 확장) |
| A | `src/components/manage/auto/CurriculumPicker.tsx` | 커밋 O | 2-depth → 4-depth 리팩 |
| A | `src/app/manage/content/page.tsx` | 커밋 O | 4-depth picker 연동 + quota/cache UI |
| A | `daily_outcome/2026-05-27.md` (신규) | 커밋 O | 일일 산출물 |
| A | `daily_outcome/2026-05-28.md` (신규) | 커밋 O | 일일 산출물 |
| A | `proc/plan/2026-05-27_curriculum-ai-content-creation.md` (신규) | 커밋 O | Phase 1 근거 plan |
| A | `proc/plan/2026-05-28_gemini-adapter.md` (신규) | 커밋 O | Gemini 근거 plan (GATED 기록 보존) |
| A | `e2e/manage-content-curriculum.spec.ts` (신규) | 커밋 O | e2e 테스트 |
| A | `src/components/game-mechanics/normalizeAnswer.ts` (신규) | 커밋 O | 답 정규화 유틸 |
| A | `src/components/game-mechanics/normalizeAnswer.test.ts` (신규) | 커밋 O | 단위 테스트 |
| A | `src/app/icon.svg` (신규) | 커밋 O | 아이콘 파일 |
| **C — Gemini prep GATED** | `src/lib/server/ai/gemini.ts` (신규) | 커밋 X | spec/09 변경 동반 → G1/G3/G4 합의 필요 |
| C | `src/lib/server/ai/index.ts` (신규) | 커밋 X | Gemini/Anthropic provider switch — gemini.ts 의존 |
| C | `package.json` | 커밋 X | `@google/genai` 패키지 추가 — Gemini prep 의존 |
| C | `bun.lock` | 커밋 X | package.json 변경분 lockfile |
| **GATED — spec 변경** | `proc/spec/03-핵심-기능.md` | 커밋 X | §9 거버넌스 — spec 변경 = G1/G3/G4 합의 필요 |
| GATED | `proc/spec/06-콘텐츠-데이터.md` | 커밋 X | §6.10·§6.11·§6.12 신설 — 합의 필요 (단, 코드는 이미 이 spec 을 따름) |
| GATED | `proc/spec/08-디자인-시스템.md` | 커밋 X | design token 변경 동반 — 합의 필요 |
| GATED | `proc/spec/09-기술-환경.md` | 커밋 X | LLM provider 정책 신설 — 합의 필요 |
| **분류 보류** | `src/app/layout.tsx` | 보류 | theme_color `#FBFAF8` → `#0362DA` — branding 변경. 단독 커밋 필요 |
| 보류 | `src/app/manifest.ts` | 보류 | 동일 |
| 보류 | `src/app/opengraph-image.tsx` | 보류 | accent color `#00D4A1` → `#0362DA` 전면 교체 — branding 커밋 |
| 보류 | `tailwind.config.ts` | 보류 | `accent-positive` + `pullim-blue` 팔레트 전면 교체 — spec/08 GATED 와 연동 |
| 보류 | `src/components/shell/app-header.tsx` | 보류 | 로고 SVG 교체 — branding 커밋 |
| 보류 | `src/components/shell/app-shell.tsx` | 보류 | `DevResetButton` import — dev 유틸. Phase 1 범위 외 |
| 보류 | `src/components/dev/DevResetButton.tsx` (신규) | 보류 | dev 유틸 컴포넌트 |
| 보류 | `src/components/dashboard/GameSparkline.tsx` (삭제) | 보류 | dashboard 삭제분 — 별도 커밋 |
| 보류 | `src/components/dashboard/GameStatCard.tsx` (삭제) | 보류 | 동일 |
| 보류 | `src/components/dashboard/UntouchedGamesGrid.tsx` (삭제) | 보류 | 동일 |
| 보류 | `src/components/dashboard/sparkline-paths.test.ts` (삭제) | 보류 | 동일 |
| 보류 | `src/components/dashboard/sparkline-paths.ts` (삭제) | 보류 | 동일 |
| 보류 | `src/components/dashboard/CompactActivity.tsx` (신규) | 보류 | dashboard 리팩 연동 — 삭제분과 함께 |
| 보류 | `src/app/page.tsx` | 보류 | CompactActivity 전환 — dashboard 리팩과 함께 |
| 보류 | `src/components/game-hub/ModeChipsRow.tsx` | 보류 | comment accent color 업데이트 — branding 커밋 |
| 보류 | `src/components/game-hub/preview-mocks/MatchingMock.tsx` | 보류 | accent `#00D4A1` → `#0362DA` — branding 커밋 |
| 보류 | `src/components/game-hub/preview-mocks/TypingMock.tsx` | 보류 | 동일 |
| 보류 | `src/components/game-mechanics/TypingComponent.tsx` | 보류 | 내용 확인 필요 — 분류 보류 |
| 보류 | `src/components/manage/auto/ModeToggle.tsx` | 보류 | 내용 확인 필요 — 분류 보류 |
| 보류 | `src/components/ui/CorrectBurst.tsx` | 보류 | 내용 확인 필요 — 분류 보류 |
| 보류 | `src/games/factorization/component.tsx` | 보류 | boxShadow accent 교체 — branding 커밋 |
| 보류 | `src/games/factorization/components/DropZone.tsx` | 보류 | 동일 |
| 보류 | `src/games/factorization/components/FactorChipRack.tsx` | 보류 | 동일 |
| 보류 | `e2e/enter-key-shortcut.spec.ts` (신규) | 보류 | 분류 확인 필요 |

---

## A — curriculum Phase 1 (개발가능)

**브랜치**: `feat/curriculum-phase1` (main 에서 분기)
**커밋 파일**: 위 표 "커밋 O" 행 전체

### 포함 근거

- `catalog/` JSON 10건 + `types.ts` + `catalog-loader.ts` + `catalog-loader.test.ts`: Phase 1 핵심 데이터·로더. spec/06 §6.10 에 근거한 카탈로그 스키마 구현.
- `llm-quota.ts` · `llm-cache.ts`: spec/06 §6.12·§6.10 비용 가드·캐시. 코드 자체가 spec 근거 명시.
- `anthropic.ts` 확장: Mode A `generateFromCurriculumLLM`. Gemini GATED 상태이므로 `actions.ts` 는 현재 `@/lib/server/ai` 를 import — `index.ts` GATED 인 채로 빌드되면 오류 발생 가능.
  - **주의**: `actions.ts` 가 `@/lib/server/ai` (index.ts) 를 import하므로, index.ts GATED 상태에서는 `actions.ts` 의 import 경로를 `@/lib/server/ai/anthropic` 으로 임시 복원 필요 → 커밋 전 확인.
- `CurriculumPicker.tsx` + `page.tsx`: 4-depth picker + quota/cache UI. UI 변경 포함 → viewport audit 의무.

### 제외 근거

- `gemini.ts` · `index.ts` (provider switch): spec/09 변경 동반 + G1/G3/G4 합의 미완 → GATED
- `package.json` · `bun.lock`: `@google/genai` 추가 = Gemini prep → GATED
- `proc/spec/03·06·08·09`: 권위 문서 변경 = §4 G1/G3/G4 합의 필요 → GATED

---

## B — Phase 0 D2·D3 분석 (개발 불필요 — 기록)

### D2: 교육과정 데이터 출처

**결론**: **NCIC 2022 개정 영어과 성취기준** 사용 확정.

- 카탈로그 JSON 10건을 분석한 결과 achievementCodes 가 NCIC 2022 학년군 prefix 패턴을 따름:
  - 초3-4군: `[4영XX-XX]`, 초5-6군: `[6영XX-XX]`, 중1-3군: `[9영XX-XX]`
- achievementText 는 NCIC 2022 개정 성취기준 문구를 요약·재서술한 형태 (LLM system prompt 컨텍스트 용).
- 검정 교과서 단원명은 publisher 마다 다르므로 unitName 은 성취기준 주제 기반으로 독립 작성됨.

**출처 확정**: NCIC 2022 개정 영어과 성취기준 공시문서 기반. 저작권: 교육과정 성취기준 자체는 공공저작물 (교육부 고시). unitName 은 파생이 아닌 독자 서술.

### D3: spec/06 정합 확인

**결론**: 코드-spec 정합 확인. 충돌 미발견 (단, spec/06 §6.10·§6.11·§6.12 는 아직 WIP 상태로 미커밋 — GATED).

- `CatalogUnit` 스키마가 spec/06 §6.10 필드 정의와 일치 (`gradeBand`, `subject`, `grade`, `unitId`, `achievementCodes[]`, `achievementText`, `suggestedKinds[]`, `focusVocab?[]`, `focusGrammar?[]`).
- `CustomCardSource` 타입이 spec/06 §6.11 (`"manual"` · `"curriculum-seed"` · `"curriculum-ai"` · `"source-text-ai"`) 과 일치.
- LLM 일일 30회 가드가 spec/06 §6.12 정의와 일치.
- **충돌 없음**. 단, spec/06 WIP 분(§6.10~§6.12 추가분) 이 커밋되지 않은 상태이므로 — spec 커밋은 G1/G3/G4 합의 후 별도 PR 로 처리.

---

## C — Gemini adapter (GATED)

**상태**: 합의 대기. 구현 금지.

근거: `proc/plan/2026-05-28_gemini-adapter.md` Phase 0 합의 미완 확인.

- `gemini.ts` 이미 작성됨 (WIP) — 커밋 제외. spec/09 §9.1·§9.2·§9.4 갱신 없이 코드만 머지 불가.
- `src/lib/server/ai/index.ts` (provider switch) 이미 작성됨 (WIP) — 커밋 제외. `actions.ts` 가 이 파일 import 중이므로, Phase 1 커밋 시 `actions.ts` import 경로를 임시 `@/lib/server/ai/anthropic` 으로 복원.
- `package.json` `@google/genai` 추가 + `bun.lock` 변경 — 커밋 제외.

합의 필요 사항 (G1/G3/G4):
1. Gemini default + Anthropic fallback 구조 승인
2. `GOOGLE_AI_STUDIO_API_KEY` 환경변수 정책 승인
3. `proc/spec/09 §9.1·§9.2.x·§9.4` 갱신 내용 검토

합의 완료 시: `2026-05-28_gemini-adapter.md` Phase 1~5 순차 실행 → 별도 `feat/gemini-adapter` 브랜치.

---

## 3단계 — 검증 계획

커밋 대상(curriculum Phase 1)만 스테이징 후:

1. `bunx tsc --noEmit` — 통과 필수 (머지 게이트)
2. `bun run lint` — 통과 필수 (머지 게이트)
3. `bun run ui:audit src/app/manage/content/page.tsx` — CurriculumPicker + page.tsx UI 변경 포함 → viewport audit 의무 (결과 이 plan 에 추가)

> viewport audit 결과는 실행 후 아래 섹션에 기록.

---

## 블로커

| 항목 | 상태 | 처리 |
|---|---|---|
| `actions.ts` import `@/lib/server/ai` → `index.ts` 없으면 빌드 실패 | 커밋 전 확인 필요 | Phase 1 커밋 시 import 경로 임시 복원 (or index.ts 를 anthropic-only skeleton 으로 커밋 가능 여부 검토) |
| spec/06·08·09 GATED — 코드는 이미 반영 중 | G1/G3/G4 합의 대기 | C 합의 후 별도 spec PR |
| Gemini API key — `.env.local` 에 존재 (Phase 0 완료) | 합의 후 바로 착수 가능 | - |
| vercel --prod | 사용자 직접 액션 필수 | Phase 1 PR 머지 후 |

---

## 참조

- `proc/plan/2026-05-27_curriculum-ai-content-creation.md` — Phase 0~5 전체 로드맵
- `proc/plan/2026-05-28_gemini-adapter.md` — Gemini adapter 상세
- `CLAUDE.md §4·§9` — 거버넌스 · spec 변경 룰
- `proc/spec/06-콘텐츠-데이터.md` §6.10·§6.11·§6.12 (GATED — 합의 후 커밋)
