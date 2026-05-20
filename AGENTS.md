<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## AI 검증 거버넌스 (요약)

- 본 리포는 **bun + Next.js 15** (npm/npx 직접 호출 금지 — `proc/spec/09 §9.1`).
- 권위 문서는 `proc/spec/01~10` — 룰 모호하면 spec 우선.
- **Codex Review 회피 금지.** codex 지적은 코드 fix 로만 응답. 룰북(workflow yml·프롬프트·AGENTS.md·CLAUDE.md·spec)을 회피 목적으로 수정 X. 상세 룰은 `CLAUDE.md §9` 참조.
