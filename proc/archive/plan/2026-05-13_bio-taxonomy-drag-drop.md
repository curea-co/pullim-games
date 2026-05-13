# 2026-05-13 — bio-taxonomy 드래그 앤 드롭 재구성 (D4 뒤집기)

- **상태**: ✅ MERGED (2026-05-13) — PR #34 에 D&D 교체 commit `d52a4ec` 추가 + main 머지 완료. 자가 검증: typecheck/vitest 134/e2e 7/SSR 200 PASS. 실기기 드래그 정밀도 확인 미수행 (사용자 권한)
- **트리거**: 사용자 요청 — "생물 분류 트리는 드래그앤드롭으로 다시 구성하자"
- **선행 plan**: [proc/plan/2026-05-13_new-mechanics-expansion.md](2026-05-13_new-mechanics-expansion.md) M3 (PR #34 — click-to-assign 으로 V0 출시)
- **메모리 룰 적용**: 단일 백본 (외부 D&D 라이브러리 금지) · 학습효과 > 중독성 · 모바일 first

## 0. D4 뒤집기 배경

기존 D4=A (click-to-assign) 의 가설/단점:
- 두 단계 인터랙션 (카드 탭 → 카테고리 탭) — 학생이 첫 진입 시 무엇이 클릭 가능한지 학습 부담
- 카테고리 안 카드 탭 → 풀 복귀 인터랙션이 비직관적 (탭은 보통 "선택")
- 시각적 이동 부재 — 카드가 즉시 사라지고 카테고리 안에 다시 나타남 (인지 단절)

드래그 앤 드롭의 학습 이점:
- 1 단계 인터랙션 — 카드를 손가락으로 끌어 분류 영역에 놓는 행동 자체가 메커닉 = retrieval
- 시각적 연속성 — 카드 이동 = 학습 흐름의 물리적 메타포
- 풀 복귀 = 카드를 풀 영역으로 다시 드래그 (같은 메커닉 재사용)
- factorization 패턴과 일관성 ↑ (수학·물리·화학 manipulation 게임들의 결과 같음)

## 1. 기술 접근

### 라이브러리 — factorization 패턴 재사용 (외부 D&D 라이브러리 X)

기존 [src/games/factorization/component.tsx](../../src/games/factorization/component.tsx) 의 검증된 패턴:
- `framer-motion` 의 `motion.div drag` + `onDragEnd(info: PanInfo)`
- drop zone = ref + `getBoundingClientRect()`
- hit-test: pointer.x/y 가 zone rect 안에 있는지 + distance > threshold
- 룰 적용: `proc/plan/2026-05-12_game-discrimination-and-polish.md` I2 — **영역 안 AND distance > threshold**

→ 외부 라이브러리 (`dnd-kit`, `react-dnd`) 추가 안 함. 메모리 룰 "단일 백본" + 의존성 최소.

### Drop zones

- N 카테고리 박스 (각각 ref)
- 1 풀 영역 (ref) — 카드를 풀로 되돌리는 데 사용
- 합계 `N+1` zones. hit-test 시 가장 가까운 zone 또는 zone 안에 들어간 첫 zone.

### 카드 위치 = source of truth

상태: `assignments: Record<itemId, categoryId | "pool">` (null 대신 "pool" 명시 — 시맨틱 명확).

drag-end 핸들러:
1. hit-test 모든 zones (categories + pool)
2. 일치 zone 있으면 `assignments[itemId] = zoneId`
3. 없으면 원위치 (animate back)

framer-motion 의 `layout` prop 으로 카드가 새 위치로 spring 애니메이션.

### 모바일 touch — drag 정밀도

factorization 검증: 모바일 320~390px 폭에서 드래그 OK (e2e viewport.spec 통과).
bio-taxonomy 에선 카테고리 박스 4개 가로면 한 박스 ~100px → drag target 작음. 대응:
- E3 결정 — 4 카테고리는 모바일에서 2×2 그리드 (한 박스 ~160px)
- 카드 사이즈 보장 (min 44×44 — iOS 터치 가이드)

## 2. 결정점

### E1 — 풀 복귀 방식

옵션:
- **A (추천)** 카테고리 안 카드 → 풀 영역으로 드래그 (단일 메커닉)
- B 카테고리 안 카드 탭 → 즉시 풀 복귀 (드래그+탭 혼용)
- C 각 카드에 X 버튼 (드래그+버튼 혼용)

→ **A 추천** — 메커닉 일관성. 단점: 학생이 "어떻게 빼내지?" 처음에 모를 수 있음 → hint 텍스트로 보조 ("카드를 끌어 풀로 되돌릴 수 있어요").

### E2 — 카드 시각적 위치

옵션:
- **A (추천)** 카테고리 안 = 실제 카테고리 박스 자식 (현재 plan + click-to-assign 패턴과 동일)
- B 카테고리 색 chip 만 변경, 위치는 풀 안 (시각 단순, 학습 흐름 불연속)

→ **A 추천** — 실제 위치 이동이 학습 메타포로 더 강함.

### E3 — 모바일 4 카테고리 레이아웃

옵션:
- **A (추천)** 모바일(<lg) = 2×2 그리드 / 데스크톱(lg+) = 1×4 가로
- B 모바일도 1×4 가로 (한 박스 너무 좁음)
- C 모바일도 2×2 + 데스크톱도 2×2 (데스크톱 공간 낭비)

→ **A 추천** — 반응형. tailwind `grid-cols-2 lg:grid-cols-4` 패턴 활용. 2 카테고리는 `grid-cols-2`, 3 카테고리는 `grid-cols-3`, 4 카테고리는 `grid-cols-2 lg:grid-cols-4`.

### E4 — PR 진행 방식

옵션:
- **A (추천)** PR #34 머지 후 follow-up PR (`feat/bio-taxonomy-dnd`) — V0 출시(click-to-assign) 후 D&D 로 V0.1 업그레이드. 회귀 분리.
- B PR #34 의 commit 추가/amend — click-to-assign 코드는 GitHub 에 노출되지 않고 D&D 만 머지. 깔끔. 단 사용자가 click-to-assign V0 으로 dogfooding 못 해봄.
- C PR #34 닫고 새 PR (`feat/bio-taxonomy-v0.1-dnd`) — 가장 명확.

→ **B 추천 이유**: V0 자체가 아직 main 머지 안 됨. 사용자가 "다시 구성" 이라 했고, click-to-assign 은 dogfood 없이 그 결정이 부적합으로 확인됨. 굳이 V0 출시 후 V0.1 로 가는 건 의례. PR #34 에 D&D commit 추가하고 click-to-assign 코드는 같은 PR 안에서 교체. PR 설명도 업데이트.

→ **A 의 가능성**: 사용자가 V0 출시 후 차이를 보고 싶다면 A. 결정 필요.

## 3. 새 인터랙션 명세

### 카드 상태머신

```
pool ──drag→ dragging ──drop-on-category→ in-category[X]
                       ──drop-on-pool────→ pool
                       ──drop-on-miss────→ (animate back to source)

in-category[X] ──drag→ dragging ──drop-on-category[Y]→ in-category[Y]
                                 ──drop-on-pool──────→ pool
                                 ──drop-on-miss──────→ (animate back to source)
```

### Phase

기존 5-phase 유지: `playing → checking → correct/wrong → next/completed`.
드래그는 `playing` 안의 micro-phase 로 컴포넌트 내부 상태 (state machine 영향 X).

### "정답 확인" 활성 조건

모든 카드의 `assignments[itemId] !== "pool"`. (기존 `!= null` 과 동일 시맨틱, "pool" 로 명시화)

### 시각

- 풀 영역 = dashed border + bg-bg-block (현재 디자인 유지)
- 카테고리 박스 = solid border + 카테고리 색 (현재 유지)
- 드래그 중 카드 = scale 1.05 + shadow 강조 (factorization TermBlock 패턴)
- 활성 drop zone (드래그 중 pointer 가 들어간 zone) = outline + ring-2 강조
- drop 성공 시 카드 spring → 새 위치 (framer-motion `layout`)
- drop 실패 시 카드 spring → 원위치

## 4. 작업 항목 (E1=A / E2=A / E3=A / E4=B 채택 가정)

PR #34 의 코드를 D&D 로 교체:

- [ ] `components/ItemCard.tsx` — `motion.div drag` + `dragConstraints` + `onDragEnd(info)`. `placed` / `categoryColorIndex` props 유지, `active` 제거 (드래그가 active 대체)
- [ ] `components/CategoryBox.tsx` — `ref` 노출 + `receivable` 시각 (현재 click-receivable 로직 → drag-over receivable 로). `onReceive` 제거, 외부 drag-end 핸들러가 hit-test
- [ ] `components/Pool.tsx` (신규) — 풀 영역도 drop zone. ref 노출
- [ ] `component.tsx`
  - state: `activeItemId` 제거 → drag-tracking 만
  - `assignments: Record<string, string>` (categoryId | "pool")
  - `handleDragEnd(itemId, info: PanInfo)`: 모든 zone ref hit-test → 일치 zone 으로 assign 또는 원위치
  - `allPlaced` 조건 → `assignments[itemId] !== "pool"`
  - 모바일 4 카테고리 → `grid-cols-2 lg:grid-cols-4` (E3)
- [ ] `README.md` 인터랙션 섹션 업데이트 (click-to-assign → drag-and-drop)
- [ ] e2e — 기존 viewport.spec 7/7 회귀 통과 확인 (드래그 simulation 없이도 page 200 + CTA 있음 확인)
- [ ] (선택) e2e drag simulation 추가 (`page.dragTo()`) — 별 trk

### plan 업데이트 (이 PR 안에)

- [ ] `2026-05-13_new-mechanics-expansion.md` D4 결정 항목에 **🔄 2026-05-13 뒤집기** 주석 + 본 plan 참조
- [ ] 본 plan 의 결정점 합의 후 `상태 → IN-PROGRESS`

## 5. 비스코프

- 외부 D&D 라이브러리 도입 (`dnd-kit` 등) — 단일 백본 룰
- 키보드 접근성 (드래그 대신 키보드 화살표로 카드 이동) — V1+
- 카드 이미지 첨부 — V1+
- e2e drag simulation 자동화 — V1+

## 6. 합의 후 진행

추천안 E1=A / E2=A / E3=A / E4=B 그대로면 "추천대로 진행" 한 줄로 OK → PR #34 의 component·components·README 교체. 다른 조합이면 본 plan 업데이트 후 진행.
