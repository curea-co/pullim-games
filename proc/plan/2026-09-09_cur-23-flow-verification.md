> 기록 범위: 아래는 허브 UI·확장 문제 데이터가 함께 있던 원래 작업 폴더의 과거 검증 기록입니다. 이 독립 dev PR의 포함 범위와 검증 결과는 `2026-09-09_solving-dev-pr.md`를 따릅니다.

# CUR-23 실제 풀이 흐름 검증

현재 상태 안내(2026-09-09): 이 문서는 단계별 검증 이력이다. 아래 In Progress/남은 작업 표기는 작성 당시 상태이며, 이후 결과는 `2026-09-09_cur-23-final-exceptions.md` 및 `2026-09-09_games-final-ui-corrections.md`를 따른다. CUR-23은 완료 처리됐다. 화면 감사의 학습 본문 검사 확대 결과는 `2026-09-09_code-doc-review.md`를 따른다.

목표: 정상 게스트 진입으로 기존 오답/모드 테스트를 실행하고, 완료·재시도·새로고침·허브 복귀를 실제 UI로 검증한다.
비목표: 문제 생성·문항 데이터·채점 정책·계정·배포 변경. 이번 검증 결과를 17종 모든 예외 흐름 완료로 확대하지 않는다.
대상: games/apps/games/e2e. 기준 feat/games-json-content @ 6ee94b0f4c20ab26960205150828fa661f8b96d6. 기존 dirty 파일 SHA-256은 /tmp/cur23-flow-baseline.json.
수용 기준: 표준 bun run dev / http://localhost:3033, 랜딩→게스트 폼→허브→게임; 신원/문항/저장 데이터 주입 없이 게임 도달 및 사용자 결과 검증. 실패를 skip 또는 assertion 제거로 숨기지 않는다.

## 최초 실패와 수정

- 기존 correct-feedback-reveal 실행: 게스트 진입 없이 입력 요소를 찾지 못해 실패(exit 1). 정상 게스트 helper 연결.
- 현재 콘텐츠는 새 batch가 기존 카드보다 앞에 있다. 영어 Achieve, 국어 모순, 매칭 pursue를 첫 카드로 단정한 테스트는 실제 게임에 도달해도 실패. 문항을 바꾸지 않고 입력 테스트는 실제 첫 문항과 뜻을 확인하며 대소문자/한글 정답 검증을 유지한다.
- extras 회귀는 앞선 batch를 UI로 풀어 기존 extras 카드까지 이동한다. 그 과정에서 '그 다음의' 보기와 /다음/ 정규식이 충돌해 strict locator 실패. CTA의 정확한 '다음 →' 명칭으로 한정했다.
- 첫 병렬 실행에서 1회 ERR_ABORTED도 관찰. 후속 원인별 수정 후 재실행에서는 발생하지 않았으나 이 단발 navigation 실패의 원인은 확정하지 못했다.
- 두 Playwright 프로세스의 기본 test-results 폴더 충돌로 trace ENOENT 1건 발생. 이후 실행을 순차화했다. 제품 결함으로 해석하지 않는다.

## 변경 범위

기존 e2e 7개: correct-feedback-reveal, english-vocab-typing-case, vocab-typing-case, english-word-match-extras, mode-review-queue, mode-time-attack, mode-deep-recall.
신규: typing-session-flow.spec.ts. 기본·복습 진입은 공식17종으로 확장. 타임어택·깊이회상은 지원5종(국어 입력 포함)으로 확장. 모드 진입 테스트에 정확한 목표 URL assert 추가. 기존 localStorage.clear는 신규 브라우저 context의 정상 게스트 진입으로 대체해 신원을 지우지 않는다.

## 검증의 한계

입력 2종에서 복습5장 정답→완료→재시도→새로고침→허브 복귀를 E2E_VERIFIED로 확인한다. 이것은 새로고침 시 기존 진도 유지나 실제 회원 계정 동기화를 보장하지 않는다. 깊이 회상은 새 게스트 빈 상태, 타임어택은 타이머 표시/형식까지이며 만료/기억도 계산은 별도이다.

남은 CUR-23: 나머지15종의 완주/재시도/공개 등 전체 예외 매트릭스, 중복 다음과 이탈 callback, 저장 실패, 모든 모드의 전체 회차와 전체 키보드 검증. nightly의 기존 per-game extras 매핑은 확인했으나 새 session 테스트 CI 포함은 아직 변경하지 않았다. CUR-23 In Progress 유지.

복구: 이번 7개 테스트 수정만 역패치하고 신규 session 테스트를 제거한다. baseline에 있던 파일/콘텐츠는 전체 reset/checkout하지 않는다. 외부 배포·푸시 없음.

독립 검수 hub_review: 검증 약화/허위 통과/깨진 테스트의 중요 finding 없음(STATIC_INSPECTED). 기존 미커밋197개 파일 해시 일치. 이번 변경은 테스트8개와 본 문서뿐이다.

## 최종 결과

실제 표준 dev 서버에서 고유 E2E 55개 통과: 최종 모드/extras 49개(`/tmp/cur23-final-flows.log`, exit0), 변경 없이 이미 통과한 오답공개·영문 대소문자2개·국문 정답 4개(`/tmp/cur23-flows-green.log`의 51 pass 중 해당4개; 해당 실행의 extras2개 실패는 최종 실행에서 수정 확인), 신규 입력 회차2개(`/tmp/cur23-session.log`, exit0). 서로 다른 실행의 검증을 합산한 수이며 한 실행에서55개 통과한 것은 아니다.

명령: 앱 디렉터리의 `bun run test:e2e`에 각 위 spec 경로 및 `--workers=2`(입력 회차는1)를 전달했다. API/mock 로그인 대체 없음. 페이지 오류 배열은 신규 입력 회차2개에서 검사하며 나머지49개에 pageerror0을 확대 주장하지 않는다.

루트 `bun run lint` 통과(기존warning1), `bun run typecheck` 통과, `bun run test` 54 files/530 tests 통과. `git diff --check` 및 baseline197개 해시 비교 통과.

루트 `bun run build` exit0 확인. 표준 dev 서버를 중지한 뒤 빌드하여 .next 충돌을 피했고, 검증 후 `bun run dev`를 다시 시작했다. 제품 UI 변경이 없으므로 이전4viewport 감사는 재실행하지 않았다.
