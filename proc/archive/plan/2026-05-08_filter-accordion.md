# 게임 허브 필터 — 칩 → 아코디언

DRAFT · 2026-05-08

## 0. 컨텍스트

`/games` (게임 허브) 의 필터 영역이 세로 공간을 너무 많이 차지한다.

현재 [src/components/game-hub/FilterContents.tsx](src/components/game-hub/FilterContents.tsx) 는 5개 카테고리(과목·메커닉·깊이·세션 시간·진행도) 를 항상 펼친 상태로 chip 을 나열. 데스크탑 sidebar 폭 220px 안에서 chip 들이 wrapping 되며 검색 + 초기화까지 합쳐 ~14줄 분량.

사용자 요청 (2026-05-08): "필터 영역이 불필요하게 많은 부분을 차지" → 뱃지(chip) 형태가 아닌 아코디언 형태로 압축.

## 1. 목표

5개 chip 그룹을 아코디언 헤더 5줄로 압축. 사용자가 헤더를 클릭해야 chip 이 펼쳐짐. 검색 + 초기화는 항상 노출.

기본 상태 세로 공간 약 50% 이상 감소.

## 2. UX 설계

### 2.1 아코디언 1 항목 구조

닫힘:
```
┌─────────────────────────────────────────┐
│ 메커닉                  객관식  ▾       │
└─────────────────────────────────────────┘
```

펼침:
```
┌─────────────────────────────────────────┐
│ 메커닉                  객관식  ▴       │
├─────────────────────────────────────────┤
│ [전체] [객관식] [빈칸] [타이핑] [매칭]  │
└─────────────────────────────────────────┘
```

**헤더 구성**
- 좌: 카테고리명 (font-bold text-helper text-type-secondary)
- 우: 선택값 라벨 (전체 = 비표시) + chevron 아이콘
- 헤더 자체가 button (full-width). aria-expanded 토글
- 적용된 카테고리는 헤더 우측에 작은 jade 닷 또는 라벨 노출

**바디 구성**
- 기존 ChipGroup 그대로 (단순 mount/unmount, 애니메이션 X — 속도 우선)

### 2.2 펼침 정책

- **단일 펼침**. 한 카테고리 펼치면 직전 펼침은 자동 닫힘
- 이유: 압축이 의도. 다중 펼침 = 공간 재차지
- 마운트 시 전부 닫힘 (필터 적용 여부와 무관)
- chip 선택해도 자동 닫힘 X — 같은 카테고리 안 여러 시도 가능
- 적용 필터가 0개일 때는 펼침 시작 카테고리 없음

### 2.3 검색 / 초기화

- 검색 input: 아코디언 위, 항상 노출 (변경 없음)
- 필터 초기화 버튼: 아코디언 아래, 항상 노출
- 적용 필터 0개면 초기화 버튼 disabled

## 3. 컴포넌트 변경

### 3.1 수정

`src/components/game-hub/FilterContents.tsx`
- `ChipGroup` 그대로 유지 (재사용)
- 5 그룹을 아코디언 helper 로 감싸기
- 단일 펼침 state: `useState<FilterKey | null>(null)`
- 카테고리별 "선택값 라벨" 매핑 함수 추가:
  - 과목: subjectOptions 에서 value→label 조회
  - 메커닉/깊이/세션 시간/진행도: 각 OPTIONS 배열에서 매칭
- 새 helper component `AccordionItem` (동일 파일 내):
  - props: `label`, `summary?`, `isOpen`, `onToggle`, `children`
  - lucide ChevronDown 회전 (rotate-180 when open)

### 3.2 무변경

- `FilterSheet.tsx` (모바일 drawer) — FilterContents 그대로 사용. 아코디언이 drawer 안에서도 동일 동작
- `GameHubPage.tsx`
- `src/lib/games/filter.ts`
- URL sync 로직

## 4. 시각/접근성

- header button: `aria-expanded`, `aria-controls={bodyId}`
- body: `id={bodyId}`, `role="region"`
- chevron: `transition-transform`, `aria-hidden`
- 키보드: Tab → 헤더 포커스, Enter/Space → 토글
- 사이드바 `sticky top-12` 유지

## 5. 압축 효과 (대략)

| 영역 | 현재 | 아코디언 (모두 닫힘) |
|---|---|---|
| 검색 input | 1줄 | 1줄 |
| 과목 | 3줄 (chip wrap) | 1줄 |
| 메커닉 | 2줄 | 1줄 |
| 깊이 | 2줄 | 1줄 |
| 세션 시간 | 3줄 | 1줄 |
| 진행도 | 2줄 | 1줄 |
| 초기화 | 1줄 | 1줄 |
| **합계** | **~14줄** | **~7줄** |

펼침 1개 추가시 ~10줄. 압축 의도 충족.

## 6. 검증 기준

- [ ] 데스크탑 사이드바 세로 길이 눈에 띄게 줄어듦
- [ ] 헤더 클릭 → 해당 카테고리 펼침/접힘
- [ ] 다른 카테고리 펼치면 직전 카테고리 자동 닫힘
- [ ] 적용된 선택값이 닫힌 헤더에 표시 (전체는 표시 안 함)
- [ ] 검색 + 초기화는 항상 노출
- [ ] 모바일 drawer 안에서도 아코디언 정상 동작
- [ ] URL `?subject=…` 등 sync 그대로
- [ ] typecheck/lint/test/build pass
- [ ] /games 200, 모든 뷰 (grid/list/table/thumbnail) 정상

## 7. 구현 단계

1. 본 plan 승인
2. FilterContents.tsx 안에 `AccordionItem` helper 추가
3. 5 ChipGroup 을 아코디언으로 감싸고 단일 펼침 state 도입
4. 선택값 라벨 매핑 helper
5. typecheck/lint/test/build
6. dev 서버에서 /games 데스크탑 + 모바일 양쪽 확인
7. 커밋 + push
8. plan archive

## 8. 결정 (한 번에 가는 갈래들)

- 펼침: **단일** (압축 우선)
- 애니메이션: **chevron 회전만**, body slide 는 V2
- 위치: FilterContents 내부 helper. 별도 파일 분리는 재사용 필요해지면 V2
- 모바일 동일 적용: **예** (drawer 안에서도 아코디언)
