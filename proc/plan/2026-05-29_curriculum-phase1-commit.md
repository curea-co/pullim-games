# Curriculum Phase 1 커밋 — 2026-05-29

> 작성: 2026-05-29 · 갱신: 2026-07-01 (범위 정리)
> 연결: `proc/plan/2026-05-27_curriculum-ai-content-creation.md`

## 목적

Curriculum Phase 1(4-depth catalog + CurriculumPicker + LLM Mode A) 을 커밋한다.

## 결과 (SHIPPED)

- **curriculum Phase 1 — main 반영 완료.** `#115`(`feat(curriculum): Phase 1 + 대시보드 CompactActivity 통합 — main 동기화(드리프트 해소)`) 로 머지됨. `apps/games/lib/core/curriculum/catalog/`(4-depth catalog·loader·JSON) 가 main 에 존재. 이후 #122 모노레포 재구조화로 `src/` 래퍼 제거되며 경로는 `apps/games/lib/...` 로 정착.
- 포함: catalog JSON + `catalog-loader.ts` + `types.ts` + `llm-quota.ts`·`llm-cache.ts`(비용 가드·캐시, spec/06 §6.12·§6.10) + `anthropic.ts` Mode A `generateFromCurriculumLLM` + `CurriculumPicker.tsx` 4-depth 리팩 + `manage/content/page.tsx` picker/quota/cache UI.

## Phase 0 분석 (기록)

- **D2 교육과정 데이터 출처**: NCIC 2022 개정 영어과 성취기준 사용 확정(achievementCodes 가 학년군 prefix 패턴 `[4영/6영/9영XX-XX]`). unitName 은 성취기준 주제 기반 독자 서술. 저작권: 교육과정 성취기준 = 공공저작물(교육부 고시).
- **D3 spec/06 정합**: `CatalogUnit` 스키마가 spec/06 §6.10 필드 정의와 일치. 충돌 미발견.

## LLM provider

콘텐츠 생성 LLM provider 는 **Anthropic 단일**(`apps/games/lib/server/ai/anthropic.ts`). 근거: G1 결정 2026-06-30.
