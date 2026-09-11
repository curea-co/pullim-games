> 기록 범위: 아래는 허브 UI·확장 문제 데이터가 함께 있던 원래 작업 폴더의 과거 검증 기록입니다. 이 독립 dev PR의 포함 범위와 검증 결과는 `2026-09-09_solving-dev-pr.md`를 따릅니다.

# CUR-18 한 장 회차 재시도

목표: 한 장/여러 장 완료 또는 정답 공개 후 재시도에서 입력·배치·선택·시도·힌트·시간을 새 회차 상태로 초기화한다.
비목표: 문제 생성/문제 데이터, 회차 분량/모드 정책, CUR-17 일반 타이머 정책, 배포.
대상: games의 공유 풀이 메커니즘 및 직접 구현12종 재시도 경로.
기준: feat/games-json-content @ 6ee94b0f4c20ab26960205150828fa661f8b96d6. 시작 미커밋 해시는 /tmp/cur18-baseline.json.

## 설계와 재현

사용자 승인: 한 장 완료 후에도 입력·배치·힌트·시도·타이머가 새 회차 상태가 되는 재시도.
카드 index만0으로 설정하면 한 장일 때 effect가 재실행되지 않는다. 어순/역사는 phase만 초기화하여 슬롯이 남는다.
최소 변경: 재시도 회차 번호를 별도 state로 증가시키고 기존 카드 초기화 effect의 의존성에 포함. 같은 문제/순서·기록을 유지한다. 기존 지연 피드백이 완료/재시도 상태를 덮지 않는지도 검사한다.

Red: 정상 게스트→정상 풀이로 학습기록 생성→clock으로1년 경과→한 장 deep-recall→완료→재시도. 5종 중 타이핑2종/매칭3개 실패, 퀴즈/빈칸2개 통과(/tmp/cur18-browser-red.log).
직접12종은 실제 콘텐츠 모듈의 첫 카드만 제공하는 격리 컴포넌트 테스트로 검사한다. 저장은 spy, 게임 로직·React 생명주기는 실제이며 브라우저 E2E로 과장하지 않는다. DOM 생명주기 검증을 위해 jsdom 개발 의존성을 추가한다. 제품 콘텐츠 파일을 수정하는 우회는 하지 않는다.

## 변경과 검수

- 공유4 메커니즘과 직접11종에 sessionRound를 추가하고 재시도 때 기존 초기화 effect를 재실행한다. 인수분해는 기존 재시도가 검사에 통과하여 변경하지 않았다.
- 퀴즈·빈칸은 화면 자체는 재시작됐으나 한 장 재시도 elapsedMs가 이전 회차를 포함했다. 공통 시간 기준 effect도 회차 번호를 포함한다.
- WordMatch는 지연 피드백 timer를 ref로 추적하고 완료/카드 변경/재시도/unmount 시 취소한다. 보너스 짝의 playing 복귀를 유지한다.
- Typing은 playing 렌더 후 입력을 focus한다. 카드 수/정답/생성 로직은 변경하지 않았다.
- 변경 파일: `apps/games/components/game-mechanics/{Typing,WordMatch,QuickQuiz,Blank}Component.tsx`, `apps/games/games/{bio-taxonomy,chemistry-balance,cloze-multi,english-order,genetics-punnett,history-timeline,image-hotspot,korean-pos-tagging,letter-assembly,math-graph-shift,physics-vector}/component.tsx`, 신규 `session-retry.test.tsx` 및 `e2e/single-card-retry.spec.js`, jsdom 개발 의존성의 package.json/bun.lock, nightly spec 목록, 이 문서.
- 독립 검수 hub_review에서 보너스 조작 차단·재시도 포커스 누락을 발견하여 Red2 재현 후 수정했다. 재검수에서 두 지적 해소·추가 중요 회귀 없음(STATIC_INSPECTED).

## 최종 검증

- 최초 직접 컴포넌트 Red: 11 failed/1 passed. 완료 화면 유지9종, 슬롯 잔존2종. 인수분해 통과. `/tmp/cur18-unit-red2.log`.
- 공유 메커니즘·콜백을 포함한 Red:20 failed/9 passed(`/tmp/cur18-final-red.log`). 추가 검수 Red2는 `/tmp/cur18-review-red.log`.
- 최종 격리 상태 검사43개 통과: 직접12종 한 장 정답/5회 공개→재시도→초기 조작 상태 비교→새 정답 저장, 공유4종 한 장/두 장 정답/공개 및 힌트·오답수·30초·elapsedMs, 매칭 지연 콜백, 보너스, 타이핑 focus. `/tmp/cur18-review-green2.log`.
- E2E: 기존17종5장 완주·재시도·새로고침·허브, 공식5종 실제 학습 후 한 장 깊이회상 재시도, 기존 매칭extras. 이번 실행들에서 고유23시나리오를 통과했다. 한 장 검사는 Enter 재시도 직후 이전 버튼 위치를 클릭해도 새 카드를 건너뛰지 않음과 타이핑 focus를 포함한다.
- 최초 회귀 실행은21 passed/1 failed. 품사 검사는 게임 진입 전 `/games`에서 dev 서버 JSON.parse Unexpected end of JSON input으로 실패했다. 정상 실행 명령으로 dev를 재시작한 뒤 해당 품사와 마지막7개 회귀가 통과했다(`/tmp/cur18-browser-final.log`). 오류 원본은 `/tmp/cur23-final-dev.log` 및 최초 trace에 보존한다. JSON 오류의 내부 근본 원인을 확정하거나 영구 해결했다고 주장하지 않는다.
- 변경16종×4크기 총64 첫 화면 감사 통과, overflow0. `apps/games/output/playwright/cur18/*/audit.json`. 모든 상태×모든 크기 검증은 아니다.
- 루트 `bun run lint` 통과(기존coverage 경고1), `bun run typecheck` 통과, `bun run test` 56파일577개 통과, `bun run build` 통과(13.968초). 최종 로그 `/tmp/cur18-{lint,types,unit}-final.log`, `/tmp/cur18-build.log`. `git diff --check` 통과.
- 정상 게스트 UI/실제 저장 흐름은 E2E_VERIFIED. jsdom은 콘텐츠 수량/저장 spy/시계가 격리된 React 상태 검증이다. 원격 CI·전체 레거시 E2E·운영 환경은 미검증. nightly YAML 파싱 및 신규 목록 연결만 STATIC_INSPECTED.

## 보존 및 복구

시작 미커밋229파일 중215파일 SHA256 동일. 나머지14파일은 이번 재시도 effect/CI 목록의 의도한 변경이며 기존 hunks를 보존했다. 기존 문제 데이터/생성 변경은 그대로 유지한다. 새롭게 dirty가 된 Typing/WordMatch/package.json/bun.lock 및 신규 테스트·문서는 이번 범위다.
커밋·푸시·배포 없음. 표준 dev 재실행. 복구가 필요하면 이번 변경의 해당 hunk와 신규 파일만 대상으로 해야 하며 기존 미커밋 파일 전체를 되돌리지 않는다.
