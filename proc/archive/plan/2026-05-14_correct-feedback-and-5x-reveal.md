# 전 게임 공통: 정답 시각 피드백 + 5회 오답 시 정답 공개

## 배경

`proc/audit/2026-05-14_games-catalog-audit.md` 시점에 21개 게임 전수 점검을 했지만, 모든 게임이 **정답을 맞춰도 텍스트(sr-only 또는 작은 색상 변화)만 알리는** 상태. 사용자가 "내가 맞췄나? 맞췄었네?" 라고 자문해야 할 정도로 정답 이벤트 시각 피드백이 빈약함. 또한 같은 문제를 반복적으로 못 풀어도 학습이 멈추지 않도록, 5회 누적 오답 시 정답을 자동 공개해야 함.

## 목표

- 21개 게임 전부, 정답 처리 시점에 **즉시 알아챌 수 있는 공통 시각 피드백** (CorrectBurst) 노출
- 같은 카드를 **5회 연속 wrong** 한 경우 자동으로 정답 공개 + 다음 카드로 이동

## 결정 사항 (갈래 묻지 않음)

1. **5회 룰의 "한 번"**: 같은 세션 내에서 같은 카드에 대한 wrong 제출 1회. retry 불가능한 1회 시도 게임 (QuickQuiz, BlankComponent) 은 이미 wrong 1회로 정답이 노출되므로 룰 대상 외 — CorrectBurst만 추가.
2. **세션 영구성**: 카운터는 in-memory only (페이지 이탈/새로 시작 시 reset). FSRS lapse 와 무관.
3. **공개 UI**: 카드 위에 "5번 시도했어요. 정답을 보여줄게요" 라벨 + 정답을 게임별 자연 UI 로 표시 (slot 에 정답 카드 미리 채움 / typing 에 정답 입력 / 매칭 페어 그어주기). 학생이 "맞췄어요" 버튼 누르면 다음 카드.
4. **변별력 정책과 충돌**: audit §3 의 "답지 노출 회피" 는 학생이 시도하는 동안 유지. 5회 시도 후엔 학습 차단보다 답 노출이 학습 효과 측면에서 더 나음 (사용자 명시 의도). audit/memory 메모는 본 plan 머지 시점에 갱신.
5. **CorrectBurst 강도**: scale spring + 체크 아이콘 + accent-positive 글로우 펄스 0.45s. 너무 화려한 confetti/사운드는 V0.1 polish 라운드로 보류 (하이퍼캐주얼 톤 유지).

## 작업 항목

### A. 공통 인프라
- [x] `src/components/ui/CorrectBurst.tsx` 신규 — 체크 아이콘 + scale spring + glow pulse 0.45s. 정답 처리 직후 절대 위치 overlay 로 띄움. framer-motion `AnimatePresence` 로 mount/unmount.
- [x] `src/components/ui/RevealBanner.tsx` 신규 — "5번 시도했어요. 정답을 보여줄게요" 라벨 + accent 톤. 게임이 정답 UI 채우기를 책임지고, 본 컴포넌트는 라벨 + "다음" CTA 만 제공.
- [x] `src/lib/core/useAttemptCounter.ts` 신규 — `useAttemptCounter(cardId, threshold=5)` → `{ wrongCount, shouldReveal, recordWrong, reset }`. cardId 변경 시 자동 reset.
- [x] `src/lib/core/index.ts` 에 export 추가.

### B. 공통 메커니즘 컴포넌트 4개 통합
- [x] `src/components/game-mechanics/QuickQuizComponent.tsx` — feedback phase 진입 시 정답이면 `<CorrectBurst />` mount. 5회 룰 미적용 (1회 시도 종결).
- [x] `src/components/game-mechanics/BlankComponent.tsx` — 동일. 5회 룰 미적용.
- [x] `src/components/game-mechanics/TypingComponent.tsx` — 정답 시 CorrectBurst. wrongCount 5회 도달 시 RevealBanner + 정답 텍스트 입력란에 표시 + "다음" CTA.
- [x] `src/components/game-mechanics/WordMatchComponent.tsx` — 페어 매칭 성공 시 CorrectBurst (페어별). 세션 전체 wrongCount 5회 누적 시 남은 모든 페어 자동 그어주기 + RevealBanner.

### C. 개별 게임 12개 통합
공통 패턴: (1) 정답 확인 phase 시 정답이면 CorrectBurst, (2) `useAttemptCounter(card.id)` 부착, (3) `shouldReveal` true 시 RevealBanner + 정답 UI 채우기 + "다음" CTA.

- [x] factorization (drag block) — reveal 시 정답 블록을 drop zone 에 자동 배치
- [x] math-graph-shift (slider) — reveal 시 정답 슬라이더 위치로 이동
- [x] physics-vector (slider) — 동일
- [x] chemistry-balance (counter) — reveal 시 정답 계수 표시
- [x] genetics-punnett (grid+input) — reveal 시 정답 칸 채우기
- [x] letter-assembly (카드 슬롯) — reveal 시 정답 카드 슬롯 배치
- [x] history-timeline (드래그) — reveal 시 정답 순서로 정렬
- [x] english-order (드래그) — 동일
- [x] bio-taxonomy (드래그 분류) — reveal 시 모든 카드 정답 zone 으로 이동
- [x] image-hotspot (영역 탭) — reveal 시 정답 영역 highlight
- [x] korean-pos-tagging (토큰 태깅) — reveal 시 정답 품사 자동 태깅
- [x] cloze-multi (빈칸 + 카드) — reveal 시 정답 카드 빈칸에 배치

### D. 정책/문서 갱신
- [x] `proc/audit/2026-05-14_games-catalog-audit.md` §3 "변별력 정책" 에 5회 임계값 후 reveal 예외 추가.
- [x] memory `feedback_design_priorities.md` 또는 신규 메모: "오답 N회 누적 시 답 노출은 학습 효과 우선" 결정 기록.

### E. 자가검증
- [x] `bun run typecheck` PASS
- [x] `bun run test` — 149/149 PASS (회귀 0). UI/hook 단위 테스트는 본 레포 컨벤션 (vitest coverage = `lib/core/**` + `games/*/logic/**` 만) 에 맞춰 생략. CorrectBurst/RevealBanner/useAttemptCounter 는 UI 영역.
- [x] e2e 1건 신규 — `e2e/correct-feedback-reveal.spec.ts` (PR #47 동봉, vocab-typing 5회 wrong → RevealBanner + 정답 자동 입력 + 다음 활성) PASS
- [ ] manual: 4개 메커니즘 + 12개 개별 게임 정답 시 CorrectBurst 노출 확인 (사용자 `vercel --prod` 수동 배포 후 dogfooding 단계 — daily_outcome 2026-05-15 참조)
- [ ] manual: typing 게임에서 5회 오답 → reveal 동작 확인 (사용자 dogfooding 단계 — daily_outcome 2026-05-15 참조)

→ 코드/CI 자가검증 완료. manual dogfooding 2건은 사용자 production 배포 후 시점으로 위임. 본 plan 은 ACCEPTED + archive 이관.
