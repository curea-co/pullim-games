# 풀림 5 도메인 정본 스택 정렬 plan (games 사본 — 참조 stub)

**상태**: **DRAFT / 참조 stub. games 실행 지침 아님. 코드 변경 0.**

본 문서는 풀림 5-도메인 컨트롤타워 정렬 plan 의 **games repo 사본**이다. 원래의 세부 내용(외부 본체 `curea-co/pullim` 의존성 매트릭스, 5-도메인 Phase 분할, ECS/RDS/pnpm/JWT/DS/i18n 마이그레이션 표, PR 분할 등)은 **games 독립 프로젝트 거버넌스**(루트 `CLAUDE.md §4` 외부 참조 금지 + `proc/spec/01~10` 단일 권위)와 충돌하므로 games 사본에는 두지 않는다.

> **컨트롤타워 원본**(전체 5-도메인 내용)은 games repo 밖 **`.pullim-meta/2026-05-27_canonical-stack-alignment.md`** 에 있다. 전체 초안의 git history 는 이 브랜치의 이전 커밋 참조. 본 stub 은 games 사본의 그 내용을 대체한다.

---

## games 에만 해당하는 요약 — 이 stub 의 유효 정보

- **games SoT = `proc/spec/01~10`** (독립 프로젝트). 본 문서·외부 본체 매트릭스를 games 의 기준선/정렬 목표로 삼지 않는다.
- **games 현행 정본 스택**: Bun + Next.js 15 + Vercel + **단일 백본**(BE 미도입 — 분리 시 별 repo `pullim-api`) + **thin monorepo**(`apps/games/`, PR #120). 모두 `proc/spec/09 §9.1` + 루트 AGENTS.md 기준.
- **외부 정렬 항목(pnpm·ECS·Next 16·JWT·Redis·DS·i18n·Sentry·backend·packages)은 games 비대상** — games 현행 spec 미반영이며, 적용은 **spec 선행 개정 + G1/G3/G4 합의 후에만**. 본 stub 으로 games PR 범위를 열지 않는다.
- **AWS 인프라(ECS/RDS)** 는 컨트롤타워 원본 §16 상 **무기한 보류**(프로젝트 병합 토폴로지 확정 전까지). games 는 그 기간 Vercel 임시 사용.
- 권위 순서(games): `proc/spec/01~10` → `CLAUDE.md` → `AGENTS.md`. 본 stub 은 그 아래의 참조 문서일 뿐이다.
