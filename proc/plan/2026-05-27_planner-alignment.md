# 2026-05-27 — games 도메인 진화 plan (SUPERSEDED — 참조 stub)

**상태**: **SUPERSEDED / 참조 stub. 활성 plan 아님. 코드 변경 0.**

본 문서의 원래 내용(games 를 `planner`/`Q`/`classbot` 외부 사례에 정렬하는 다단계 로드맵 + games 자체 NestJS BE 도입안)은 **games 독립 프로젝트 거버넌스와 구조적으로 충돌**하여 폐기되었다. 루트 `CLAUDE.md §4`(다른 풀림 프로젝트 코드·페이지·구조 참조 금지)와 `proc/spec/01~10` 단일 권위 원칙에 따라, games 사본은 아래 **games 한정 요약 stub** 만 남긴다.

> 전체 초안(외부 비교·Phase 0a~η·BE 옵션 A/B/C·슬롯 표 등)은 **이 브랜치의 이전 커밋(git history)** 에서 확인할 수 있다. 본 stub 은 그 초안을 대체한다.

---

## games 현행 결정 — 이 stub 이 남기는 유일한 유효 정보

| 항목 | 현행 (games) |
|---|---|
| **권위 / SoT** | `proc/spec/01~10` (독립 프로젝트). 외부 풀림 프로젝트 스택은 *맥락 참고*일 뿐 의사결정 근거 아님. |
| **런타임** | **Bun + Next.js 15 + Vercel** — 현행 정본 spec(`proc/spec/09 §9.1`). "갭/lag" 아님. Next 16·pnpm 전환은 spec 선행 개정 + G1/G3/G4 합의 후에만. |
| **백엔드** | **games 내부 BE 미도입** (단일 백본, 루트 AGENTS.md). 분리 필요 시 **별 repo `pullim-api`**. |
| **구조** | **thin monorepo** (`apps/games/`, `apps/backend`·`packages/*` 미생성) — 별 PR #120. |
| **인증** | 게스트 우선·비로그인(`proc/spec/05 §5.2`). 구현 방식(Cls/JWT 등)은 별 spec PR. |
| **결제·랭킹·RPG** | 하이퍼캐주얼 룰상 도입 X (단일 백본 + 단순 진행도). |
| **AI 흐름** | `ANTHROPIC_API_KEY` 는 서버 액션(`src/app/manage/content/actions.ts` → `src/lib/server/ai/anthropic.ts`) 경로 유지. |

## 외부 생태계 정렬 (참조)

5-도메인 정렬 컨트롤타워 원본은 **games repo 밖 `.pullim-meta/`** 에 있다. games 로의 적용은 본 stub 이 아니라 **games 자체 spec 갱신 PR** 을 통해서만 효력을 갖는다.
