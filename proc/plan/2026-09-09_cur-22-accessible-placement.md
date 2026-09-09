> 기록 범위: 아래는 허브 UI·확장 문제 데이터가 함께 있던 원래 작업 폴더의 과거 검증 기록입니다. 이 독립 dev PR의 포함 범위와 검증 결과는 `2026-09-09_solving-dev-pr.md`를 따릅니다.

# CUR-22 드래그 대안 마무리

목표: 생물 분류의 선택·취소·회수·재배치를 키보드/터치로 수행하고 인수분해 후보 선택을 마우스 없이 완료한다.
비목표: 문제 생성/데이터, 채점/회차 정책, 도해 및 문자 배치(CUR-21), 운영 배포.
대상: games/apps/games/games/{bio-taxonomy,factorization}와 E2E/CI.
기준: feat/games-json-content @ 6ee94b0f4c20ab26960205150828fa661f8b96d6. 시작 미커밋 해시 /tmp/cur22-baseline.json.

## 구현 전 설계

사용자에게 구현 전 제시한 설계: 카드 클릭/탭/Enter/Space 선택, 같은 카드 재선택 또는 Esc 취소, 분류 버튼 재배치, 카드 풀 복귀 버튼, 이동 결과 status 안내 및 이동 카드 focus. 드래그는 유지한다.
인수분해는 후보 버튼을 누르는 즉시 채점하는 기존 동작을 보존한다. 배치 취소/회수는 생물 분류에 해당하며 인수분해에 새 제출/취소 단계를 만들지 않는다. 화면/음성용 안내는 실제 후보 선택과 일치시킨다.

## 재현·수정

정상 게스트 브라우저 Red2: Esc 후 aria-pressed가 true로 잔존, 모바일 탭 후 false로 잔존(/tmp/cur22-red.log).
ItemCard에서 pointer drag 여부를 ref로 추적하여 드래그 종료 클릭은 선택으로 처리하지 않는다. 키보드 선택과 터치 선택은 같은 부모 함수로 연결한다.
부모는 선택 토글/취소 및 이동 안내를 제공하고, 분류·풀 버튼 배치가 끝난 commit 이후 이동 카드로 포커스를 돌린다. 드래그는 포커스 복귀를 요청하지 않는다. 정답/공개 후 입력 차단은 기존 phase guard를 유지한다.

## 검증과 한계

- Red2→Green2: `/tmp/cur22-red.log`, `/tmp/cur22-green.log`.
- 최종 브라우저8개 통과(`/tmp/cur22-browser.log`): 선택·Esc취소·오분류·회수·재배치·focus, 모바일탭/같은카드취소/회수/인수선택, 두 게임의 실제Tab/Enter/Space5장완주, 기존드래그5장완주·재시도·새로고침,5회오답공개. 정상 게스트 로그인 흐름 사용(E2E_VERIFIED), 인증 주입/모킹 서버 없음.
- 변경2종×4viewport 감사8개 PASS, critical0/pageerror0. `apps/games/output/playwright/cur22/{bio-taxonomy,factorization}/audit.json`. 생물320px 화면 직접 확인; 작은 화면은 기존 내부 스크롤로 카드 풀에 접근한다.
- 루트 lint통과(기존coverage 경고1), typecheck통과, 단위56파일577개통과. `/tmp/cur22-{lint,types,unit}.log`. diff check 및 nightly YAML 파싱 통과. 신규 spec은 일반 E2E 자동 수집 및 nightly 목록에 포함.
- 독립검수 hub_review: 중요한 이벤트/포커스 회귀 발견 없음(STATIC_INSPECTED). 실제 스크린리더 낭독은 미검증이며 DOM status/aria 상태와 실제 키보드/터치만 검증했다. 원격CI/운영 및 전체레거시E2E는 실행하지 않았다.

## 변경·보존·복구

변경파일: bio-taxonomy/component.tsx, components/ItemCard.tsx, components/Pool.tsx, factorization/component.tsx, 신규 e2e/accessible-placement.spec.js, .github/workflows/e2e-nightly.yml, 이 문서.
시작 dirty316파일 중312파일 SHA256 동일,4파일에 이번의도변경이 추가됐다. Pool은 이번에 새로 dirty가 된 파일이다. 기존 문제데이터/생성/다른미커밋변경을 보존했다.
커밋·푸시·배포 없음. 복구는 이번 변경hunk와 신규테스트/문서만 대상으로 하며 기존미커밋파일 전체복원은 하지 않는다.
최종 `bun run build` 통과(12.912초, `/tmp/cur22-build.log`). 표준 `bun run dev` 재실행.
