<!-- BEGIN:nextjs-agent-rules -->
# Next.js — 권위 문서는 `proc/spec/09 §9.1`

본 리포의 Next.js 판단은 `proc/spec/09-기술-환경.md §9.1` 이 최종 권위 — **표준 Next.js 15.5+ (App Router)** 가 설치되어 있고, `node_modules/next/dist/docs/` 는 부재한다 (spec/09 §9.1 표 명시). 상단 boilerplate("This is NOT the Next.js you know") 와 `proc/spec/01 §3` 의 "AGENTS.md Next.js 경고를 진지하게 받아들이고 `node_modules/next/dist/docs/` 를 먼저 읽는다" 지시는 모두 spec/09 §9.1 우선에 따라 본 리포 환경에서는 **적용 불가** — 표준 Next.js 컨벤션을 사용한다. 권위 문서 간 잔여 충돌(spec/01 §3 ↔ spec/09 §9.1)은 별 plan(`proc/plan/2026-05-20_plan-g-pullim-workflow-port.md`) 합의 후 후속 PR 에서 spec/01 §3 본문을 정합화 예정.

단, **Next.js major upgrade·deprecation notice 가 보이면 진지하게 확인**하라 — 학습 데이터 컷오프 이후 breaking change 가 있을 수 있다. 충돌 시 항상 `proc/spec/09` 가 우선한다.
<!-- END:nextjs-agent-rules -->

## AI 검증 거버넌스 (요약)

- 본 리포는 **bun + Next.js 15** (npm/npx 직접 호출 금지 — `proc/spec/09 §9.1`).
- 권위 문서는 `proc/spec/01~10` — 룰 모호하면 spec 우선. 단 권위 문서 간 충돌(예: spec/01 §3 Next.js docs 지시 ↔ spec/09 §9.1 표준 Next.js 판정) 은 더 구체적·신규 spec 우선이며, 위 Next.js 블록처럼 본 리포 환경에서의 해석을 AGENTS.md/CLAUDE.md 가 명시한다.
- **Codex Review 회피 금지.** codex 지적은 원칙적으로 코드 fix 로 응답. 룰북(workflow yml·프롬프트·AGENTS.md·CLAUDE.md·spec) 회피 목적 수정 X. 단, 명세 자체 결함 지적은 정당한 명세 진화 경로(별 plan + 사용자 합의 → spec 수정 → 코드 fix)로 정정 가능 — 절차는 `CLAUDE.md §9` 및 `proc/plan/2026-05-20_plan-g-pullim-workflow-port.md` 참조 (근거: `proc/spec/01 §2` 명세 우선 원칙).
