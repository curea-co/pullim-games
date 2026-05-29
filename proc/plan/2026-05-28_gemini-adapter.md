# Gemini (Google AI Studio) provider 어댑터 추가

> Status: DRAFT — 사용자 합의 후 시작
> 연결: `proc/plan/2026-05-27_curriculum-ai-content-creation.md` (V1.5 LLM 어댑터 분리)
> 권위 문서: `proc/spec/09-기술-환경.md §9.1` (LLM provider 정책 신설), `proc/spec/06-콘텐츠-데이터.md §6.12` (quota 가드 — provider 무관)

## 배경

V1.5 (`/manage/content` catalog-ai) 는 `src/lib/server/ai/anthropic.ts` 하나로 Claude Haiku 4.5 만 호출하는 구조. 2026-05-27 e2e 검증 시도 중 claude 가 다른 리포(`pullim-preview`, curea-co org) 의 `ANTHROPIC_API_KEY` 를 무단 복사·사용하는 **거버넌스 사고** 발생 (`feedback_no_secret_auto_copy` 보강 필요). 사용자가 본인 키 발급 의향을 보였으나, Anthropic 콘솔은 결제수단 등록 + $5 1회 크레딧 (recurring 아님) — 개발 단계에서 마찰이 큼.

대안 조사 결과 **Google AI Studio (`@google/genai` SDK + Gemini 2.5 Flash)** 가 본 리포 V1.5 요구사항에 더 맞음:

| 항목 | Anthropic Claude (현재) | Google AI Studio Gemini |
|---|---|---|
| 무료 티어 | $5 1회 (신규 가입 시), 이후 결제수단 필수 | **recurring** — Gemini 2.5 Flash RPM/RPD 제한 내 영구 무료 |
| structured output | tool-use (2-step) | `responseSchema` (native JSON Schema, 1-step) |
| 한국어 NCIC 컨텍스트 품질 | Haiku 4.5 (충분) | 2.5 Flash (동급, OSS 벤치마크 기준) |
| SDK | `@anthropic-ai/sdk` (이미 설치) | `@google/genai` (신규) |
| 키 발급 마찰 | 결제수단 + 콘솔 가입 | Google 계정만 — AI Studio 클릭 한 번 |

타 풀림 프로젝트도 OpenRouter → Google AI Studio 로 직결 전환한 패턴이 관찰됨 (사용자 진술 2026-05-28) — vendor lock-in 회피 + 무료 티어 직접 접근.

## 결정

1. **Gemini 를 기본 provider 로** 추가하고 Anthropic 은 fallback 으로 유지. provider 선택은 `LLM_PROVIDER` env (`gemini` | `anthropic`, default `gemini`).
2. **API surface 동일**: 신규 `src/lib/server/ai/gemini.ts` 가 `generateFromSourceLLM` · `generateFromCurriculumLLM` 두 함수를 mirror — `anthropic.ts` 와 100% 시그니처 호환. actions.ts 는 provider 변수 한 줄만 분기.
3. **structured output 은 `responseSchema`** 사용 — tool-use round-trip 제거. 4 메커니즘 (`multiple-choice`/`blank`/`typing`/`word-match`) 의 입력 스키마를 JSON Schema 로 변환 (`difficulty` 1~5 포함).
4. **권위 문서 갱신**: `spec/09 §9.1` 에 LLM provider 정책 표 신설 (dual provider, env switch, free-tier 우선). `spec/06` 은 quota 가드만 정의하므로 provider 무관 — 변경 없음.
5. **거버넌스 (CLAUDE.md §9)**: 본 plan 은 권위 문서(`spec/09`) 변경을 동반 → 사용자 합의 후 진행. spec 회피 목적 수정 아님 — 새 provider 추가는 정당한 명세 진화.
6. **메모리 룰 보강**: `feedback_no_secret_auto_copy` 신규 — "다른 리포의 .env 키를 자동 복사 금지. git remote + commit author 로 소유권 검증 후 사용자 명시 확인".

## 작업 항목

### Phase 0 — 합의 (선결)

- [ ] 본 plan 사용자 합의 (Gemini default + Anthropic fallback 구조)
- [ ] 사용자 본인 GOOGLE_AI_STUDIO_API_KEY 확보 (✅ 2026-05-28 발급 완료, `.env.local` 저장)

### Phase 1 — 어댑터 신설

- [ ] `bun add @google/genai`
- [ ] `src/lib/server/ai/gemini.ts` 작성
  - `getClient()` — `process.env.GOOGLE_AI_STUDIO_API_KEY` 검증, GoogleGenAI 인스턴스 cache
  - `generateFromSourceLLM(input)` — Mode B 호환 (signature 동일)
  - `generateFromCurriculumLLM(input)` — Mode A 호환 (signature 동일)
  - 4 메커니즘 JSON Schema (`buildResponseSchema(kind)`) — `difficulty` 1~5 포함
  - `toolInputToDrafts(kind, input)` — anthropic.ts 의 동명 함수와 동일 로직 재사용 (export 해서 공유 or 동일 구현 복제)
  - 모델: `gemini-2.5-flash`
- [ ] `MODEL` · `MAX_TOKENS` · `MAX_SOURCE_CHARS` 상수는 anthropic.ts 와 동일 (8000)
- [ ] system prompt builder (`buildSystemPrompt` · `buildCurriculumSystemPrompt`) 는 anthropic.ts 와 동일 — `src/lib/server/ai/prompts.ts` 로 추출해 두 어댑터가 공유 (선택적 refactor; V1 은 복제로 OK)

### Phase 2 — provider switch

- [ ] `src/lib/server/ai/index.ts` 신규 — `getLlmProvider()` + provider-neutral exports
  ```ts
  export const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "gemini";
  export const generateFromSourceLLM = provider === "gemini" ? gemini.generateFromSourceLLM : anthropic.generateFromSourceLLM;
  // ...
  ```
- [ ] `src/app/manage/content/actions.ts` import 경로를 `@/lib/server/ai/anthropic` → `@/lib/server/ai` 로 교체
- [ ] 에러 메시지 generic 유지 — "자동 생성에 실패했어요" (provider 누설 X)

### Phase 3 — 권위 문서 갱신 (spec/09)

- [ ] `spec/09 §9.1` 핵심 스택 표에 "LLM provider" 행 추가
  - V1.5: Gemini 2.5 Flash (default) + Anthropic Haiku 4.5 (fallback)
  - 키: `GOOGLE_AI_STUDIO_API_KEY` (필수) + `ANTHROPIC_API_KEY` (선택)
  - env switch: `LLM_PROVIDER=gemini|anthropic` (default gemini)
- [ ] `spec/09 §9.2.x` "LLM provider 결정" subsection 신설 — Gemini default 근거 (recurring free tier + responseSchema native)
- [ ] `spec/09 §9.4` 배포 환경변수 표에 `GOOGLE_AI_STUDIO_API_KEY` 추가 (Vercel)

### Phase 4 — 검증

- [ ] `bunx tsc --noEmit` 통과
- [ ] `bun run lint` 통과
- [ ] 기존 `bun test src/lib/core/curriculum/catalog/catalog-loader.test.ts` 등 단위 테스트 무영향 확인
- [ ] dev server (`bun dev`) 기동 → 브라우저 `/manage/content` 에서 영어 초4 "안녕! 만나서 반가워" / 객관식 5장 자동 생성 → 정상 응답 확인 (실 Gemini API 1회 호출)
- [ ] localStorage `pullim-games:llm-quota:YYYY-MM-DD` 카운터 1 증가 확인
- [ ] e2e (`e2e/manage-content-curriculum.spec.ts`) 3 시나리오 전부 통과 — provider 변경에도 영향 없어야 (seed/cache/quota 가드 시나리오는 LLM 미호출)

### Phase 5 — 메모리 룰 + 거버넌스

- [ ] `feedback_no_secret_auto_copy.md` 신규 — "타 리포 .env 자동 복사 금지" 룰
- [ ] daily_outcome 2026-05-28 누적 — 본 plan 진행·머지·검증 결과
- [ ] PR 본문에 "권위 문서 변경 (spec/09) 동반 — CLAUDE.md §4 사용자 합의 절차 거침" 명시

## 검증 기준 (DOD)

1. `LLM_PROVIDER` 미지정 (default) 상태에서 `/manage/content` catalog-ai 정상 동작
2. `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` 셋 시 Anthropic 경로로 폴백 가능 (기존 동작 보존)
3. 무료 티어 한도 안에서 dev/test 비용 0
4. e2e 3 시나리오 + 단위 테스트 모두 green
5. spec/09 갱신 + 사용자 머지 합의

## Out of Scope (본 plan 에서 X)

- spec/09 외 권위 문서 변경 (06·08 등은 그대로)
- Anthropic 어댑터 제거 (계속 유지 — fallback)
- Gemini Pro 등 상위 모델 옵션 (V1.5 는 Flash 만)
- 사용자 키 UI 입력 (env-only)
- prompt 공통화 리팩토링 (선택적, 후속 PR)
- Vercel 배포 환경변수 설정 (배포는 사용자 직접 — `bunx vercel --prod` 시점에 dashboard 에서 추가)

## 후속

- Gemini 무료 티어 RPD 한도 (~1500/일) 에 가까워지면 자동 Anthropic fallback (V2 고려)
- prompt builder 공통 `src/lib/server/ai/prompts.ts` 추출 (코드 중복 ~80줄)
- 모델 비교 평가 (Gemini vs Haiku — NCIC 카드 품질 정량 비교) — proc/research/ 후속
