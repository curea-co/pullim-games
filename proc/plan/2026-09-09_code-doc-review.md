> 기록 범위: 아래는 허브 UI·확장 문제 데이터가 함께 있던 원래 작업 폴더의 과거 검증 기록입니다. 이 독립 dev PR의 포함 범위와 검증 결과는 `2026-09-09_solving-dev-pr.md`를 따릅니다.

# 기능별 코드·문서 정합성 리뷰

최신 보완: 재리뷰에서 감사 엔진 경계 오류 2건과 문서 불일치 3건을 추가 확인해 사용자 승인으로 수정했다. 아래 최초 리뷰의 ‘추가 확정 회귀 없음’은 당시 확인 범위의 기록이며, 문서 끝의 재리뷰 보완을 함께 따른다.

## 계약과 기준

목표: 이번 UI 구현의 기능별 코드 리뷰에 현재 안내 문서와 구현의 정합성도 포함한다. 발견된 화면 감사 누락과 확정된 문서 불일치를 수정한다. 비목표: 문제 생성/JSON 변경, 승인된 미래 요구사항 삭제, 과거 기록 전면 재작성, 새 기능 구현, 배포.

기준 저장소 `/Users/taegwonson/Desktop/curea/games`, `feat/games-json-content`, HEAD `6ee94b0f4c20ab26960205150828fa661f8b96d6`와 기존 미커밋 UI 변경. 기존 작업을 reset/checkout하지 않았다. CodeGraph를 sync한 후 관련 구조를 확인했다. 사용자 지시에 따라 Terra·medium 에이전트가 독립 UI 리뷰와 현재 README/명세 대조를 맡았고, main이 공유 상태·CI 및 결과를 통합 검토했다.

## 기능별 결과

| 기능 | 코드 검토 결과 | 문서 대조 |
| --- | --- | --- |
| 허브/추천/모드 진입 (CUR-14/20) | 5개 보기·GameEntry·지원 모드 판정에서 확정 회귀 없음 | 현재 모드 범위 및 설계와 구현 차이 반영 |
| 관리자 진입 (CUR-15) | 학습자 메뉴와 생성 CTA 숨김, 기존 URL 유지 확인 | 삭제가 아닌 노출 숨김으로 명시 |
| 타이머/재시도 (CUR-17/18) | deadline·회차 키·콜백 정리·보너스 이후 저장 보호 검토, 추가 확정 회귀 없음 | 설계상의 회차 분량 변경과 혼동하지 않게 구분 |
| 신규 사용자 복습 (CUR-19) | review-queue 최대 5장 및 초기 selector 호출 검토, 추가 확정 회귀 없음 | 모든 모드가 5장인 것으로 설명하지 않음 |
| 도해/한자 (CUR-21) | 카드별 지시선·fallback·森/休 표시 검토, 추가 확정 회귀 없음 | 실제 표시 좌표와 44px 영역, 자형 배치 반영 |
| 키보드 조작 (CUR-22) | 생물 선택/취소/재배치/포커스·인수분해 선택 검토, 추가 확정 회귀 없음 | 드래그 전용 설명을 선택·키보드 병행으로 수정 |
| 화면 감사 (CUR-23) | P2 누락 재현 후 수정 | 검사 대상과 실제 검증 한계를 갱신 |

‘확정 회귀 없음’은 무결함 보증이 아니다. 생성 데이터는 별도 작업이므로 이번 코드 변경의 작성 범위로 취급하지 않았다.

## P2 화면 감사 누락 수정

`apps/games/scripts/ui-audit.mjs`가 조작 요소만 순회하여 320px viewport의 폭 600px 제목을 `checked=1, overflows=[]`로 통과시켰다. 실제 브라우저의 HTML 대조군에서 재현했다. 이제 main의 실제 텍스트 요소와 img/접근성 SVG/canvas/math를 포함한다. Range의 텍스트 경계로 자체 nowrap/hidden 잘림도 검사한다. 숨겨진/접힌 요소와 정상 스크롤은 기존 계약대로 처리한다.

초기 확장 구현은 화면 낭독기 전용 1px clip 텍스트를 잘림으로 오인했다. 실제 크기·clip CSS로 해당 시각적 숨김을 구별하도록 보정했으며 조작 요소는 이 예외로 제외하지 않는다. 클래스 이름만으로 제외하지 않아 반응형으로 다시 보이는 요소를 누락시키지 않는다.

변경 코드: `apps/games/scripts/ui-audit.mjs`, `apps/games/e2e/ui-audit.spec.js`. HTML fixture는 알고리즘 대조군이며 실제 앱 로그인 검증의 대체가 아니다. 감사는 다른 요소에 의한 덮임, 모든 SVG 내부 path/수학 의미, 가상 키보드·스크린리더의 실제 동작까지 보증하지 않는다.

## 문서 수정과 설계 미구현 항목

현재 안내 수정: 루트 README, `apps/games/lib/core/README.md`, 생물 분류/도해/한자 게임별 README, `proc/spec/03-핵심-기능.md`, `04-사용자-경험.md`. 기존 core read-only 및 별도 PR 규칙은 유지하고 제공 기능 목록만 현재화했다. 사용자 요청은 문서 사실 정합화이지 규칙 완화가 아니다.

계획 문서: CUR-14에 구현 현황표를 추가했다. CUR-23 단계별 문서 3개에는 이후 완료 기록 링크를 달아 당시 In Progress 문구를 현재 상태로 오인하지 않게 했다. 과거 실패 로그와 당시 검증 범위는 삭제하지 않았다.

중요한 차이: CUR-14의 모든 모드 최대 5장 정책은 승인됐으나 후속 허브 구현 문서는 회차 변경을 제외했다. 현재 `selectCardsForMode`는 review-queue만 5장, default/time-attack은 전달된 카드 수, deep-recall은 기준 충족 전체 집합이다. 완료 화면 세부 집계, 중도 이탈 확인, 저장 실패 사용자 안내도 설계안에 있지만 현재 구현에는 없다. 이 요구를 삭제하거나 구현된 것으로 고쳐 쓰지 않고 미구현으로 명시했다. 설계 티켓의 완료는 이들 기능 구현의 완료를 뜻하지 않는다.

## 검증

- Red: `/tmp/audit-content-red.log`에서 긴 제목 누락 실패. `/tmp/audit-sr-red.log`에서 화면 낭독용 텍스트 오인 실패.
- Green: `/tmp/audit-content-final.log`의 감사 브라우저 회귀 8개 통과.
- 실제 표준 게스트 진입 후 허브 4 viewport pass: `apps/games/output/playwright/review-content-hub/audit.json`.
- 공식 17종 × 4 viewport 최종 pass. 16종은 `output/playwright/review-content-final/<game>/audit.json`, 유전은 `output/playwright/review-content-retry/genetics-punnett/audit.json`(앱 기준). 유전 390폭은 첫 실행에서 본문 버튼 대기 5초가 초과됐고 재실행 4크기에서 통과했다. 페이지 로딩 경계의 간헐성은 남으며 무조건 재시도로 숨기도록 코드를 변경하지 않았다.
- root lint/typecheck/test 통과(`/tmp/code-doc-{lint,typecheck,test}.log`), 단위 590개. 문서 링크 및 `git diff --check` 확인.
- root build exit 0(`/tmp/code-doc-build.log`). 실제 앱 검사 후 dev를 중지해 빌드하고 표준 dev를 재시작했다. Terra의 감사 코드 독립 재검수에서 추가 확정 회귀 없음.

증거 수준: 코드/문서 정합성은 STATIC_INSPECTED, 감사 대조군과 실제 게스트 첫 화면은 RUNTIME_VERIFIED. 이번 리뷰에서 전체 게임 완주 E2E를 다시 실행하지 않았으며 기존 완주 검증은 이전 기록을 참조한다. 복구는 이번 감사 스크립트/회귀 테스트/문서 hunk만 역패치한다. 커밋·푸시·배포 없음.

## 재리뷰 5건 수정

- P2 중첩 선택지 누락: 버튼/링크 안 span·strong 등의 실제 텍스트도 후보에 포함한다. 텍스트 부모별 Range를 검사해 줄바꿈·숨김 상태를 유지하면서 잘림을 확인한다.
- P2 테두리 오탐: 요소의 border box는 부모 clipping과 비교하고, 내부 텍스트는 자기 요소 clipping까지 적용해 따로 비교한다. 정상 border 4px 문단/버튼은 통과하고 테두리 안 긴 텍스트는 실패한다.
- P3 루트 README: 공식 카드/추천은 모드 대화상자, 기존 custom 자료는 직접 진입한다는 실제 차이를 명시했다.
- P3 도해 README: 현재 풀은 확장 5장+기존 V0 5장=10장이다. 기존 카드 표를 V0로 구분했다.
- P3 문서 링크: 게임 README 9개의 상대 깊이와 archive 이동을 반영했다. 대상 게임은 bio-taxonomy, cloze-multi, english-order, factorization, genetics-punnett, image-hotspot, korean-pos-tagging, letter-assembly, math-quick-quiz다.

생성 JSON·정답 ID는 그대로다. 승인된 미구현 설계 4개를 이번 버그 수정에 추가하거나 삭제하지 않았다. 변경 파일은 감사 엔진/회귀 테스트, 루트 및 위 게임별 README, 이 기록이다. 규칙·명세 요구를 완화하지 않았다.

Red: `/tmp/audit-second-red.log`의 신규 2개 실패. Green: `/tmp/audit-second-green.log` 감사 회귀 10개 통과. root lint(기존 warning 1)·typecheck·단위590개 통과(`/tmp/second-fix-{lint,typecheck,test}.log`). 실제 서비스 대신 사용하는 인증 fixture는 없으며, HTML 대조군은 검사 엔진 재현용이다.

최종 화면 결과: 실제 게스트 진입으로 허브+공식17종 ×4크기=72개 첫 화면 모두 pass, critical 0. 증거 `apps/games/output/playwright/second-review-fix/<game 또는 hub>/audit.json`. 18개 보고서 모두 통과했고 이번 실행에서는 재시도하지 않았다. 게임 README의 proc 상대 링크 11개가 모두 존재한다. 기존 content 파일 해시 변경 0건, `git diff --check` 통과. Terra 독립 재검수에서 두 P2 해소 확인 및 추가 확정 회귀 없음. SVG 내부 글자의 잘림과 다른 요소에 의한 가림은 이 검사의 보장 범위가 아니다.

최종 빌드: root `bun run build` exit 0(`/tmp/second-fix-build.log`). 검사 종료 후 dev를 중지하고 빌드했으며 표준 dev를 재시작했다. 커밋·푸시·배포 없음.
