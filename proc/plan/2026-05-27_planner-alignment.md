# 2026-05-27 — games 도메인 진화 plan (games 한정 판단 요약)

**상태**: **DRAFT — games 정렬 판단 요약 (참조). 코드 변경 0. 실행 게이트 아님.**

풀림 생태계 정렬 논의 중 **games 에 해당하는 판단 근거만** 간추린 참조 문서다. games 는 독립 프로젝트(루트 `CLAUDE.md`, `proc/spec/01~10` 단일 권위)이므로 다른 풀림 프로젝트의 코드·페이지·mock 을 참조하거나 그 구조를 games 의 정렬 목표로 삼지 않는다. 외부 5-도메인 정렬의 세부(타 도메인 스택·Phase 분할)는 본 문서 범위 밖이다.

## games 현행 상태 + 판단 (이 문서의 유효 정보)

| 항목 | 현행 (games) |
|---|---|
| 권위 / SoT | `proc/spec/01~10` (독립 프로젝트). 외부 풀림 스택은 의사결정 근거 아님. |
| 런타임 | **Bun + Next.js 15 + Vercel** — 현행 정본 spec(`proc/spec/09 §9.1`). "갭/lag" 아님. major 변경(예: Next 16, pnpm)은 spec 선행 개정 + G1/G3/G4 합의 후에만. |
| 디렉터리 구조 | **현행: 루트 `src/` 구조** (`src/app`, `src/games`, `src/lib` …). 모노레포 전환은 별 제안(PR #120) — **미머지, 본 브랜치 미반영**. |
| 백엔드 | games 내부 분리 백엔드 없음 — **단일 백본**(루트 AGENTS.md). 새 백본 추가·분리는 메모리 룰상 **비결정 사안**(별 spec 합의 전엔 단정하지 않음). |
| 인증 | 게스트 우선·비로그인(`proc/spec/05 §5.2`). 구현 방식은 별 spec PR. |
| 결제·랭킹·RPG | 하이퍼캐주얼 룰상 도입 X (단일 백본 + 단순 진행도). |
| AI 흐름 | `ANTHROPIC_API_KEY` 는 서버 액션(`src/app/manage/content/actions.ts` → `src/lib/server/ai/anthropic.ts`) 경로. |

게임 강점(`gen:registry`, 21 게임 카탈로그, 자체 SPEC 권위)은 어떤 정렬에서도 보존한다. games 로의 스택 변경 적용은 본 문서가 아니라 **games 자체 spec 갱신 PR** 을 통해서만 효력을 갖는다.
