<!-- BEGIN:nextjs-agent-rules -->
# Next.js — 권위 문서는 `proc/spec/09 §9.1`

본 리포의 Next.js 판단은 `proc/spec/09-기술-환경.md §9.1` 이 최종 권위 — **표준 Next.js 15.5+ (App Router)** 가 설치되어 있고, `node_modules/next/dist/docs/` 는 부재한다. 위 상단 boilerplate("This is NOT the Next.js you know") 는 stale 판정 (spec/09 §9.1 명시), 표준 Next.js 컨벤션 사용.

단, **Next.js major upgrade·deprecation notice 가 보이면 진지하게 확인**하라 — 학습 데이터 컷오프 이후 breaking change 가 있을 수 있다. 충돌 시 항상 `proc/spec/09` 가 우선한다.
<!-- END:nextjs-agent-rules -->

## AI 검증 거버넌스 (요약)

- 본 리포는 **bun + Next.js 15** (npm/npx 직접 호출 금지 — `proc/spec/09 §9.1`).
- 권위 문서는 `proc/spec/01~10` — 룰 모호하면 spec 우선.
- **Codex Review 회피 금지.** codex 지적은 원칙적으로 코드 fix 로 응답. 룰북(workflow yml·프롬프트·AGENTS.md·CLAUDE.md·spec) 회피 목적 수정 X. 단, 명세 자체 결함 지적은 `proc/spec/01 §2 명세 우선 원칙` 경로(별 plan + 사용자 합의)로 정정 가능. 상세 룰은 `CLAUDE.md §9` 참조.
