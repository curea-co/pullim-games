# 풀림 5 도메인 정본 스택 정렬 plan (games 한정 판단 요약)

**상태**: **DRAFT — games 정렬 판단 요약 (참조). 코드 변경 0. games 실행 지침 아님.**

풀림 5-도메인 정본 스택 정렬 논의 중 **games 에 해당하는 판단 근거**를 간추린 문서다. games 는 독립 프로젝트(`proc/spec/01~10` 단일 권위)이므로, 외부 본체·타 도메인의 세부 의존성 매트릭스나 5-도메인 실행 Phase 는 games 의 정렬 목표·실행 backlog 가 아니다 — 그 외부 세부는 본 문서 범위 밖이다 (충돌 항목만 배제하고, games 판단 근거는 아래에 남긴다).

## games 에만 해당하는 판단 (이 문서의 유효 정보)

- **SoT**: games SoT = `proc/spec/01~10`. 외부 정본 매트릭스를 games 기준선으로 삼지 않는다.
- **현행 스택**: Bun + Next.js 15 + Vercel + **단일 백본**(내부 분리 BE 없음 — 루트 AGENTS.md). 디렉터리는 **현행 루트 `src/` 구조**(`src/app`·`src/games` …) — 모노레포 전환은 별 제안(PR #120, **미머지·본 브랜치 미반영**).
- **외부 정렬 항목 — 미반영분만 spec 선행 필요**: `pnpm`·`ECS`·`Next 16(major)`·`JWT`·`Redis`·`i18n`·`backend`·`packages` 는 games 현행 spec 미반영이라 **spec 선행 개정 + G1/G3/G4 합의 후에만** 적용. (구분: **`Sentry` 는 `proc/spec/09 §9.8`, 디자인 시스템(DS)은 `proc/spec/08` 에 이미 반영** — 위 미반영 목록과 별개.) 본 문서로 games PR 범위를 열지 않는다.
- **AWS 인프라(ECS/RDS)**: 프로젝트 병합 토폴로지 확정 전까지 **무기한 보류**. games 는 그 기간 Vercel 사용.
- **권위 순서(games)**: `proc/spec/01~10` → `CLAUDE.md` → `AGENTS.md` → `.pullim-meta/CONVENTION.md`(4 풀림 공통 운영 룰 — viewport/audit 등) → `proc/plan`/`proc/audit`/`proc/research`. 본 문서는 그 아래의 참조 판단 문서다.
