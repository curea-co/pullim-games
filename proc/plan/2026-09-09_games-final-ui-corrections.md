> 기록 범위: 아래는 허브 UI·확장 문제 데이터가 함께 있던 원래 작업 폴더의 과거 검증 기록입니다. 이 독립 dev PR의 포함 범위와 검증 결과는 `2026-09-09_solving-dev-pr.md`를 따릅니다.

# CUR-17·19·21 마지막 UI 보정

최신 상태(2026-09-09): 사용자 승인으로 CUR-21의 이번 구현 완료 기준을 ‘1차 자료 대조 + AI 내용 검수 + 자동 테스트’로 확정했고 모두 충족했다. CUR-21은 완료 처리한다. 사람 전문가의 교육과정 검수는 출시 전 별도 조건이다. 아래 전문 검수 대기/In Progress 표기는 기준 변경 전 경과 기록이며, 최신 검수 결과는 `2026-09-09_cur-21-subject-review.md`를 따른다.

## 작업 계약

목표: 승인된 허브·공통 풀이 후속 작업 중 시간/완료 상태, 신규 사용자 복습 5장, 도해·한자 표현을 마무리한다. 비목표: 문제 생성(CUR-16 포함), 계정·API 변경, 운영 배포. 대상은 games 단일 저장소다. 수용 기준은 이슈별 재현 해소와 실제 게스트 흐름 검증이며 CUR-21의 전문 교과 검수는 자동 검증과 분리한다.

기준: `/Users/taegwonson/Desktop/curea/games`, `feat/games-json-content`, HEAD `6ee94b0f4c20ab26960205150828fa661f8b96d6`. 기존 dirty 파일 해시는 `/tmp/cur-final-baseline.json`. 이번 작업에서 기존 content JSON 및 content/index.ts 변경 0건을 확인했다. CodeGraph sync 후 관련 컴포넌트와 호출 관계를 확인했다. 구현 전 대화에서 표시 계층 보정과 시간 상태 보존 방안을 제시하고 사용자의 진행 승인을 적용했다.

## 변경 파일과 동작

- `apps/games/components/game-mechanics/TimeAttackTimer.tsx`: active 재진입으로 기한을 연장하지 않는다. 새 카드/회차 키가 바뀔 때만 초기화한다.
- 같은 디렉터리의 `QuickQuizComponent.tsx`, `BlankComponent.tsx`, `TypingComponent.tsx`, `WordMatchComponent.tsx`: 회차·카드 키를 전달한다. 타이핑 지연 콜백을 정리하고 매칭 완료 후 시간 초과/보너스 조작이 SRS 결과를 다시 저장하지 않게 한다.
- `apps/games/lib/core/fsrs/modes/select-for-mode.test.ts`: 카드 수 0/1/4/5/6/12 × 신규/기존 기록 경계 검증. 제품 수정은 CUR-23에서 적용한 직접 구현 12종의 selector 호출을 유지했다.
- `apps/games/games/image-hotspot/{component.tsx,components/PlantDiagram.tsx,components/HotspotCanvas.tsx,components/presentation.ts}`: 줄기 조직 순서, 뿌리털 위치, 알려진 문항의 힌트와 라벨 지시선을 표시 계층에서 보정했다. 작은 화면의 라벨 간 중첩을 없앴다.
- `apps/games/games/letter-assembly/{component.tsx,components/SlotRow.tsx,schema.ts}`: 森을 위 1개/아래 2개로 배치하고 休의 人→亻 표시와 설명을 추가했다. 잘못 놓인 다른 글자는 변형하지 않는다. schema 변경은 주석뿐이다.
- 신규 테스트: `timer-deadline.test.tsx`, `anatomy.test.tsx`, `presentation.test.ts`, `layout.test.tsx`, `e2e/timer-deadline.spec.js`, `e2e/learning-diagrams.spec.js`. 야간 E2E 목록에도 신규 두 시나리오 파일을 연결했다.

## 생성 담당과의 호환 조건

정답 ID, 카드 순서, 생성 데이터, 채점 계약을 바꾸지 않는다. 도해 좌표 어댑터는 명시된 cardId/diagramId/regionId 조합만 처리하며 알 수 없는 문항은 원래 bbox를 사용한다. batch 루트의 r-1/r-2 매핑을 다른 도해에 일반화하지 않는다. 기존 줄기/뿌리 힌트 원문은 보존하고 알려진 카드의 표시만 보정한다. 향후 생성 문항은 도해와 영역의 일치 및 힌트를 별도로 검수해야 한다. 한자는 森과 休만 명시적으로 처리하며 다른 상하/포위 구조를 자동 추정하지 않는다.

## 내용 근거와 남은 검수

1차 자료: [OpenStax 줄기](https://openstax.org/books/biology/pages/30-2-stems), [OpenStax 뿌리](https://openstax.org/books/biology-ap-courses/pages/23-3-roots), [대만 교육부 森](https://dict.variants.moe.edu.tw/dictView.jsp?educode=A01960), [대만 교육부 休](https://dict.variants.moe.edu.tw/dictView.jsp?ID=936&powerMode=2).

FACT / STATIC_INSPECTED: 소스 교차 확인과 독립 코드 검수를 했다. 꽃받침 지시선이 도형 사이 빈 공간을 가리킨다는 독립 검수 지적을 실제 SVG path 내부 판정 테스트로 재현하고 [44,89]로 보정했다. 재검수 잔여 지적 없음. 이것은 전문 교과 검수가 아니다.

OPEN QUESTION: 생물 도해·한자 자형의 전문 검수 담당/결과가 아직 없다. CUR-21의 ‘전문검수 미완료면 완료표시금지’에 따라 In Progress로 유지한다. CUR-17·19는 기술 수용 기준을 충족했다.

## 검증 및 최초 실패 경계

- 타이머 Red `/tmp/cur17-unit-red.log` → 관련 공유 단위 76개 Green `/tmp/cur17-unit-green.log`. 원래 기한 유지·동일 키 재활성화 중복 만료 방지·새 키 초기화를 확인했다.
- 도해/자형 Red 4개 `/tmp/cur21-red.log` → Green `/tmp/cur21-green.log`. 꽃받침 실제 SVG 내부 판정은 `/tmp/cur21-anchor-red.log`에서 false로 실패했다가 최종 E2E에서 통과했다.
- CUR-19 경계 `/tmp/cur19-boundaries.log` 통과. 12종 실제 게스트 복습 5장 진입/완주는 `2026-09-09_cur-23-official-sessions.md`의 기존 Red/Green 증거를 재사용한다. 해당 문서의 중간 상태는 과거 기록이다.
- 최종 E2E `/tmp/cur-final-e2e.log`: 5개 통과. 도해·한자 각각 기존/신규 총 10장 320폭에서 라벨·44px 최소 영역·겹침·정답·완주, 타이핑 2종 오답 후 원래 기한 유지, 매칭 부분 성공 후 기한 유지 및 완료 뒤 60초 경과에도 저장 1회.
- 중간 매칭 E2E 실패는 타이머 준비 전 가상 시간을 넘긴 테스트 순서 문제로 30s 준비 확인과 RAF 실행을 추가했다. 힌트 실패는 실제 ‘힌트 ·’ 접두사와 기대 문자열 차이였다. 이를 제품 오류로 주장하지 않는다.
- root `bun run test`: 60 files / 589 tests 통과(`/tmp/cur-final-unit.log`). `bun run typecheck` 통과(`/tmp/cur-final-types2.log`). `bun run lint` 통과(`/tmp/cur-final-lint2.log`, 기존 warning 1개). 최초 lint의 신규 unused import는 제거했다.
- root `bun run build` exit 0(`/tmp/cur-final-build.log`). 빌드 전 dev를 중지했고 이후 표준 `bun run dev`로 재시작했다.
- 7종 × 4 viewport audit 모두 pass: math-quick-quiz, english-blank, english-word-match, vocab-typing, english-vocab-typing, image-hotspot, letter-assembly. 증거 `apps/games/output/playwright/cur-final/<game>/audit.json`. 320×568 / 390×844 / 768×1024 / 1280×800. 첫 화면 감사이며 모든 중간 상태를 네 크기로 완주한 증거는 아니다.
- 변경된 기존 도해/자형 결과 화면은 `apps/games/output/playwright/cur21/` PNG로 별도 확인했다. 실제 게스트 UI 및 브라우저 localStorage 검증은 E2E_VERIFIED, 단위 mock 검증은 실제 서비스 검증과 구분한다.

미검증: 전문 교과 검수, 원격 CI 실행, 운영 배포, 문제 생성. 커밋·푸시·배포 없음. 복구가 필요하면 이번 표시/타이머 변경 hunk와 신규 파일만 역패치한다. 기존 dirty 파일 전체 복원/리셋은 금지한다.
