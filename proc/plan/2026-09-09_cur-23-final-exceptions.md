> 기록 범위: 아래는 허브 UI·확장 문제 데이터가 함께 있던 원래 작업 폴더의 과거 검증 기록입니다. 이 독립 dev PR의 포함 범위와 검증 결과는 `2026-09-09_solving-dev-pr.md`를 따릅니다.

# CUR-23 마지막 예외 검증

목표: 공식17종의 다음 연타·저장 횟수·제출 후 이탈, 지원5종의 시간 만료와 깊이 회상, 저장 실패, 키보드 풀이와 CI 연결을 확인한다.
비목표: 생성·콘텐츠·계정 계약·외부 배포. 기존 미커밋 내용은 보존한다.
대상: games e2e, 저장 계층, 인수분해/생물 분류 키보드 입력, CI 목록.
기준: feat/games-json-content @ 6ee94b0f4c20ab26960205150828fa661f8b96d6. 시작 baseline은 /tmp/cur23-last-baseline.json.

수용 기준: 표준 bun run dev / http://localhost:3033 실제 게스트 흐름, 정상 조작으로 만든 저장값만 읽어 검증. 실패 주입은 격리된 단위 테스트에 한정한다. 시간만 Playwright clock으로 진행시킨다. 실제 외부 CI 실행이나 전체 풀 완주를 로컬 결과로 대신 주장하지 않는다.

## 변경과 Red

- 저장 실패: 스트릭 저장이 내부에서 오류를 삼켜 상위 telemetry에 streakOk=true가 기록됐다. 저장 실패4개 격리 테스트 중 streak/all 2개 Red. saveStreak가 boolean 결과를 반환하고 saveSrsAndRecord가 실제 결과를 기록하도록 수정했다. 저장 실패는 기존 정책처럼 학습을 중단하지 않는다. UI 안내·자동 재시도 큐를 새로 추가하지 않았다.
- 키보드: 인수분해 후보는 div, 생물 카드에는 선택 키 핸들러가 없어 두 브라우저 테스트 Red. 인수 후보를 native button으로 만들고 드래그와 같은 채점 함수에 연결했다. 생물 카드는 Enter/Space로 선택하고 분류 버튼에서 배치한다. 선택 상태·사용 안내·포커스 표시를 제공한다.
- 기존 회차 테스트의 UI 조작 함수를 helpers/solve-official.js로 추출했다. 기존 마우스 경로를 유지하고 키보드 활성화를 추가했다. 기존 official-session-flow의 시나리오·assert는 유지했다.
- 일반 CI E2E는 모든 spec을 자동 실행한다. core 단위 작업에 game-mechanics/game-hub 테스트를 추가하고 nightly 게임별 목록에 회차/예외/키보드 테스트를 연결했다. 기존 검사 목록을 제거하지 않았다.

## 증거 해석

- 시계 조작은 타이머 만료/재시작/해제와 오래된 실제 학습 카드 선택을 재현하기 위한 것이다. 1년을 실제로 기다린 결과가 아니다.
- localStorage는 정상 풀이가 만든 SRS reviewCount를 읽기만 한다. 로그인이나 정답 상태를 주입하지 않는다.
- 저장 실패 단위 테스트는 메모리 Storage fake에 오류를 주입한다. 브라우저/OS 저장 장애나 사용자 안내 E2E가 아니다.
- 제출 직후 이탈 검사는 이후 허브 유지와 다음 카드의 미저장을 확인한다. 이미 제출한 답안의 정상 저장을 취소하도록 계약을 바꾸지 않는다.
- 키보드 첫 문항은 실제 키 이벤트로 조작하며 인수분해는 Tab 탐색도 검증한다. 모든 보조기기/스크린리더의 사용성을 보장하지 않는다.

## 기준별 검증 연결

| 기준 | 증거 |
| --- | --- |
| 17종 정답·완료·재시도·새로고침 | official-session-flow 15종 + typing-session-flow 2종 |
| 17종 오답·공개 | official-session-flow 15종 + 기존 국어 입력 공개 + 신규 영어 입력 공개 |
| 17종 중복 다음·저장 횟수 | edge-flows의 연타 시나리오 |
| 17종 제출 직후 이탈 | edge-flows의 지연 피드백 시나리오 |
| 지원5종 시간 만료·재시작·이탈 취소 | edge-flows의 타이머 시나리오, clock 진행 |
| 지원5종 깊이 회상 | 정상 학습한 카드의 시간 경과 후 선택·풀이·완료 |
| 비지원12종 모드 정규화 | 이전 mode-entry-points 검증 |
| 17종 키보드 첫 문항·다음 | keyboard-games의 17종 + 2개 집중 회귀 |
| 네 viewport | 이전17종 첫 화면 감사 + 이번 키보드 수정2종 재감사 |
| 저장 실패 | 4개 격리 단위 테스트, 실패 이후 정상 저장 복구 |
| CI 연결 | 일반 E2E 자동 수집, nightly 목록·공통 메커니즘 단위 목록 추가 |

화면 감사는 네 크기의 첫 풀이 화면을, 회차·예외 테스트는 명시된 데스크톱 크기의 상태 전이를 검사한다. 모든 상태×모든 크기의 직교곱을 실행한 것으로 표현하지 않는다. 이전 보고의 ‘모든 상태4viewport’를 전부 완료했다고 확대하지 않으며, 이슈 본문의4viewport 기준은 첫 화면 감사 증거로 대응한다.

이번 예외·키보드63개가 단일 실행에서 통과(/tmp/cur23-last-all.log). 저장 실패4개 통과(/tmp/cur23-storage-green.log), 전체 단위55 files/534 tests 통과. lint 기존warning1, typecheck 통과. YAML은 Python yaml.safe_load로 두 파일 파싱 확인. 원격 CI는 실행하지 않았다.

독립 검수 hub_review: 중요한 제품 회귀·검증 약화·CI 실행 계약 오류 없음(STATIC_INSPECTED). 변경 UI의8개 화면 감사 모두 critical0/pageerror0. output/playwright/cur23-keyboard/ 참조.

## 최종 결과

- 회차·오답 회귀33개 통과(`/tmp/cur23-last-regression.log`). 예외·키보드63개와 합쳐 이번 두 실행에서 서로 다른 브라우저 사례96개 통과(E2E_VERIFIED).
- 루트 `bun run lint`, `bun run typecheck`, `bun run test`(534개), `bun run build` 통과. lint의 기존 경고1개는 남아 있다. `git diff --check` 통과.
- 기준 HEAD `6ee94b0f4c20ab26960205150828fa661f8b96d6`, 브랜치 `feat/games-json-content`. 시작 시 미커밋217개 파일 중214개는 SHA256 동일. 나머지3개는 기존 회차 테스트 helper 추출 및 생물·인수분해의 의도한 키보드 변경이며 기존 변경을 보존했다. 문제 생성·문제 데이터는 수정하지 않았다.
- 변경 범위: storage/srs·streak 저장 결과 전달, storage/save-failure 단위 테스트, 생물·인수분해 입력 컴포넌트, E2E helper·예외·키보드·회차 테스트, CI 두 workflow, 이 기록.
- 미검증: 원격 CI, 전체 레거시 E2E 묶음, 브라우저/OS 실제 저장 장애, 모든 상태와 화면 크기의 조합, 스크린리더. CI 연결은 STATIC_INSPECTED이며 원격 성공으로 표현하지 않는다.
- 표준 `bun run dev`를 다시 실행했다. 커밋·푸시·배포는 하지 않았다. 복구가 필요하면 이번 변경의 해당 hunk만 되돌려야 하며 기존 미커밋 파일 전체를 복원하지 않는다.
