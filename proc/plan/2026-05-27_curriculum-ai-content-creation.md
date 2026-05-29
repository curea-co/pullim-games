# 관리 — 실제 교육과정 기반 AI 문제 생성

## 목표

`/manage/content` 의 Mode A "교육과정" 을 **실제 한국 교육과정 트리**(학교급 → 과목 → 학년 → 대·소단원 → 성취기준) 카탈로그로 확장하고, 단원 선택 시 그 컨텍스트를 LLM 에 넘겨 4 메커니즘 (`multiple-choice`·`blank`·`typing`·`word-match`) 카드 N장을 생성·미리보기·저장할 수 있게 한다. 사용자는 picker 만으로 형식 학습 없이 콘텐츠 제작 완료.

## 현황 (조사 결과)

| 항목 | 현재 |
|---|---|
| `/manage/content` 페이지 | 존재. Mode A/B 토글 + 미리보기 + 저장 흐름 완성 |
| Mode A (교육과정) | `src/lib/core/curriculum/seed/math/factorization.json` **1건만** 등록. `convertSeedTo*Drafts` 로 정적 변환 (AI 안 씀) |
| Mode B (자료) | `generateFromSourceLLM` (Anthropic Haiku + tool-use) 로 LLM 생성 정상 작동 |
| seed 스키마 | `vocabulary` / `pairs` / `quizzes` / `passages` 4 종 자료로 단원별 JSON 1건 (`CurriculumSeed`) |
| picker | 2-depth cascade (subject → unit), `SeedSubjectMeta` 기반 |
| 저장 컨테이너 | `/manage/subjects` · `/manage/curriculum` 에서 사용자 과목·단원 CRUD (별도 트리) |

## 핵심 결정

1. **Mode A 를 "AI + 교육과정 컨텍스트" 로 일원화.** 정적 seed converter (Mode A 현재 구현) 는 제거하지 않고 **빠른 fallback** 으로만 유지 (seed 가 충분한 단원은 LLM 호출 절약). 신규 단원은 seed JSON 없이 교육과정 메타만으로 LLM 생성.
2. **교육과정 카탈로그는 2-depth → 4-depth 로 확장.** 학교급 · 과목 · 학년 · 단원 (필요 시 소단원). 성취기준 코드·문구를 단원 leaf 의 메타로 저장.
3. **V1 범위 = 영어 한 과목 × 초4·초5·초6·중1·중2 5 학년.** (2026-05-27 사용자 결정) 영어는 4 메커니즘 (`multiple-choice`·`blank`·`typing`·`word-match`) 모두 자연스럽게 매핑되고 어휘·예문 생성에 LLM 강점이 극대화. 학년당 6~12 단원 ≈ 총 40 단원 안팎. 한 과목 깊이로 커버해서 학습자 한 명이 5 년치 콘텐츠를 한 picker 안에서 만들 수 있게.
4. **메모리 룰 준수** (`feedback_no_format_imposition`): 사용자에게 마커·형식 요구 X. picker + LLM 만으로 완성.
5. **거버넌스** (CLAUDE.md §9): 권위 문서 `proc/spec/06-콘텐츠-데이터.md` 와 충돌 시 spec 먼저 정정.

## 작업 항목

### Phase 0 — 합의 (선결)

- [x] **MVP 교육과정 범위 확정** — 영어 1 과목 × 초4·초5·초6·중1·중2 (2026-05-27 결정)
- [ ] 교육과정 데이터 출처 결정 (NCIC 2022 개정 영어과 성취기준 + 검정 교과서 단원명 참조)
- [ ] 권위 문서(`proc/spec/06`) 와 본 카탈로그 스키마 정합 확인 — 충돌 시 spec/06 정정 별 PR

### Phase 1 — 교육과정 카탈로그 데이터 & 로더

- [ ] 카탈로그 스키마 정의: `CurriculumCatalog { gradeBand, subject, grade, unit, subUnitOpt, achievementCodes[], achievementText, suggestedKinds[], focusVocab[]?, focusGrammar[]? }`
- [ ] `src/lib/core/curriculum/catalog/` 디렉토리 신설 (기존 `seed/` 와 분리 — seed 는 vocabulary-rich fallback, catalog 는 메타+성취기준)
- [ ] MVP 범위 JSON 작성:
  - `catalog/elementary/english/grade-4.json` (초4 영어)
  - `catalog/elementary/english/grade-5.json` (초5 영어)
  - `catalog/elementary/english/grade-6.json` (초6 영어)
  - `catalog/middle/english/grade-1.json` (중1 영어)
  - `catalog/middle/english/grade-2.json` (중2 영어)
- [ ] `listCatalog()` · `findCatalogUnit(path)` API 추가 (기존 `listSeedSubjects` 와 병행)
- [ ] 카탈로그 단위 테스트 (`*.test.ts`) — 스키마 valid·중복 키·성취기준 코드 형식 검증

### Phase 2 — picker UX 4-depth 화

- [ ] `src/components/manage/auto/CurriculumPicker.tsx` 를 4-depth cascade 로 리팩 (학교급 → 과목 → 학년 → 단원)
- [ ] 단원 선택 시 **성취기준 요약** 픽커 하단 노출 (사용자 신뢰 + LLM 컨텍스트 미리보기)
- [ ] 모바일 320px viewport overflow 점검 (UI 변경 PR — viewport audit 의무)
- [ ] 단원이 seed 도 가지면 "정적 변환(빠름)" / "AI 생성(다양)" 옵션 노출, 없으면 AI 만

### Phase 3 — server action (Mode A + LLM)

- [ ] `generateFromCurriculumAction` 시그니처 확장: `catalogPath` (학교급/과목/학년/단원) + `kind` + `count`
- [ ] catalog 단원 컨텍스트(성취기준 + 단원명 + suggested 어휘 힌트) 를 system prompt 로 LLM 호출 — `src/lib/server/ai/anthropic.ts` 에 `generateFromCurriculumLLM` 추가
- [ ] seed 가 있는 단원은 seed-first → 모자라면 LLM 보충 (사용자 옵션 따름)
- [ ] LLM 응답 검증 (빈 choices·중복 정답·길이 이상치·메커니즘별 필수 필드) — 기존 Mode B 검증 재사용
- [ ] 실패 시 일반화 메시지 + 재시도 1회 (기존 패턴)

### Phase 4 — 품질·운영

- [ ] LLM 호출 무료 가드: 클라이언트 sessionStorage 일일 카운터 (예: 30회/일) — 비용 폭주 방지
- [ ] 생성 결과 출처 표시: 카드 메타에 `source: "curriculum-ai" | "curriculum-seed" | "source-text-ai"` 필드 추가 (`CustomCard*` 스키마 확장 — `proc/spec/06` 정합 필요)
- [ ] e2e: "중3 수학 → 인수분해 → 객관식 10장 생성 → 5장 선택 → 저장 → 내 카드 목록 확인" (`bun run test:e2e`)
- [ ] 4 viewport audit (`bun run ui:audit src/app/manage/content/page.tsx`)
- [ ] `proc/spec/03 §핵심기능` 또는 `06 §콘텐츠데이터` 갱신 (스펙 정합) — 변경분 별 PR

### Phase 5 — 후속 (V2 후보)

- [ ] 카탈로그 범위 확장 (전 학년 · 전 과목)
- [ ] 단원별 생성 결과 캐시 (동일 단원·메커니즘 N장 — 재호출 시 LLM 안 부르고 캐시)
- [ ] 교사 큐레이션 PR 받기 (외부 기여 흐름)
- [ ] 생성 문제의 난이도 자동 라벨링 (FSRS 초기치 입력용)

## 스킵 항목 (스코프 외)

- 교사·외부 API 연동 (학교급별 출판사 교과서 직접 import)
- 생성 문제의 저작권·출처 자동 검수
- 사용자별 LLM 호출 과금 시스템 (현재 무료 가드만)
- 카탈로그 GUI 관리 도구 (당분간 JSON 직접 편집)

## 의존·리스크

- `proc/spec/06-콘텐츠-데이터.md` 와 신규 카탈로그 스키마 정합 — Phase 0 에서 확인 필요
- LLM 비용: Haiku 1 호출 ~$0.001 가정, 일일 가드 30회 = $0.03/일 사용자 — 합리적
- 교육과정 데이터 작성 노동량: 영어 5 학년 × 평균 8 단원 ≈ 40 단원 메타 → 수동 정리 ~3h
- 초등 영어와 중등 영어의 단원 구성 방식 차이 (초등=주제·표현 중심, 중등=어휘·문법·독해 중심) → 카탈로그 스키마가 양쪽 다 표현 가능해야 함 (`focusVocab` · `focusGrammar` optional 로 흡수)

## 참조

- 기존 plan (archive): `proc/archive/plan/2026-05-08_management-auto-generation.md`
- 권위 문서: `proc/spec/03-핵심-기능.md` · `proc/spec/06-콘텐츠-데이터.md`
- 메모리 룰: `feedback_no_format_imposition` · `feedback_docs_first` · `feedback_decisive_execution`
- AI 거버넌스: `CLAUDE.md §9`
