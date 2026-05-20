# 2026-05-20 — Plan G: pullim 리포 workflows 이식 + monorepo 판단

- **상태**: PHASE 2 PR 작성 완료 — 머지 대기 (2026-05-20). e2e-nightly.yml PR #90 (`.github/workflows/e2e-nightly.yml`). cron `0 17 * * *` (KST 02:00) + workflow_dispatch. 21 게임 matrix + shared specs job. self-hosted runner. secrets 의존 0. Codex round 1·2 지적 fix 반영(매핑 재설계 + concurrency 정합 + custom-* chrome 커버 + vocab-typing 회귀 분리). 머지·schedule 작동은 아직. PHASE 1 (codex-review.yml) 만 main 정착 완료.
- **거버넌스 (사용자 합의 2026-05-20)**: codex review 결과를 회피하기 위해 codex 워크플로·프롬프트 수정 금지. codex 지적은 코드 fix 로만 응답 (룰북 수정 X). 정당한 trade-off 만 별 plan 합의 후 기록.
- **트리거**: 사용자 요청 "pullim의 workflows를 pullim-games로 이식. monorepo 구조 필요하면 변경도 같이". 직접 동기 = Codex Review bot 작동 (오늘 PR #83 검증 시 0 review 발견).
- **메모리 룰**:
  - **단일 백본 + 다중 게임 모드** (project_architecture_decision) — 본 이식이 백본·테스트 인프라 강화
  - **결단력 있게 실행, 갈래 묻지 말 것** (feedback_decisive_execution) — monorepo 변환은 단일 추천(NO)
  - **문서화 먼저** (feedback_docs_first) — 본 plan 합의 후 코드
- **연관**: `~/dev_git/pullim/.github/workflows/`, audit v4 §6 (CI 정착도 informational), CONVENTION §7 audit 룰.

## 0. 현 상태

### A. pullim 리포 workflows (5건)

| 파일 | 크기 | 본질 | 인프라 의존 |
|---|---|---|---|
| `ci.yml` | 9.3KB | turbo + pnpm monorepo CI (web/studio detect → lint → test → e2e main PR만) | pnpm 10.26·turbo·Node 20·monorepo |
| `deploy-web.yml` | 8.6KB | dev push → semantic-release → Docker buildx → ECR push → ECS deploy | **AWS ECS·ECR·OIDC role**·Docker·semantic-release |
| `deploy.yml` | 0.5KB | placeholder | 0 |
| `e2e-nightly.yml` | 3.2KB | 매일 02:00 KST 실서버 야간 회귀 | pnpm·DEV_API_URL·테스트 계정 |
| `codex-review.yml`* | (별 commit) | **self-hosted runner + Codex CLI** → PR diff 리뷰 → GitHub App 으로 코멘트 | self-hosted runner·Codex CLI·`REVIEW_BOT_APP_ID/PRIVATE_KEY` |

*main에서 제거된 상태 — `fe2eee17` commit 시점 존재

### B. pullim-games 리포 현 상태

- 단일 Next.js 15 앱, **bun + bun.lock**, **Vercel 수동 배포** (메모리 룰 project_deploy_manual)
- `.github/workflows/ci.yml` 1개 — paths-filter (`src/lib/core/**`·`src/games/**`) + matrix per game (잘 구성됨)
- `src/games/{21개}/` — 이미 게임별 모듈 분리. monorepo 없이도 paths-filter 가능
- 21 게임 + 4 메커니즘 + lib/core 단일 백본 — 백엔드/스튜디오 분리 계획 0

### C. 이번 세션 PR #83 검증

- PR 띄움 → CI ✅ SUCCESS 6 jobs → 그러나 review 0건
- 원인: 본 리포에 codex-review 워크플로우·self-hosted runner·App secrets 0

## 1. 추천 설계

### A. monorepo 변환 결정 — **NO**

| 평가 항목 | 결과 |
|---|---|
| 백엔드/스튜디오 분리 계획 | 없음 (단일 학습 게임 카탈로그) |
| 21 게임 분리도 | 이미 `src/games/{game}/`로 충분 — turbo 추가 가치 0 |
| 변환 비용 | bun → pnpm 마이그레이션 + vercel 재설정 + gen:registry 재배치 + 100+ import path + .vercel link 재구성 ≈ 1주일 + 회귀 다수 |
| 메모리 룰 fit | 단일 백본 원칙(`project_architecture_decision`) — monorepo는 백본 다중화에 가까움. 룰 위반 |
| 사용자 동기 충족 여부 | 사용자 핵심 = Codex Review 작동. monorepo 없이 동일 결과 달성 가능 |

→ **monorepo 변환 비스코프**. pullim의 monorepo 의존 workflow(turbo·pnpm filter)는 본 리포 구조(paths-filter on `src/games/**`·`src/lib/core/**`)로 변형 이식.

### B. workflow 별 이식 매트릭스

| pullim 워크플로우 | pullim-games 이식 방안 | Phase |
|---|---|---|
| `codex-review.yml` | **핵심 이식 대상**. self-hosted runner·Codex CLI·GitHub App secrets 사전 합의. paths-filter는 `src/games/**`·`src/lib/core/**`·`src/components/**`·`src/app/**` 단위 | Phase 1 |
| `e2e-nightly.yml` | bun + matrix(`src/games/{game}`) + Vercel preview URL 또는 로컬 build+start. **DEV_API_URL 없음(현 fingerprint V1)** → API 의존 X | Phase 2 |
| `ci.yml` | 이식 X — 이미 본 리포 `ci.yml` 동일 패턴(paths-filter + matrix) 정착. 필요시 turbo 패턴 일부 차용만 | 비스코프 |
| `deploy-web.yml` | 이식 X — AWS ECS·Docker 인프라 0. Vercel 수동 배포 우회 유지 (메모리 룰 `project_deploy_manual`) | 비스코프 |
| `deploy.yml` | 이식 X — placeholder | 비스코프 |

### C. codex-review 이식 시 변형 포인트

| 항목 | pullim | pullim-games |
|---|---|---|
| paths-filter scope | `apps/backend/**`·`apps/web/**` | `src/games/**`·`src/lib/core/**`·`src/lib/games/**`·`src/components/**`·`src/app/**`·`scripts/**` |
| 리뷰 단위 | matrix per app (backend/web) | matrix per scope (core·games·components·app·scripts) — 또는 단일 review (단순화) |
| diff 추출 | `apps/${app}/` 만 | scope 별 (또는 전체 diff) |
| AGENTS.md 우선순위 | `apps/${app}/AGENTS.md` → root `AGENTS.md` | root `AGENTS.md` (현 1줄짜리 — **보강 필요**) → `CLAUDE.md` |
| 모델 | `gpt-5.4` | 동일 유지 (사용자 결정) |
| 코멘트 서명 | "— Reviewed by Codex" | 동일 |
| GitHub App 토큰 | `REVIEW_BOT_APP_ID`·`REVIEW_BOT_PRIVATE_KEY` | **동일 secrets 본 리포에 복사 필요**(org level secret 이면 불필요) |
| 러너 | `self-hosted` | **본 리포에 self-hosted runner 등록 필요** |

## 2. 결정점

### D1 — monorepo 변환 (Plan G 진입 전제)
- **(A 추천)** NO — 위 §1.A 평가. 단일 백본 룰 + 사용자 동기 충족 무관
- (B) YES — 백엔드/스튜디오 분리 로드맵 있을 때만

→ **A 채택**.

### D2 — self-hosted runner 본 리포 등록
- **(A 추천)** pullim 에서 쓰는 self-hosted runner 본 리포에도 등록 — 같은 머신 공유 가능 (Codex CLI 이미 설치돼있을 가능성)
- (B) ubuntu-latest 변경 — Codex CLI 사전 설치된 컨테이너 이미지 또는 `bunx @openai/codex` 호출 (`proc/spec/09 §9.1` "npm/npx 직접 호출 금지" 룰 준수). 모델 키 환경변수. self-hosted 의존성 회피하지만 매 실행 비용·시간 증가
- (C) Codex 외 대안(Claude GitHub App 등) — 사용자 동기와 어긋남

→ **A 권고**. self-hosted 가용 안 하면 B fallback.

### D3 — paths-filter scope 단위
- **(A 추천)** 5 scope (core·games·components·app·scripts) matrix — 변경 범위 좁고 큰 PR에서 비용 분산. 그러나 큰 PR은 5병렬 다 돌게 됨 (비용↑)
- (B) 단일 scope 통합 — 매 PR 1 review 실행. 단순. AGENTS.md 가 전체 룰 커버 가능
- (C) 게임별 matrix — 21 게임 × review = 비용 폭발

→ **B 채택** (Phase 1). 매 PR diff 전체 한 번 review. 비용·복잡도 최소. scope 분리는 V2.

### D4 — AGENTS.md 보강 범위
- **(A 추천)** 현 1줄 → 충실한 룰 (lib/core 단일 백본·메커니즘 추상화·디자인 시스템 토큰·하이퍼캐주얼 등 메모리 룰 반영)
- (B) AGENTS.md 미수정 — CLAUDE.md 만 참조 시도

→ **A 채택**. Codex 가 룰 인지 안 하면 리뷰 품질 낮음.

### D5 — Phase 분할 단위
- **(A 추천)** Phase 1 (codex-review 만) → Phase 2 (e2e-nightly) → Phase 3 (AGENTS.md 강화) 별 PR
- (B) 1 PR 일괄

→ **A 채택**. Phase 1 ≈ secrets·runner 의존 → 합의 후 진행.

## 3. 작업 항목

### Phase 0 — G3 합의 (사용자 의사결정 의무)

- [ ] **D1**: monorepo 변환 NO 채택 확인
- [ ] **D2**: self-hosted runner 본 리포 등록 가능 여부 (A) / ubuntu-latest 대안 (B)
- [ ] **secrets 확인**:
  - `REVIEW_BOT_APP_ID`·`REVIEW_BOT_PRIVATE_KEY` org level 인지 / 본 리포 별도 복사 필요한지
  - org level 이면 추가 작업 0. 아니면 본 리포 repo secret 으로 복사
- [ ] **GitHub App 권한 확인**: `curea-co/pullim-games` repo 에 review bot App 권한 부여
- [ ] **Codex CLI 모델**: gpt-5.4 유지 또는 변경 의사

### Phase 1 — codex-review.yml 이식 (PR #87 머지 완료 / 사용자 합의 후)

- [x] `.github/workflows/codex-review.yml` 신설 — paths 제한 없이 모든 PR review (본 리포 PR 수 적음)
- [x] diff 추출: `base.sha...head.sha` (force-push 안정)
- [x] Codex 프롬프트: AGENTS.md → CLAUDE.md → proc/spec/01~10 순 우선, "리뷰 코멘트 한국어"
- [x] inline / fallback 분리: pullim 패턴 변형 적용
- [x] **Codex 1차 지적 3건 반영** — pull_request 포크 가드 / listFiles pagination / Bun 룰 fallback 표기
- [x] **Codex 2차 지적 3건 반영** — ready_for_review 추가 / git config --global 제거 / .github/workflows/** 명시
- [x] **Codex 3차 지적 3건 반영**:
  - #1 base 분리 → `pull_request_target` 패턴 (yml 자체 수정으로 secret 유출 불가)
  - #2 checkout `ref: head.sha` 명시 (merge ref 어긋남 차단)
  - #3 JSON 스키마 인라인 검증 (proc/spec/01 §21 런타임 검증 룰 준수)
- [x] **사전 sweep 4건 통합** — timeout 15분 / artifact 보관 / safety_strategy unsafe 정당화 / base.sha 명시
- [x] e2e — PR #83 close + 브랜치 삭제

### Phase 1 검증 한계 (정직한 trade-off)

- 본 PR (#87) 자체 round 4 review 없음 — `pull_request_target` 트리거는 base(main) 의 yml 만 실행. 본 PR 머지 전에는 main 에 codex-review.yml 없음.
- 머지 후 다음 sosohan PR 으로 정착 검증 의무 — 별 PR 작성 후 codex review 자동 작동 확인.

### Phase 2 — e2e-nightly.yml 이식 (PR 작성 완료, 머지 대기)

- [x] `.github/workflows/e2e-nightly.yml` 신설
- [x] cron: `0 17 * * *` (KST 02:00) — pullim 동일
- [x] bun + playwright (Chromium only) + matrix per game (21 게임)
- [x] base = main (pullim은 dev. 본 리포는 dev 분기 X)
- [x] artifacts: playwright-report · test-results 14·7 days
- [x] DEV_API_URL 등 secrets 의존 X — 현 V1 fingerprint(서버 의존 0)
- [x] **사전 sweep 5건 통합**:
  - permissions `contents: read` 만 — 최소 권한 원칙
  - concurrency group `e2e-nightly-${{ github.ref }}` — workflow_dispatch 연타 안전
  - timeout-minutes 30 (per game · shared 양쪽)
  - fail-fast: false — 한 게임 실패가 타 게임 회귀 검출 방해 X
  - persist-credentials: false — checkout 후 토큰 잔류 차단
- [x] **per-game 매핑 = loop spec grep(단어경계 lookaround) + extras spec path 명시** + **shared 는 cross-cutting spec 파일 명시 + mode-review-queue 의 fallback 케이스만 별도 `--grep`** — codex round 1·2 fix 후 정착. `--grep-invert` 미사용 (game ID alternation 으로는 게임 전용 spec/혼재 spec 누락 위험 → 명시적 path 분리가 안전)
- [x] **runner = self-hosted** (codex-review.yml 정착 동일) — schedule + workflow_dispatch 외 트리거 0 → 외부 위협 0

### Phase 3 — AGENTS.md 보강 (Phase 1 후속, 1 PR)

- [ ] 현 1줄(`This is NOT the Next.js you know`) → 충실한 룰
- [ ] 포함 항목:
  - 단일 백본 + 다중 게임 모드 아키텍처
  - 4 메커니즘 컴포넌트 (`QuickQuiz`·`Blank`·`Typing`·`WordMatch`) — 직접 게임 컴포넌트 작성 금지
  - 디자인 토큰 (`text-pullim-slate-{400}` 등) — 미정의 토큰 silent fallback 주의
  - 하이퍼캐주얼 룰 (RPG 금지)
  - viewport 320·390·768·1280 4 audit 의무
  - CLAUDE.md 권위 문서 참조

### Phase 4 — 검증 (Phase 1·2·3 완료 후)

- [ ] PR 1건 띄워 codex-review 자동 트리거 확인
- [ ] inline comment / fallback / approve 3 케이스 동작 검증
- [ ] e2e-nightly 다음 새벽 1회 동작 확인 후 artifact 점검
- [ ] audit v5 진입 트리거 (CI 인프라 변화) — `~/dev_git/.pullim-meta/CONVENTION.md` §7 T1 후속

## 4. 비스코프

- **monorepo 변환** — 위 §1.A. 백엔드 분리 로드맵 신설 시 별 plan
- **deploy-web.yml ECS·ECR 이식** — Vercel 수동 배포 우회 유지 (메모리 룰)
- **deploy.yml placeholder** — 이식 가치 0
- **ci.yml 통째 덮어쓰기** — 현 ci.yml 이 잘 구성됨. turbo 일부 패턴만 차용 검토 V2
- **paths-filter scope 분리(D3 A안)** — Phase 1 = B 단일. V2 에서 scope 분리 평가

## 5. 영향도

| Phase | 변경 | LOC | 인프라 의존 |
|---|---|---|---|
| 0 (합의·secrets·runner) | 외부 설정 | 0 | G3 합의 + secrets + runner |
| 1 (codex-review) | `.github/workflows/codex-review.yml` 신설 | ≈+150 | self-hosted runner·App secrets·Codex CLI |
| 2 (e2e-nightly) | `.github/workflows/e2e-nightly.yml` 신설 | ≈+80 | 0 (Vercel CLI 우회 유지) |
| 3 (AGENTS.md) | `AGENTS.md` 보강 | ≈+80 | 0 |
| 4 (검증·audit v5) | docs + 추가 PR | ≈+30 | 0 |

→ 총 ≈+340 LOC. **인프라 의존도 큰 Phase 1**. Phase 2·3·4 는 인프라 의존 0 → Phase 0 합의 안 돼도 진행 가능.

## 6. 사용자 의사결정 의무 사항 (G3)

위 §2 D1~D5 + Phase 0 §3 secrets·runner 확인 = G3 합의 의무. 본 plan 합의 안 되면 Phase 1 코드 진행 불가.

**1차 답변 요청**:
1. monorepo 변환 NO 채택 OK?
2. self-hosted runner 본 리포 등록 가능?
3. `REVIEW_BOT_APP_ID/PRIVATE_KEY` org 공유 vs 본 리포 복사 필요 어느 쪽?
4. Codex 모델(`gpt-5.4`) 유지?
