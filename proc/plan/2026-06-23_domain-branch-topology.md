# 도메인 ↔ 브랜치 토폴로지 + 배포 모델 확정 (games.pullim.ai)

**작성일**: 2026-06-23
**작성자**: 사용자(G1) 결정 + claude
**상태**: 결정·적용 (PR #123)
**근거**: 사용자(G1) 직접 결정 — Vercel 공용계정에서 도메인·Git 연동 설정 완료 후 "의존성 있는 모든 요소 정합" 지시.

## 1. 결정 (G1 합의)

| 항목 | 결정 |
|---|---|
| **production 도메인** | **`games.pullim.ai`** ← `main` 브랜치 연동 |
| **dev 도메인** | **`dev-games.pullim.ai`** ← `dev` 브랜치 연동 |
| **배포 모델** | **Vercel Git 연동 자동 배포** (push = 배포). 옛 "수동 `vercel --prod` 우회 / webhook 비활성" 종료 — 공용계정 전환으로 admin 이슈 해소 |
| **Root Directory** | `apps/games` (모노레포 — `2026-06-17_monorepo-restructure.md` / `2026-06-22_drop-src-wrapper.md`) |
| **이전 후보 도메인** | `play.pullim.app`·`games.pullim.app` (spec 07/09/10 의 "V1 진입 시 결정") 은 본 결정으로 **확정**. `.app` → `.ai`. |

## 2. 이 결정에서 파생되는 정합 작업 (PR #123)

- **코드**: `app/layout.tsx` metadataBase(VERCEL_URL 우선 → prod 폴백), `app/opengraph-image.tsx`, `.env.example`(env 환경별 문서화), `scripts/capture-ui-audit.mjs` 예시 — 옛 `pullim-games.vercel.app` → `games.pullim.ai`.
- **테스트**: `same-origin.test`·`billing/notify test` fixture 도메인 → `games.pullim.ai`.
- **권위 문서(spec)**: `spec/04`(시나리오 링크), `spec/07`(브랜딩 도메인), `spec/09 §9.x`(Production/dev URL), `spec/10`(도메인 결정 체크) — 본 plan 근거로 갱신.
- **운영 문서**: `CLAUDE.md`(배포 룰: 머지 ≠ 배포 → main 머지 = 자동 배포), `README.md`(배포 섹션).

## 3. 의존성 점검 — 변경 불필요

- **same-origin(CSRF)**: `lib/server/http/same-origin.ts` 가 요청 자신의 Host origin 을 항상 허용 → 두 도메인 코드변경 없이 동작. 명시 보강은 `NEXT_PUBLIC_SITE_ORIGIN` 환경별.
- **쿠키**: `domain` 속성 없음(host-only) → `games.pullim.ai`/`dev-games.pullim.ai` 세션 자동 분리.
- **manifest·middleware·next.config**: 절대 도메인 의존 없음.

## 4. Vercel 환경변수 (Production/Preview 분리 — 사용자 설정)

`NEXT_PUBLIC_SITE_URL`·`NEXT_PUBLIC_SITE_ORIGIN`: prod=`https://games.pullim.ai` / dev=`https://dev-games.pullim.ai`. `DATABASE_URL`·`ANTHROPIC_API_KEY`·`CRON_SECRET`: 환경별.
