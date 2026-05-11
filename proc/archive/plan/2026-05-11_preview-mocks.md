# 미리보기 뷰 — Mechanic 기반 애니메이션 Mock

DRAFT · 2026-05-11

## 0. 컨텍스트

직전 plan ([`2026-05-11_game-preview.md`](../archive/plan/2026-05-11_game-preview.md)) 에서 `/games?view=preview` 5번째 view 도입. 자산 누락 시 `<큰 아이콘 + "미리보기 준비 중">` fallback 만 노출 — 14 카드 모두 동일한 정적 placeholder 라 "이 게임이 어떻게 작동하는지" 의 본질이 안 살아남.

사용자 요청 (2026-05-11):

> 기존 미리보기에서 mock 데이터로 "미리보기 준비중"보다는 각 콘텐츠를 gif 형태로 간소화하여 표현해줄 수 있을까?

→ fallback 을 mechanic 별 짧은 애니메이션 loop 으로 대체. 진짜 GIF 파일이 아니라 framer-motion 기반 declarative animation (마운트 시 자동 재생, 무한 loop).

## 1. 목표

자산 (`/previews/{id}.png`) 이 없을 때, "이 게임은 이렇게 동작한다" 가 시각적으로 전달되는 **mechanic 별 애니메이션 mock** 을 PreviewView 카드 상단 16:10 영역에 노출.

비목표:
- 게임별 1:1 고유 mock — V2
- 실제 GIF/WebM 자산 캡처 — V3
- 실제 게임 컴포넌트 라이브 임베드 — V3

## 2. 왜 mechanic 5종 기반인가

| 접근 | 작업량 | 유지보수 | 정확도 |
|---|---|---|---|
| 게임별 14 mock | 14 * 디자인 시간 | 게임 추가 시마다 | 높음 |
| **mechanic 5 mock** | 5 * 디자인 시간 | 메커닉 추가 시 | 중간 (메커닉 결 전달 충분) |
| 실 GIF 캡처 | 14 * 캡처 + 파이프라인 | UI 변경 시 재캡처 | 매우 높음 |

V1 = mechanic 5종. 풀림 게임즈 game registry 를 보면 같은 mechanic 안의 게임들은 동일한 retrieval 결을 공유 (manipulation = 드래그/조작, sorting = 순서 정렬, ...). 짧은 teaser 에서는 mechanic 결만 전달돼도 사용자가 "아, 이런 게임이구나" 파악 가능.

게임의 **subject/title** 은 mock 안에 텍스트로 살짝 오버레이 — 같은 mechanic 안에서도 카드별로 다르게 보임.

## 3. Mechanic 별 mock 설계

### 3.1 `manipulation` (factorization, math-graph-shift, physics-vector, chemistry-balance)

```
[ 2x + 4 ]                           [ 2(x + 2) ]
   ↓ (드래그 표시 손가락)        →
   [ 2 · (x+2) ]
```

씬:
- 식 블록이 가운데에 등장 → 분리 손짓 (작은 손/커서 아이콘이 가운데에서 양옆으로 슬라이드) → 두 블록으로 분리 → 잠시 머무른 뒤 페이드 → 처음 식 등장 (loop)
- duration: 3.5s, repeat infinity
- 게임별 텍스트: factorization=`2x+4 / 2(x+2)`, math-graph-shift=`y=x² / y=(x-1)²`, physics-vector=`(2,3) / (5,1)`, chemistry-balance=`H₂+O₂ / H₂O`

### 3.2 `sorting` (history-timeline, english-order)

```
┌──┐ ┌──┐ ┌──┐
│ B│ │ A│ │ C│   →   ┌──┐ ┌──┐ ┌──┐
└──┘ └──┘ └──┘        │ A│ │ B│ │ C│
                       └──┘ └──┘ └──┘
```

씬:
- 3개 작은 박스가 무작위 순서로 등장 → x 축으로 슬라이드해 정렬됨 → 각 박스 jade 글로우 → 페이드 → loop
- 게임별 텍스트: history-timeline=`삼국·고려·조선`, english-order=`I / am / happy`

### 3.3 `matching` (english-word-match, custom-word-match)

```
[ apple ]   ←→   [ 사과 ]
[ book  ]   ←→   [ 책   ]
```

씬:
- 좌우 컬럼 각 2개 카드 등장 → 두 짝 사이에 jade 라인이 그어짐 (animated stroke-dasharray) → 라인 페이드 → loop
- 게임별 텍스트: english-word-match=`apple↔사과`, custom-word-match=`보기↔뜻`

### 3.4 `multiple-choice` (math-quick-quiz, custom-multiple-choice)

```
Q: 2 + 2?
[A] 3   [B] 4   [C] 5   [D] 6
       ↑ jade glow
```

씬:
- 질문 한 줄 + 4 보기 박스 등장 → 정답(B) 박스만 jade 글로우 + scale 1.05 → 다른 보기 페이드 다운 → loop
- 게임별 텍스트: math-quick-quiz=`2+2? · A B (C) D`, custom-multiple-choice=`Q · A B (C) D`

### 3.5 `typing` (vocab-typing, custom-typing)

```
ph___       →    pho__       →    photo
```

씬:
- 단어 placeholder 가 글자 단위로 한 글자씩 추가됨 (typewriter) → 완성 시 jade 체크 → 페이드 → loop
- 게임별 텍스트: vocab-typing=`photo`, custom-typing=`정답`

### 3.6 `blank` (english-blank, custom-blank)

⚠️ 현 [GameMechanic](src/lib/games/types.ts) 는 5종(`manipulation/sorting/matching/multiple-choice/typing`) 만 있음. blank 게임들은 mechanic 이 `multiple-choice` 로 등록됨 (확인 필요). 만약 별도 처리 필요하면 mock 도 6종으로 확장.

→ 본 plan 작업 첫 단계에서 manifest 확인. blank 들이 multiple-choice 라면 그대로 5종 유지.

## 4. 컴포넌트 설계

```
src/components/game-hub/preview-mocks/
├── index.ts                       — 라우터: mechanic → 컴포넌트 선택
├── ManipulationMock.tsx
├── SortingMock.tsx
├── MatchingMock.tsx
├── MultipleChoiceMock.tsx
└── TypingMock.tsx
```

각 mock 컴포넌트 props:
```tsx
interface MockProps {
  /** 게임별 텍스트 변형 (subject/title 기반 결정) */
  variant?: { left?: string; right?: string; items?: string[]; word?: string };
  /** 잠금 게임은 grayscale */
  locked?: boolean;
}
```

`index.ts`:
```ts
export function PreviewMock({ meta, locked }: { meta: GameMeta; locked: boolean }) {
  const variant = pickVariant(meta);  // gameId → 텍스트 매핑
  switch (meta.mechanic) {
    case "manipulation": return <ManipulationMock variant={variant} locked={locked} />;
    case "sorting":      return <SortingMock variant={variant} locked={locked} />;
    case "matching":     return <MatchingMock variant={variant} locked={locked} />;
    case "multiple-choice": return <MultipleChoiceMock variant={variant} locked={locked} />;
    case "typing":       return <TypingMock variant={variant} locked={locked} />;
  }
}
```

`pickVariant` — gameId 별 명시 매핑 테이블 (작은 record). 없으면 디폴트 텍스트.

## 5. PreviewView 통합

[`PreviewView.tsx`](src/components/game-hub/views/PreviewView.tsx) `<PreviewMedia>` 의 fallback 부분을 `<PreviewMock />` 로 교체:

```tsx
<div className="absolute inset-0">
  <PreviewMock meta={meta} locked={!isAvailable} />
</div>
{meta.previewImagePath && (
  <img ... onError={hide} />  // 이미지 있으면 mock 위에 덮임
)}
```

→ 이미지 자산이 있으면 그게 우선, 없으면 mock 자동 노출. "미리보기 준비 중" 텍스트는 제거.

## 6. 기술 결정

- 라이브러리: **framer-motion** (이미 deps)
- 모션 패턴: 모든 mock 은 `repeat: Infinity`, duration 3-4s, easing `easeInOut`
- `prefers-reduced-motion`: framer-motion 의 `useReducedMotion()` 훅으로 detect → 정적 첫 프레임만 노출 (애니메이션 0)
- 색: 풀림 토큰 (`bg-bg-block`, `text-type-primary`, `accent-positive` 등) 만 사용. shadcn 기본색 X
- 폰트: 시스템 (text-helper / text-label) — Pretendard 자동 적용
- 잠금 게임: grayscale 필터 + opacity 0.6 — PreviewView 의 기존 처리와 일치
- 시각 무게: 아이콘+텍스트 기반 단순 도형. SVG 또는 div+border. SVG 는 1개 파일 ~3KB 목표
- 카드 안 mock 은 **autoplay** — 사용자 인터랙션 X (스크롤로 보일 때만 재생되도록 `useInView` 적용 권장, 14개 동시 재생 부담)

## 7. Phasing

### V1 — 본 plan
- [ ] 5 mechanic mock 컴포넌트 (framer-motion 기반)
- [ ] PreviewMock 라우터 + variant 매핑 테이블
- [ ] PreviewView fallback 영역 교체
- [ ] `useInView` 로 viewport 진입 시만 재생
- [ ] `prefers-reduced-motion` 처리

### V2 (별도 plan)
- 게임별 1:1 고유 mock — manipulation 안에서도 factorization vs vector 가 다르게 보임
- mock 컴포넌트 카탈로그 페이지 (`/design-system/preview-mocks`)

### V3 (별도 plan)
- puppeteer 자동 캡처로 실제 게임 GIF/WebM 자산 생성
- mock 은 자산 누락/로딩 중 폴백으로 강등

## 8. 검증 기준

- [ ] /games?view=preview 14 카드 모두 애니메이션 mock 노출 (정적 placeholder 0)
- [ ] mechanic 별로 시각적으로 구분됨 (manipulation vs typing vs matching 등)
- [ ] `previewImagePath` 자산 추가 시 mock 위에 이미지 덮임 (V1 폴백 동작 보존)
- [ ] 잠금 게임은 grayscale + 정적 (또는 매우 느린)
- [ ] `prefers-reduced-motion` 환경에서 애니메이션 정지
- [ ] 모바일에서 jank 없음 (Chrome DevTools throttle 4x CPU 확인)
- [ ] typecheck/lint/test/build pass
- [ ] /games 200, 다른 view 회귀 0

## 9. 리스크 / 대응

| 리스크 | 대응 |
|---|---|
| 14 카드 동시 재생 → 모바일 GPU 부담 | `useInView` + `repeat` viewport 안에서만, 카드 1개 ≤ 5 transform |
| framer-motion 번들 증가 | 이미 사용 중 (이전 plan 들에서) — 신규 import 영향 미미 |
| mechanic 5종 분류로 게임 차별화 부족 | gameId 기반 텍스트 variant 로 보완. 진짜 차별화는 V2 |
| 5번째 mechanic `blank` 누락 | 첫 단계에서 manifest 확인, blank → multiple-choice 인지 별도 처리인지 결정 |
| 예술적 일관성 (5명이 만든 것처럼 보일 위험) | 동일 motion design tokens (duration/easing/색) 5 mock 공유 |

## 10. 결정 (한 번에)

- mechanic 5종 mock — 게임별 1:1 V2 로 미룸
- framer-motion `useInView` + `useReducedMotion` 두 훅 활용
- variant 텍스트는 gameId 매핑 테이블 (간단한 record)
- 이미지 자산 우선 (있으면 mock 위에 덮임)
- 잠금 게임은 grayscale 정적

## 11. 진행 순서 (V1)

1. 본 plan 승인
2. manifest 14개 mechanic 분포 확인 (blank 처리 결정)
3. 5 mock 컴포넌트 작성 (framer-motion + 풀림 토큰)
4. PreviewMock 라우터 + variant 매핑
5. PreviewView fallback 교체
6. typecheck/lint/test/build
7. dev `/games?view=preview` 수동 검증 (5 mechanic 모두 시각 확인)
8. 커밋 + push
9. plan archive
