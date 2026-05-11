# 게임 허브 — 게임 미리보기

DRAFT · 2026-05-11

## 0. 컨텍스트

사용자 요청 (2026-05-11):

> 게임 허브에서 각 게임의 미리보기 형태로 보여줘서 사용자가 이 게임이 어떤 방식으로 작동하는지 볼 수 있으면 좋겠어. 이건 뷰 형태를 변환해서 제공해도 될 거 같긴 한데, 아니면 미리보기 아이콘을 클릭해서 툴팁형태로 미리보기 이미지를 보여줘도 될 거 같아.

현재 게임 허브는 [GameCard](src/components/GameCard/index.tsx) 가 lucide 아이콘 + 제목 + 단원 + 한 줄 태그라인만 노출. 사용자는 게임을 들어가야만 메커닉(블록 분리, 짝 매칭, 빈칸, 타이핑 등) 을 알 수 있음 → 진입 장벽.

## 1. 목표

게임 허브 (`/games`) 에서 게임을 클릭하기 전에 "이 게임이 어떻게 작동하는지" 볼 수 있게 한다.

비목표:
- 게임 내부 UI 변경
- 자동 캡처 파이프라인 (V2 — 우선 수동 author)
- 동영상/모션 (V2)
- 인터랙티브 라이브 데모 (V3)

## 2. 두 옵션 분석

### 옵션 A — 미리보기 뷰 (5번째 view toggle)

ViewToggle 에 "미리보기" 추가. 카드 안에 preview 이미지가 큼지막하게 들어가는 grid.

✅ 발견성 높음 (toggle 항상 노출). 모바일 호환 (hover 의존 X). 한 번에 여러 게임을 한눈에 비교.
❌ 카드 폭/높이 증가 → 한 화면에 보이는 게임 수 ↓. 이미지 파일 크기 영향 큼 (모바일 데이터). 정보 밀도 낮음.

### 옵션 B — 미리보기 아이콘 클릭/호버 → 툴팁 (모든 뷰에 적용)

각 게임 카드/행 우측에 작은 미리보기 아이콘 (Eye 또는 Play) → 클릭 시 popover/dialog 로 preview 이미지 노출.

✅ 기존 4 뷰 모두에 동시 적용. 카드 레이아웃 무변경. 이미지는 사용자가 요청할 때만 로드 (lazy). 정보 밀도 유지.
❌ 발견성 낮음 (아이콘 모르면 못 씀). 모바일은 hover 없어서 클릭 → popover 패턴 필요. 한 번에 1개씩 (비교 X).

### 옵션 C — 둘 다 (단계적)

**V1 = A (preview view)** — depth 0 으로 14 게임을 한눈에 비교. 사용자 의도의 본질.
**V2 = B (툴팁)** — 다른 4 뷰에서도 가볍게 미리보기 보고 싶을 때.

✅ 같은 자산(이미지) 으로 V1/V2 둘 다 동작. depth 0 가 1차로 해소됨.
❌ 두 단계 (단, V2 는 데이터 보고 결정).

**추천: V1 = A**. 사용자 핵심 요구 "한 눈에 파악" = depth 없는 grid. 옵션 B 는 정보 밀도가 우선인 사용자 (table/list view 사용자) 가 미리보기를 원할 때 유용 — 이건 V2 에서 데이터 보고 추가 결정.

## 3. V1 스코프 (본 plan 의 실제 구현 범위)

옵션 A + 자산 인프라.

### 3.1 자산 — 게임별 preview 이미지

- 위치: `public/previews/{gameId}.png` (또는 .webp — 압축 우선)
- 권장 사이즈: **640 × 400** (16:10), 100KB 이내 목표
- 작성 방식 V1: **수동 캡처** — 풀림 게임즈 dev 서버에서 게임 진행 중 화면 캡처 + crop
- 누락 시 fallback: `<EmptyPreview>` — 큰 lucide 아이콘 + 태그라인 + "미리보기 준비 중"
- V2 자동화: puppeteer 스크립트로 게임별 자동 캡처 (`scripts/capture-previews.ts`)

### 3.2 매니페스트 schema 확장

[src/lib/games/types.ts](src/lib/games/types.ts) `GameMeta` 에:

```ts
/** 게임 허브 미리보기 자산 (선택). public/ 기준 경로 또는 URL. */
previewImagePath?: string;
```

각 게임 manifest 에 `previewImagePath: "/previews/{id}.png"` 추가. 실제 파일이 없어도 schema 만 정의 — fallback UI 가 처리.

V2+ 확장 후보:
- `previewVideoPath?: string` — webm/mp4 짧은 루프
- `previewComponent?: () => Promise<{ default: ComponentType }>` — 라이브 미니 데모

### 3.3 컴포넌트

**ViewToggle 5번째 옵션 추가**:
- [src/components/game-hub/ViewToggle.tsx](src/components/game-hub/ViewToggle.tsx)
  - `GameHubView` 타입에 `"preview"` 추가
  - OPTIONS 에 `{ value: "preview", label: "미리보기", icon: Image }` 추가
  - localStorage 호환 (저장된 view 가 잘못된 값이어도 fallback)

**신규 view**:
- [src/components/game-hub/views/PreviewView.tsx](src/components/game-hub/views/PreviewView.tsx)
  - 1 col (모바일) / 2 col (sm) / 3 col (lg) grid
  - 각 카드 (shadcn Card) 구조:
    - 상단: preview 이미지 영역 (16:10, full-width, lazy load)
    - 본문: 아이콘 + 제목, 과목·단원, 태그라인, 시간
    - 카드 전체가 게임 라우트 링크
  - 이미지 누락 시 fallback: 큰 lucide 아이콘 + "미리보기 준비 중" subtle 라벨

**라우팅**:
- [src/components/game-hub/GameHubPage.tsx](src/components/game-hub/GameHubPage.tsx) `ResultView` switch 에 `"preview"` 케이스 추가

### 3.4 UX 디테일

- preview 이미지: `<img loading="lazy" decoding="async">` + `aspect-ratio: 16/10`
- 이미지 위 hover 시 살짝 scale (transition-transform group-hover:scale-105) — 인터랙션 hint
- 잠금 게임 (`status: 'coming-soon'`) 은 카드 opacity 65 + lock 아이콘 오버레이 (다른 view 와 동일 패턴)
- 카드 전체가 단일 링크 — 별도 "시작" 버튼 불필요 (depth 0 의도와 일치)
- 이미지 fallback skeleton: 풀림 slate 100 배경 + 큰 게임 아이콘 가운데 + 작은 "미리보기 준비 중" 라벨

## 4. V2 스코프 (별도 plan)

- 옵션 B (Eye 아이콘 → HoverCard 툴팁) — table/list view 등 정보 밀도 우선 사용자용. 사용자 데이터 보고 결정
- 자동 캡처 스크립트 (puppeteer) — 14 게임을 자동으로 PNG 저장
- webm/mp4 짧은 루프
- 라이브 미니 데모 (각 게임 별 `previewComponent`)

## 5. 컴포넌트 매핑 / 변경 요약

| 파일 | 변경 |
|---|---|
| `src/lib/games/types.ts` | `previewImagePath?: string` 필드 추가 |
| `src/games/*/manifest.ts` (14개) | manifest 에 `previewImagePath` 추가 (값은 모두 `/previews/{id}.png`) |
| `public/previews/` | 14개 PNG 자산 (V1 수동, 누락 OK — fallback 동작) |
| `src/components/game-hub/views/PreviewView.tsx` | **신규** — 5번째 view |
| `src/components/game-hub/ViewToggle.tsx` | `"preview"` 옵션 추가 |
| `src/components/game-hub/GameHubPage.tsx` | `ResultView` switch 에 케이스 추가 |

## 6. 검증 기준

- [ ] ViewToggle 5 옵션 (그리드·리스트·테이블·썸네일·미리보기) 모두 노출
- [ ] "미리보기" 선택 시 PreviewView 렌더링
- [ ] 1/2/3 col 반응형 (모바일/sm/lg)
- [ ] 자산 있는 게임은 이미지 노출, 없는 게임은 fallback (큰 아이콘 + "미리보기 준비 중")
- [ ] 카드 전체 클릭 시 게임 라우트 이동
- [ ] 잠금 게임 (`status: 'coming-soon'`) 은 다른 view 와 동일하게 disabled 표시
- [ ] localStorage 에 view 저장 (다음 방문 시 복원)
- [ ] URL ?view=preview 도 동작
- [ ] typecheck/lint/test/build pass
- [ ] /games 200, 다른 view (그리드·리스트·테이블·썸네일) 회귀 없음

## 7. 리스크

| 리스크 | 대응 |
|---|---|
| 14개 이미지 수동 캡처 부담 | V1 은 누락 허용 + fallback. 캡처는 점진적 추가 (V2 자동화) |
| 이미지 누적 → 데이터 사용 | lazy load + WebP 권장 + 100KB 목표 + 자산 누락 시 fallback 으로 가벼움 |
| view 늘면 ViewToggle 가로 폭 ↑ | h-8 w-8 5개 = 약 180px — 모바일 헤더에서 ViewToggle 옆 필터 sheet 와 충돌 우려, 검증 필요 |

## 8. 결정 (한 번에)

- V1 = 옵션 A (5번째 view "미리보기")
- V2 별도 plan = 옵션 B (Eye → HoverCard 툴팁) 데이터 보고 결정 + 자동 캡처
- 자산: PNG (또는 WebP), 640×400 (16:10), public/previews/
- 누락 자산 fallback 필수 (큰 아이콘 + "미리보기 준비 중")
- 게임 manifest 14개 모두에 `previewImagePath` 추가 (실제 파일 없어도 schema 통일)
- 카드 = 단일 링크 (별도 시작 버튼 X)

## 9. 진행 순서 (V1)

1. 본 plan 승인
2. `previewImagePath` schema 추가 + 14 manifest 경로 추가
3. PreviewView 작성 (이미지 + fallback)
4. ViewToggle 에 "preview" 옵션 추가 + GameHubPage ResultView 케이스 추가
5. typecheck/lint/test/build
6. `/games?view=preview` 수동 검증 (자산 누락 상태에서 fallback 확인)
7. 커밋 + push
8. plan archive

자산 생성 (14 PNG) 은 별도 작업 — V1 은 fallback 으로도 동작. 자산 추가는 점진적.
