# 2026-05-19 — Plan F: window.confirm → shadcn AlertDialog 통일

- **상태**: DRAFT (2026-05-19) — §1 합의 대기 → 1 PR 진행.
- **트리거**: audit v3 §7 informational 잔존. `subjects/page.tsx:68` + `curriculum/page.tsx:130` 2 호출처 native `window.confirm` 사용. 다른 페이지·게임은 shadcn 디자인 시스템 일관. 모바일 UX·디자인 시스템 일관성 결.
- **메모리 룰**: 외재 보상 회피·하이퍼캐주얼. AlertDialog 자체는 destructive action 확인 — 디자인 톤 일관성만 영향.
- **연관**: `proc/spec/08-디자인-시스템.md`, shadcn/ui 패턴.

## 0. 현 상태

```
src/app/manage/subjects/page.tsx:68
  → !window.confirm("이 과목과 하위 카드를 모두 삭제할까요?")

src/app/manage/curriculum/page.tsx:130
  → !window.confirm("이 단원과 하위 단원·카드를 모두 삭제할까요?")
```

다른 모든 alert·confirm은 shadcn `AlertDialog` 사용 또는 자체 UI. 이 2건만 native.

## 1. 추천 — shadcn `AlertDialog` 마이그레이션

shadcn/ui 의 `AlertDialog` 컴포넌트 (`@radix-ui/react-alert-dialog` 기반) — 이미 의존성에 있음 (`@radix-ui/react-dialog ^1.1.15`). `AlertDialog` 별도 의존성 추가 필요.

### A. 패턴
- `subjects` · `curriculum` 각각 useState `confirmDelete: {id, label} | null` 추가
- 삭제 버튼 클릭 → `setConfirmDelete({id, label})`
- `AlertDialog` 모달에서 "삭제" / "취소" — 사용자가 "삭제" 클릭 시 실제 삭제
- 모달 close → `setConfirmDelete(null)`

### B. 공통 컴포넌트 추출
`src/components/manage/ConfirmDeleteDialog.tsx` 신규 — `{open, onOpenChange, title, description, onConfirm}` props. subjects·curriculum 양쪽에서 재사용.

## 2. 결정점

### D1 — AlertDialog 도입 방법
- **(A 추천)** `@radix-ui/react-alert-dialog` 의존성 추가 + shadcn `alert-dialog.tsx` 컴포넌트 등록. 디자인 시스템 표준.
- (B) 자체 modal 컴포넌트 — 의존성 없이.

→ A 채택. 기존 shadcn 패턴 일관.

### D2 — 공통 컴포넌트 추출
- **(A 추천)** `ConfirmDeleteDialog` 신규 — 2 호출처 재사용.
- (B) 각 페이지에 inline `AlertDialog`.

→ A 채택. 잠재적 재사용 (커스텀 게임 삭제·콘텐츠 삭제 등).

### D3 — 라벨 톤
- **(A 추천)** 기존 라벨 유지 ("이 과목과 하위 카드를 모두 삭제할까요?") + AlertDialog title "삭제 확인" + description 기존 라벨 + 액션 버튼 "삭제" (destructive)·"취소".
- (B) 더 강한 경고 톤 ("⚠️ 되돌릴 수 없습니다").

→ A 채택. 메모리 룰 하이퍼캐주얼 — 과도한 경고 회피.

## 3. 작업 항목

### Phase 1 — 1 PR
- [ ] `bunx shadcn add alert-dialog` (또는 수동 컴포넌트 추가)
- [ ] `package.json` `@radix-ui/react-alert-dialog` 의존성 추가
- [ ] `src/components/ui/alert-dialog.tsx` 신규 (shadcn 표준)
- [ ] `src/components/manage/ConfirmDeleteDialog.tsx` 신규 — wrapper
- [ ] `subjects/page.tsx` `window.confirm` → `ConfirmDeleteDialog`
- [ ] `curriculum/page.tsx` 동일 마이그레이션
- [ ] e2e — 삭제 확인 다이얼로그 노출·취소·확정 3 spec
- [ ] `bun run ui:audit /manage/subjects` `/manage/curriculum` ✅ 검증

## 4. 비스코프

- 다른 destructive action (custom 게임 삭제·콘텐츠 삭제) — 본 plan 영향 영역에서만. 후행 마이그레이션은 별 트랙.

## 5. 영향도

| 영역 | 변경 | LOC |
|---|---|---|
| `package.json` | radix-alert-dialog 추가 | +1 |
| `src/components/ui/alert-dialog.tsx` (신규 shadcn) | 표준 wrapper | ≈80 |
| `src/components/manage/ConfirmDeleteDialog.tsx` (신규) | 공통 컴포넌트 | ≈40 |
| `subjects/page.tsx` · `curriculum/page.tsx` | window.confirm 교체 | +30/-4 |
| e2e | 3 spec 신규 | ≈40 |

→ 총 ≈+190 LOC.
