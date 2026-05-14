# 2026-05-13 — /games 하단 "나만의 게임" 영역을 CTA로 승격

- **상태**: ✅ 진행 (2026-05-14) — D1=A 채택, 작업 진입
- **트리거**: 사용자 피드백 — `+ 카드 만들기` 우측 상단 작은 텍스트 링크는 약함. 영역 자체를 CTA로 만들어 클릭 affordance 를 키우자
- **메모리 룰 적용**:
  - 학습효과 > 중독성 / PVE — 사용자가 자기 콘텐츠를 만들어 푸는 흐름이 retrieval 깊이 가장 높음. 이 진입을 약하게 두는 건 손해
  - 결단력 있게 실행, 갈래 묻지 말 것 — 채워진 상태 처리 갈래를 D1 한 곳에 모아 전부 명시
- **스코프**: `CustomGamesSection.tsx` 단일 컴포넌트 + e2e 1건. /manage/* 변경 없음, 데이터/스토어 변경 없음

---

## 0. 현재 상태 (as-is)

**파일**: [src/components/game-hub/CustomGamesSection.tsx](src/components/game-hub/CustomGamesSection.tsx)

- 점선 border Card 컨테이너
- 헤더: Sparkles 아이콘 + "나만의 게임 / 내가 만든 카드로 풀어볼 수 있어요"
- **헤더 우측 상단**: `+ 카드 만들기` text-helper 작은 링크 → `/manage/content`
- **빈 상태(cards=0)**: 본문 "아직 만든 카드가 없어요. **관리**에서 첫 카드를 만들어 보세요." — `관리`만 작은 inline 링크
- **채워진 상태(cards>0)**: 2×2 그리드 — 객관식/빈칸/타이핑/매칭 4개 메커닉 카드. 각각 `/games/{id}` 로 개별 진입

**문제**:
1. 빈 상태에서 카드 만들기 진입점이 두 군데 모두 작은 텍스트 링크 — 영역 면적 대비 hit target/visual weight 미미
2. 정작 새 사용자가 가장 먼저 해야 할 동작(첫 카드 만들기)이 가장 작게 노출
3. 채워진 상태에서도 "추가로 만들기" 진입은 우측 상단 텍스트 링크 하나뿐

---

## 1. 목표 (to-be)

> **영역 자체가 CTA — 빈 상태에선 영역 전체 클릭으로 카드 만들기, 채워진 상태에선 명시적 큰 버튼으로 카드 만들기**

원칙:
- **빈 상태**: 영역 전체가 거대 CTA. `<button>` semantics, hover/focus/active state, 큰 `+` 아이콘 + 강한 카피
- **채워진 상태**: 4개 메커닉 카드는 그대로(개별 게임 진입). 단, 카드 만들기 진입을 **버튼으로 승격**해 명시
- **시각 일관성**: 빈/채워진 모두 점선 dashed border 유지 — "내가 채우는 영역"이라는 메타포

---

## 2. 디자인 변화

### 2-1. 빈 상태 (cards=0) — 영역 전체 CTA

```
┌─────────────────────────────────────────┐
│  (영역 전체가 button — 점선 강조)         │
│                                          │
│         [큰 + 아이콘 또는 Sparkles]       │
│                                          │
│           첫 카드 만들기                  │
│      내가 만든 카드로 풀어볼 수 있어요    │
│                                          │
└─────────────────────────────────────────┘
   클릭 → /manage/content
```

요소:
- 루트는 `<Link>` (Next router prefetch) 또는 `<button onClick>` — Link 채택 (a11y + prefetch)
- 점선 border 유지, hover 시 border 색 진해짐 + bg 살짝 강조
- 중앙 정렬, 세로 패딩 키움 (현재 p-4 → 빈 상태만 py-8 정도)
- 아이콘 크기 키움 (Sparkles h-4 → h-8 또는 큰 + 아이콘)
- 카피: `첫 카드 만들기` (h2 label 강조) + `내가 만든 카드로 풀어볼 수 있어요` (helper)
- `aria-label="첫 카드 만들기"` 명시

### 2-2. 채워진 상태 (cards>0) — 명시적 버튼 + 그리드

```
┌─────────────────────────────────────────┐
│ [✦] 나만의 게임                          │
│     총 N장 — 메커닉별로 골라 풀어보세요  │
│                                          │
│ ┌─────────┐ ┌─────────┐                 │
│ │ 객관식  │ │ 빈칸    │                 │
│ │ 12장    │ │ 5장     │                 │
│ └─────────┘ └─────────┘                 │
│ ┌─────────┐ ┌─────────┐                 │
│ │ 타이핑  │ │ 매칭    │                 │
│ │ 3장     │ │ 0장     │                 │
│ └─────────┘ └─────────┘                 │
│                                          │
│  [ + 카드 더 만들기 ]  (full-width btn)  │
└─────────────────────────────────────────┘
```

요소:
- 헤더 부제는 현재 `내가 만든 카드로 풀어볼 수 있어요` → `총 N장 — 메커닉별로 골라 풀어보세요` (정보성)
- 헤더 우측 상단의 작은 `+ 카드 만들기` 텍스트 링크 **제거**
- 그리드 하단에 **full-width outline 버튼** 추가: `+ 카드 더 만들기` → `/manage/content`
  - 그리드보다 시각 weight 낮게(outline + 점선 또는 border-hairline), 단 hit target 은 큼

### 2-3. 결정점 D1 — 채워진 상태 추가 CTA 위치

| 옵션 | 설명 | trade-off |
|---|---|---|
| **A (추천)** | 그리드 하단 full-width outline 버튼 | 그리드와 헤더 분리, hit target 큼, 추가 진입이 자연스러운 다음 동작으로 노출 |
| B | 그리드 첫 슬롯을 "+ 새 카드" dashed 카드로 대체 | 메커닉 카드와 시각 동질, 그러나 4개 메커닉 자리 차지 → 5번째 셀로 늘어나거나 1개 메커닉 누락 |
| C | 헤더 우측 작은 outline 버튼 유지 | 변화 최소, 그러나 사용자 피드백("작은 링크 약함") 미해결 |

→ **A** 추천. B는 그리드 4셀 안정성 깨짐, C는 본 피드백 미해결.

---

## 3. 작업 항목 (자가 검증 체크리스트) — 2026-05-14 완료

- [x] `CustomGamesSection.tsx` — 빈 상태를 `<Link href="/manage/content">` 루트로 변경, 전체 영역 클릭 가능
- [x] `CustomGamesSection.tsx` — 빈 상태 아이콘 크기 확대 (h-12 w-12 box + PlusCircle h-7) + 카피 `첫 카드 만들기` + py-8 세로 여백
- [x] `CustomGamesSection.tsx` — 빈 상태 hover (border-type-primary/50 + bg-bg-shell/40) + focus-visible ring + active scale
- [x] `CustomGamesSection.tsx` — 빈 상태 `aria-label="첫 카드 만들기"` 부여
- [x] `CustomGamesSection.tsx` — 채워진 상태 헤더 우측 상단 `+ 카드 만들기` 텍스트 링크 제거
- [x] `CustomGamesSection.tsx` — 채워진 상태 헤더 부제를 `총 N장 — 메커닉별로 골라 풀어보세요` 로 변경
- [x] `CustomGamesSection.tsx` — 채워진 상태 그리드 하단에 full-width `+ 카드 더 만들기` outline (dashed border + Plus icon) 버튼 추가
- [x] e2e: 빈 상태 영역 클릭 → `/manage/content` navigation 검증
- [x] e2e: 채워진 상태 `+ 카드 더 만들기` 버튼 클릭 → `/manage/content` navigation 검증
- [x] 키보드 검증 e2e — 빈 상태 Tab focus + Enter 진입
- [x] `bun run typecheck` PASS / `bun run test` 134/134 PASS
- [ ] 시각 검증: 모바일(360px) + 데스크탑(lg) 레이아웃 — 실기기 사용자 확인 필요

---

## 4. 영향 범위

| 파일 | 변경 |
|---|---|
| [src/components/game-hub/CustomGamesSection.tsx](src/components/game-hub/CustomGamesSection.tsx) | 빈 상태 전체 link 화, 채워진 상태 헤더 링크 제거 + 하단 버튼 추가 |
| `e2e/custom-games-cta.spec.ts` (신규) | 빈/채워진 클릭 navigation 검증 |

**변경 없음**: `/manage/content`, `/manage/custom-games`, `loadCounts`, registry, 라우트 구조

---

## 5. 비고 / 리스크

- **리스크**: 빈 상태에서 영역 전체가 클릭되면, 영역 내부에 추가 인터랙티브 요소(예: 향후 "도움말" 링크 등)를 넣기 어려움 → 빈 상태는 의도적으로 단일 액션만 노출. 미래 추가 액션 필요 시 그때 재설계
- **리스크**: 영역 전체 hit target 이 커지면, 의도치 않은 클릭(스크롤 중 터치 등) 우려 → focus-visible/active state 명확히, 모바일에서는 active scale-down 등으로 클릭 피드백 강화
- **a11y**: `<Link>` + `aria-label` 조합 — 스크린리더에 "첫 카드 만들기 링크"로 읽힘. 별도 텍스트 노드가 있으므로 aria-label 중복 발화 주의 (필요 시 aria-labelledby 로 명시)
- **i18n**: 카피 한국어 고정. 향후 i18n 도입 시 키 추출 필요 — 본 작업 범위 외
