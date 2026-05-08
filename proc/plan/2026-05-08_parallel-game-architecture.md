# 게임 단위 병렬 개발 아키텍처 기획서

- **작성일**: 2026-05-08
- **상태**: DRAFT (검토 후 SPEC 반영)
- **목적**: 게임을 독립 모듈로 쪼개서 여러 개발자/에이전트가 머지 충돌 없이 동시 작업할 수 있는 코드 구조 정의
- **결론 한 줄**: 단일 `registry.ts` 중앙 파일을 **빌드 타임 자동 발견**으로 대체하고, 각 게임을 `src/games/<id>/` 안에 컴포넌트·콘텐츠·로직·테스트가 다 들어 있는 self-contained 모듈로 만든다. 공유 인프라(FSRS, AST, fingerprint)는 `src/lib/core/`로 격리해 read-only 계약화.

---

## 1. 배경 및 문제

현재 구조 (2026-05-08 시점):

```
src/lib/games/registry.ts   ← 모든 게임 import + 배열에 push
src/games/factorization/
  index.ts
  component.tsx
```

**문제 1 — 중앙 파일 머지 충돌:**

새 게임 추가 = `registry.ts` 수정. 게임 N개를 동시에 만들면 N개의 PR이 같은 파일을 수정 → 거의 100% 머지 충돌. 두 게임을 worktree로 병렬 작업하려는 순간 차단.

**문제 2 — 공유 인프라의 암묵 결합:**

향후 `lib/ast/`, `lib/fsrs/`, `lib/fingerprint/`가 도입되면 게임마다 이걸 import하면서 같이 수정할 가능성 큼. 게임 A가 `transform.ts`에 헬퍼를 추가하면 게임 B의 PR에 영향. 격리되지 않음.

**문제 3 — 콘텐츠/테스트의 위치 불명확:**

현재 SPEC §09.7은 `content/cards/factorization/*.json`을 별도 디렉토리에 배치. 게임이 늘면 `content/cards/quick-quiz/`, `content/cards/matching/` 등 분산되고 게임 디렉토리와 1:1 매칭 안 됨. 한 게임을 통째로 옮기거나 삭제하기 어려움.

**문제 4 — CI 비효율:**

게임 1개 수정해도 전체 테스트 돌면 게임 N개 시 빌드/테스트 시간 N배. 게임별 path filter 없음.

---

## 2. 목표

1. **새 게임 추가 시 중앙 파일 수정 0회.** `src/games/<id>/` 디렉토리만 만들면 메인페이지 + 라우팅 + 메타에 자동 반영.
2. **게임 간 코드 격리.** 게임 디렉토리 하나를 통째로 삭제해도 다른 게임이 멀쩡해야 함.
3. **공유 인프라는 read-only 계약.** `src/lib/core/`는 게임이 의존만 하고 수정은 별도 lane.
4. **여러 worktree에서 병렬 개발.** 게임별 브랜치 + 디렉토리 격리로 머지 충돌 0.
5. **CI는 변경된 게임 단위로만.** path filter로 테스트 시간 비례 제거.

## 3. 비목표

- npm workspaces / monorepo 전환 (V1 시점엔 과함, V3 시점에 재검토)
- 게임을 별도 npm 패키지로 분리
- 마이크로프론트엔드 (각 게임 별도 빌드)
- Module Federation 같은 런타임 분할

---

## 4. 검토한 접근 방식

### Approach A — 빌드 타임 자동 발견 (권장)

빌드 직전 (또는 dev 시작 직전) 스크립트가 `src/games/*/manifest.ts`를 glob 스캔해 `src/lib/games/registry.generated.ts`를 자동 생성. `registry.ts`는 generated 파일을 re-export.

- ✅ 새 게임 추가 시 generated 파일이 자동 갱신 → 중앙 파일 수동 수정 0
- ✅ Next.js 빌드 흐름과 자연 통합 (predev/prebuild npm script)
- ✅ 디버깅 가능 (생성된 파일이 평범한 TS)
- ❌ generated 파일 commit vs gitignore 정책 결정 필요 (권장: commit + CI 검증)

### Approach B — `import.meta.glob` 런타임 발견

Vite식 패턴. webpack 기반 Next.js에선 `require.context` 또는 webpack 플러그인 필요.

- ✅ 빌드 스크립트 없음
- ❌ Next.js webpack 호환성 미검증, App Router 환경에서 RSC와 어떻게 섞이는지 불확실
- ❌ 타입 추론 약함

### Approach C — Plugin 시스템 (런타임 등록)

각 게임이 앱 부팅 시 `registerGame()` 호출. 동적 import.

- ✅ 완전 격리
- ❌ 메인페이지 SSR 시 게임 메타가 모두 로드되어야 → 동적 import 의미 약화
- ❌ 빌드 타임에 게임 목록을 모르므로 `generateStaticParams()`가 작동 안 함

### Approach D — Monorepo / Workspaces

각 게임 = 별도 npm 패키지 (`packages/games/factorization/package.json`).

- ✅ 가장 강한 격리, 의존성도 게임마다 관리
- ❌ V1 (게임 1-2개)에 인프라 비용이 효익보다 큼
- ❌ Next.js App Router + workspaces는 셋업이 까다로움 (transpilePackages, 경로 별칭 등)
- ⏸️ V3 (게임 5개+) 시점에 재검토

**권장: Approach A.** Approach D는 게임 5개 이상 시 옵션으로 남김.

---

## 5. 권장 아키텍처

### 5.1 디렉토리 구조 (V1 마이그레이션 후)

```
src/
  app/
    layout.tsx, globals.css
    page.tsx                          # / 메인페이지 (registry 조회)
    games/[gameId]/
      page.tsx                        # 동적 라우팅 (registry 조회)
      not-found.tsx
    api/event/route.ts
  components/                         # 모든 게임 공유 UI
    GameCard/
    Header/
    layout/                           # 5영역 레이아웃 컴포넌트 (SPEC §04.1)
  lib/
    core/                             # ⭐ Read-only 계약 — 게임은 의존만 하고 수정 X
      fsrs/                           # SRS 엔진
      fingerprint/                    # 익명 사용자 식별
      schema/                         # 공통 zod 스키마 (Card, Event)
      ui/                             # 공통 UI primitive (Block, DropZone 등 일반화)
      types.ts
    games/
      types.ts                        # GameMeta, GameRegistration 인터페이스
      registry.ts                     # ✅ generated 파일 re-export
      registry.generated.ts           # ⭐ 빌드 스크립트가 작성 (commit O)
  games/                              # ⭐ 각 게임 = self-contained 모듈
    factorization/
      manifest.ts                     # GameMeta — 자동 발견 대상
      component.tsx                   # 게임 entry
      components/                     # 게임 전용 sub-component
        MathBlock.tsx
        DropZone.tsx
      state/                          # 게임 전용 상태 (Zustand)
        store.ts
      logic/                          # 게임 전용 로직 (순수함수)
        transform.ts
        checkAnswer.ts
      content/
        cards/
          card-001.json
          ...
        copy.ts                       # 게임 전용 카피
      assets/
        og.png                        # 게임별 OG 카드 (V2)
      tests/
        transform.test.ts
        component.test.tsx
      README.md                       # 게임 작업자 onboarding
scripts/
  generate-registry.ts                # ⭐ glob → registry.generated.ts
```

`content/cards/<game>/` 분산 디렉토리 폐기. 콘텐츠는 게임 디렉토리 안에 들어감.

### 5.2 Manifest 계약

```ts
// src/games/factorization/manifest.ts
import type { GameManifest } from "@/lib/games/types";
import { lazy } from "react";

export const manifest: GameManifest = {
  meta: {
    id: "factorization",
    title: "인수분해 블록 분리",
    subject: "수학",
    unit: "고1 다항식",
    tagline: "공통인수를 손가락으로 끌어내요",
    estimatedMinutes: 5,
    status: "available",
  },
  // 빌드 타임에 동적 import로 변환 — 게임 1개 수정해도 다른 게임 청크 무효화 X
  loadComponent: () => import("./component"),
};

export default manifest;
```

`src/lib/games/types.ts`:

```ts
import type { ComponentType } from "react";

export interface GameMeta {
  id: string;
  title: string;
  subject: string;
  unit: string;
  tagline: string;
  estimatedMinutes: number;
  status: "available" | "coming-soon";
  ogImagePath?: string;
}

export interface GameManifest {
  meta: GameMeta;
  loadComponent: () => Promise<{ default: ComponentType }>;
}
```

### 5.3 자동 등록 스크립트

`scripts/generate-registry.ts`:

```ts
// 의사코드 스케치
import { glob } from "fast-glob";
import { writeFileSync } from "node:fs";

const manifests = await glob("src/games/*/manifest.ts");
const ids = manifests.map((p) => p.split("/")[2]);

const code = `// AUTO-GENERATED — do not edit. Run \`npm run gen:registry\` to regenerate.
${ids.map((id) => `import ${id} from "@/games/${id}/manifest";`).join("\n")}

import type { GameManifest } from "./types";

export const games: GameManifest[] = [
${ids.map((id) => `  ${id},`).join("\n")}
];
`;

writeFileSync("src/lib/games/registry.generated.ts", code);
```

`package.json` scripts:

```json
{
  "scripts": {
    "gen:registry": "tsx scripts/generate-registry.ts",
    "predev": "npm run gen:registry",
    "prebuild": "npm run gen:registry",
    "dev": "next dev",
    "build": "next build"
  }
}
```

CI에서 추가:
- `npm run gen:registry` 실행 후 `git diff --exit-code src/lib/games/registry.generated.ts` 검사 → 누군가 generated 파일과 manifest 사이를 안 맞춰서 commit하면 차단

### 5.4 공유 인프라 계약 (`src/lib/core/`)

- 게임은 `import { ... } from "@/lib/core/fsrs"` 가능
- 게임에서 `lib/core/` 파일 수정 = 별도 PR (path filter로 명시 차단)
- `lib/core/` 변경 시 영향 받는 모든 게임 테스트 자동 실행 (CI matrix)
- public API는 `src/lib/core/index.ts`에서 명시 export. internal 파일 직접 import 금지 (lint 규칙 강제)

---

## 6. 마이그레이션 플랜 (Phase 단위)

### Phase R1 — 자동 발견 도입 (1일)

- [ ] `scripts/generate-registry.ts` 작성
- [ ] `package.json`에 predev/prebuild 추가
- [ ] 기존 `src/games/factorization/index.ts` → `manifest.ts`로 이름 변경 + `loadComponent` 추가
- [ ] `src/lib/games/registry.ts`를 generated 파일 re-export로 변경
- [ ] CI에 `gen:registry` 검증 단계 추가
- [ ] dev/build 양쪽 작동 확인

### Phase R2 — 게임 디렉토리 자급화 (1일)

- [ ] `src/games/factorization/components/` 하위 디렉토리 생성
- [ ] `content/cards/factorization/*.json` → `src/games/factorization/content/cards/`로 이동
- [ ] 게임 전용 카피 → `src/games/factorization/content/copy.ts`
- [ ] 게임 전용 테스트 → `src/games/factorization/tests/`
- [ ] README.md 작성 (게임 작업자 onboarding)

### Phase R3 — 공유 인프라 격리 (0.5일)

- [ ] `src/lib/` 의 잠재 공유 모듈 후보 정리 (FSRS, AST, fingerprint)
- [ ] `src/lib/core/`로 이동
- [ ] `src/lib/core/index.ts`에 public API 정의
- [ ] ESLint 규칙 추가: `import "@/lib/core/internal/*"` 금지

### Phase R4 — CI path filter (0.5일)

- [ ] `.github/workflows/ci.yml`에서 changed-files 필터
- [ ] 게임 단위 테스트 매트릭스 (`{ game: factorization }, { game: matching }, ...`)
- [ ] `lib/core/` 변경 시 모든 게임 테스트 강제 실행

### Phase R5 — 두 번째 게임으로 검증 (0.5일)

- [ ] 가짜 게임 `coming-soon-demo` 추가 — `manifest.ts`만 존재, status `coming-soon`
- [ ] PR 시뮬레이션: 두 worktree에서 두 게임 동시 작업 → 머지 충돌 0 확인

**총 소요: 3.5일.** Phase 0 사전 게이트와 병렬 진행 가능.

---

## 7. 게임 작업자 onboarding (게임당 README.md)

각 `src/games/<id>/README.md` 템플릿:

```markdown
# <게임 제목>

- **gameId**: <id>
- **과목·단원**: <subject> / <unit>
- **상태**: available | coming-soon
- **담당자**: <github handle>

## 시작하기

1. 이 디렉토리만 작업하세요. `lib/core/` 변경이 필요하면 별도 PR.
2. `npm run dev` → `localhost:3000/games/<id>` 에서 확인.
3. 테스트: `npm run test -- src/games/<id>/`

## 의존성

- `@/lib/core/fsrs` — SRS 엔진 (read-only)
- `@/lib/core/schema` — Card / Event 스키마

## 콘텐츠 추가

`content/cards/` 에 JSON 추가. 스키마는 `lib/core/schema/card.ts`.
```

---

## 8. 병렬 개발 워크플로우

### 8.1 브랜치 명명 규칙

- `game/<id>` — 새 게임 작업 (예: `game/matching`)
- `game/<id>/<sub>` — 같은 게임의 sub-feature (예: `game/factorization/animation`)
- `core/<topic>` — 공유 인프라 작업 (예: `core/fsrs-priority-queue`)
- `infra/<topic>` — 빌드/CI/registry 자체 (예: `infra/registry-generator`)

### 8.2 Worktree 가이드

```bash
# 게임 A를 별도 워크트리에서 작업
git worktree add ../pullim-games-matching game/matching

# 게임 B는 메인 워크트리
cd /path/to/pullim-games
git checkout game/factorization
```

서로 다른 worktree에서 두 게임 작업 → 디렉토리 격리되어 있어 머지 충돌 0.

### 8.3 머지 순서

- 게임 PR끼리는 순서 무관 (격리됨)
- `core/*` PR이 있으면 게임 PR보다 먼저 머지 → 게임 PR rebase로 검증
- `infra/*` PR은 게임 PR 모두 머지된 뒤에 (registry generator 변경 등)

---

## 9. CI 전략

### 9.1 path filter

```yaml
# .github/workflows/ci.yml (스케치)
on:
  pull_request:
    paths:
      - "src/games/**"
      - "src/lib/core/**"
      - "scripts/**"

jobs:
  detect-games:
    # changed files 분석 → 영향 받는 game ids 출력

  test-game:
    needs: detect-games
    strategy:
      matrix:
        game: ${{ fromJSON(needs.detect-games.outputs.games) }}
    steps:
      - run: npm test -- src/games/${{ matrix.game }}/

  test-core:
    if: contains(needs.detect-games.outputs.affected, 'core')
    # core 변경 = 모든 게임 영향 → 풀 매트릭스
```

### 9.2 빌드 게이트

- `gen:registry` 검증 (idempotent 확인)
- typecheck 전체 (게임 N개 영향 받을 수 있어 게이트는 전체)
- 번들 사이즈 측정 — 게임별 청크 크기 코멘트 (regression 방지)

---

## 10. 리스크와 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| `registry.generated.ts` 가 PR마다 conflict | 머지 충돌 재발 | generated 파일을 .gitignore + CI에서만 생성. 단, 그러면 generateStaticParams 정적 생성 시 빌드 의존성 까다로움 → 결정 필요 |
| `loadComponent` 동적 import가 SSR 메타 생성에 안 맞음 | OG 카드 누락 | meta는 static, component만 동적 import — manifest.ts에서 분리 |
| 게임 디렉토리 안에서 lib/core 수정하는 작업자 | 격리 깨짐 | ESLint 규칙 + CODEOWNERS로 차단 |
| Phase R2 콘텐츠 이동 시 import 경로 다 깨짐 | 한 PR이 N개 파일 수정 | codemod 스크립트로 일괄 처리 + 같은 PR에서 다른 작업 금지 |
| 게임당 테스트 셋업 N배 | 테스트 시간 증가 | path filter로 변경된 게임만 실행 |
| 자동 발견 디버깅 어려움 ("내 게임이 왜 메인페이지에 안 보이지") | 작업자 onboarding 마찰 | gen:registry 출력 stdout에 발견된 게임 목록 표시. README에 트러블슈팅 |

---

## 11. 검증 기준 (Phase R 완료 시)

- [ ] 새 게임 PR 1개가 `registry.ts` / `registry.generated.ts` 외 중앙 파일 수정 0개
- [ ] 두 worktree에서 두 게임을 동시에 만들고 main에 머지할 때 conflict 0
- [ ] 게임 1개 수정 PR의 CI 시간이 전체 빌드의 70% 미만
- [ ] `lib/core/` 수정 PR은 모든 게임 테스트가 자동 실행됨
- [ ] 게임 1개 디렉토리 통째로 삭제 시 다른 게임 작동 정상

---

## 12. NOT in scope

- npm workspaces / monorepo 전환 (V3 재검토)
- 게임을 별도 빌드 아티팩트로 (Module Federation 등)
- 게임별 별도 도메인 (`factorization.pullim.app`)
- 게임 간 데이터 공유 패턴 (단일 백본 = lib/core/fsrs로 자연 해결)
- 동적 게임 로드 (관리자가 런타임에 게임 추가)

---

## 13. 결정 대기 항목

이 기획서를 반영하기 전 명세 작성자가 결정해야 할 항목:

1. **`registry.generated.ts` commit vs gitignore?**
   - 권장: **commit**. 머지 충돌 가능성은 낮고 (자동 생성된 alphabetical order이라), 정적 빌드/SSG 의존성이 명확.
2. **Phase R 일정** — V1 Phase 0 사전 게이트와 병렬 진행 (3.5일) vs Phase 1 빌드 시작 후 (게임 2개째 추가 시점) 도입?
   - 권장: **병렬 진행**. 게임 1개 시점에 미리 갖춰두면 게임 2개째부터 즉시 효과.
3. **`lib/core/` 분리를 V1 Phase 1과 동시?**
   - 권장: **동시**. Phase 1에서 lib/ast, lib/fsrs 처음 만들 때부터 lib/core/ 안에 배치하면 마이그레이션 비용 0.

---

## 14. 다음 단계

1. 이 기획서 검토 → 승인
2. 결정 대기 3개 항목 확정
3. SPEC `09-기술-환경.md` `§9.7 코드 구조`를 5.1 디렉토리로 갱신
4. SPEC `10-개발-로드맵.md` Phase R1~R5를 Phase 1과 병렬 lane으로 추가
5. Phase R1 시작 (자동 발견 스크립트 도입)
