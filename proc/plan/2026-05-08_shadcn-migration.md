# 디자인 시스템 — shadcn/ui 전면 마이그레이션

DRAFT · 2026-05-08

## 0. 컨텍스트 / 사용자 페인

사용자 피드백 (2026-05-08, [filter-accordion plan](../archive/plan/2026-05-08_filter-accordion.md) 직후):

> 아코디언을 열었더니 대문짝만한 뱃지가 튀어나와서 경악을 금치 못해서야. 너무 못생겼잖아. 주변 텍스트 크기랑도 위계나 조화도 안맞고.

진짜 원인: primitive 컴포넌트가 없음. 매 페이지에서 `<button className="rounded-button border ...">` 인라인 작성 → 위계 일관성이 코더 의지에 달려있음. 시각 시스템 부재.

해결책: shadcn/ui 도입 + 모든 사용자 화면을 shadcn 컴포넌트로 교체.

## 1. 목표

1. shadcn/ui 인프라 도입 (`components.json`, Radix deps, `src/components/ui/`)
2. 모든 사용자 화면을 shadcn 컴포넌트로 마이그레이션
3. 즉시 시각 개선: 필터 아코디언 chip → shadcn ToggleGroup (위계 정렬)
4. 인라인 className 패턴 → primitive 컴포넌트 흡수

비목표:
- 게임 내부 UI (`/games/[gameId]/*`) — 회귀 위험, 별도 plan
- 다크모드 — V2 (shadcn CSS variable 전환과 함께)
- Storybook — V2

## 2. 인프라 셋업 (Phase 1 일부)

- `bunx shadcn@latest init` — components.json 생성
- base color: slate (현 토큰과 호환)
- style: new-york (절제된 outline 위주)
- React Server Components: yes
- `src/components/ui/` 표준 위치
- 기존 `cn()` 헬퍼 재사용 ([src/lib/utils.ts](../../src/lib/utils.ts))
- globals.css 변경은 최소화 — shadcn 기본 CSS variable 추가만, 기존 Tailwind 토큰은 그대로

토큰 정책:
- 기존 풀림 토큰 (`text-helper`, `bg-bg-block`, `border-border-hairline`, `accent-positive`, `pullim-slate-*`) 모두 유지
- shadcn 기본 색 (primary/secondary/muted/destructive 등) 은 풀림 토큰으로 매핑하지 않음 — 매 사용처에서 className override

## 3. 도입할 shadcn 컴포넌트

| 컴포넌트 | 사용처 |
|---|---|
| Button | 모든 버튼 |
| Card / CardHeader / CardTitle / CardContent | 카드 컨테이너 |
| Input | 텍스트 입력 |
| Textarea | RawMaterialInput |
| Label | 폼 레이블 |
| Select | 드롭다운 (SubjectCurriculumPicker, GenerateButton count) |
| Badge | KIND_LABEL, 진행도 |
| Separator | 섹션 구분 |
| Accordion | FilterContents |
| ToggleGroup | 필터 chip, MechanicPicker, ModeToggle |
| RadioGroup | InlineEditor 정답 선택 |
| Checkbox | PreviewCard 선택 |
| Sheet | FilterSheet (모바일 drawer) |
| Alert | GenerationProgress (에러/info) |
| Tooltip | 잠금/힌트 |

## 4. 화면 매핑

| 화면 | 핵심 변경 |
|---|---|
| `/` 홈 | KPICard / GameStatCard / UntouchedGamesGrid → Card + Badge |
| `/games` 사이드바 | FilterContents → Accordion + ToggleGroup |
| `/games` 모바일 | FilterSheet → Sheet |
| `/games` 결과 | GridView 등 4종 — Card 베이스로 통일 |
| `/manage` 인덱스 | 메뉴 카드 → Card + Button |
| `/manage/content` | MechanicPicker / ModeToggle → ToggleGroup, SubjectCurriculumPicker → Select, RawMaterialInput → Textarea + Label, GenerateButton → Button, GenerationProgress → Alert, PreviewCard → Card + Checkbox |
| `/manage/subjects` | Input + Button + Card |
| `/manage/curriculum` | Input + Button + Card |
| `/manage/custom-games` | Card 그리드 |
| `/about` | 정적 — Card 만 적용 |
| Shell (sidebar/header) | **변경 없음** — slate 팔레트 + 검증된 패턴 유지 |
| `/games/[gameId]` 내부 | **변경 없음** — 게임 mechanic 컴포넌트는 별도 plan |

## 5. Phase 분할

각 phase: 독립 commit, typecheck/lint/test/build 모두 통과 후 다음.

### Phase 1 — 인프라 + 기본 primitive
- shadcn init
- 추가: Button, Card, Input, Label, Textarea, Badge, Separator
- 사용처 0 (라이브러리 등록만)

### Phase 2 — 필터 시스템 (사용자 메인 페인 해소)
- 추가: Accordion, ToggleGroup, Sheet
- FilterContents → shadcn Accordion + ToggleGroup
- FilterSheet → shadcn Sheet
- 시각적으로: chip 크기 축소 (`size="sm"` + `text-xs`) → 헤더-바디 위계 정상

### Phase 3 — 관리 (자료 → 카드 자동 생성)
- 추가: Select, Checkbox, RadioGroup, Alert
- MechanicPicker / ModeToggle → ToggleGroup
- SubjectCurriculumPicker / CurriculumPicker → Select
- RawMaterialInput → Textarea + Label
- GenerateButton → Button + Select
- GenerationProgress → Alert
- PreviewCard → Card + Checkbox + Button(icon)
- /manage/subjects, /manage/curriculum 폼 → Input + Button

### Phase 4 — 홈 + 게임 허브 결과뷰
- 홈 KPI/GameStatCard / UntouchedGamesGrid → Card + Badge
- /games 결과 뷰 4종 → Card 통일
- /manage 인덱스 + /manage/custom-games → Card

### Phase 5 — 잔여 + 정리
- /about
- 잔여 인라인 button/input/select 패턴 정리
- typecheck/lint/test/build 최종

## 6. 사용자 페인 직접 해소 (Phase 2 세부 설계)

### 현재 (chip)
```html
<button class="rounded-button border px-2.5 py-1 text-helper">전체</button>
```
- text-helper = 14px (헤더와 동일)
- px-2.5 py-1 ≈ box 28px 높이
- 시각적으로 chip box 가 묵직 → 헤더-바디 위계 어긋남

### shadcn 후
```tsx
<ToggleGroup type="single" size="sm" className="flex-wrap justify-start">
  <ToggleGroupItem value="all" className="h-7 px-2.5 text-xs">전체</ToggleGroupItem>
</ToggleGroup>
```
- text-xs = 12px (헤더 14px 보다 작음 → list-item 위계)
- h-7 = 28px 고정
- shadcn outline = 절제된 border + hover 일관성

체감 효과: chip 이 헤더 안 list-item 처럼 보임. 헤더-바디 시각 위계 정상화.

## 7. 검증 기준

각 phase:
- [ ] typecheck 0 error
- [ ] lint 0 warning
- [ ] test 100% green
- [ ] build success
- [ ] phase 가 다루는 모든 화면 200
- [ ] 시각 회귀 없음 (개선만)

전체:
- [ ] /, /games, /manage, /manage/content, /manage/subjects, /manage/curriculum, /manage/custom-games, /about 모두 200
- [ ] 인라인 button/input/select 패턴 → primitive 로 흡수
- [ ] 필터 아코디언 chip 위계 정상

## 8. 리스크 / 대응

| 리스크 | 대응 |
|---|---|
| shadcn init 이 globals.css 덮어쓸 수 있음 | init 전 백업, 추가만 허용 (덮어쓰기 X) |
| Radix portal (Sheet/Dialog) 는 client only | 이미 use client 적용된 컴포넌트만 |
| 토큰 충돌 (shadcn primary vs 풀림 accent) | className override 정책 — shadcn 기본색 안 쓰기 |
| 번들 크기 증가 | 사용 컴포넌트만 추가, tree-shaking 신뢰 |
| 게임 내부 회귀 | 손대지 않음 (비목표 명시) |

## 9. 진행 순서

1. Phase 1 (인프라)
2. Phase 2 (필터 — 즉시 페인 해소)
3. Phase 3 (관리)
4. Phase 4 (홈 + 결과뷰)
5. Phase 5 (잔여)
6. plan archive
