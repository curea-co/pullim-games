# 홈(`/home`) — 항상 대시보드로 (빈 상태 온보딩 스플래시 제거)

작성: 2026-07-05 · 상태: 구현 완료 (검증 통과, 커밋 대기)

## 문제 (사용자 보고)

사이드바 "홈"을 눌렀을 때 **대시보드가 아니라 "이상한 페이지"가 뜬다**. 이전에 지우라고 했으나 남아 있음.

### 진단 (dev 3004, 4-viewport 시드 스크린샷으로 확인)

사이드바 "홈" → `/home` 은 코드상 대시보드에 **정상 연결**. 그러나 `/home` 은 상태별로 다르게 렌더:

| 상태 | 렌더 | 판정 |
|---|---|---|
| 신원 없음 | `/`(랜딩 히어로)로 바운스 | 대시보드 아님 (arcade 입구 게이트) |
| 신원 O · 기록 X | `EmptyDashboard` — "처음 만나는 풀림 게임즈 / 인수분해 블록 분리부터" 온보딩 스플래시 | ← **"이상한 페이지"의 정체** |
| 신원 O · 기록 O | 실제 대시보드 (게임별 정답률·성공/실패·14일 히트맵) | 정상 |

개발/테스트 중 기록을 초기화("기록 지우고 나가기" / "DEV 초기화")하면 매번 기록 X 상태 → `EmptyDashboard` 온보딩 카드가 뜬다. 이게 사용자가 본 "이상한 페이지".

`stats.ts` 데이터 레이어엔 사용자가 원한 정보가 이미 전부 존재: 게임별 `attempts`·`correct`·`failed`·`accuracy`·`lastReviewAt`, 총계·스트릭·오늘 활동. 문제는 **빈 상태에서 이 골격이 온보딩 스플래시로 대체**되는 것.

## 목표

홈은 **어떤 상태(기록 유무)든 대시보드 골격**으로 보인다. 사용자가 명시한 정보 — 어떤 게임을 얼마나 / 정답률 / 언제 무엇을 — 를 대시보드가 답한다.

## 작업 항목

- [x] `app/home/page.tsx` — `gamesPlayed === 0 → EmptyDashboard` 분기 제거. 빈 상태도 `<Dashboard>` 렌더. 첫 사용자 환영 배너 추가, 헤더 부제 분기("첫 게임을 풀면 여기에 기록이 쌓여요").
- [x] `components/dashboard/EmptyDashboard.tsx` — **삭제** 완료 (참조 0, RecommendationCard 콜드스타트가 첫 게임 안내 대체).
- [x] `components/dashboard/CompactActivity.tsx` — (1) 게임별 행에 마지막 플레이 상대시각("마지막 오늘/어제/N일 전") 추가. (2) 빈 상태 affordance 대시보드 톤 변경. `aria-label` 도 마지막 시각 포함.
- [x] 상대시각 helper `relativeDay()` — 오늘/어제/N일 전/N주 전/N개월 전.
- [x] `bun run typecheck && bun run lint` — 통과.
- [x] 4 viewport overflow audit (게스트 시드, 빈+기록 2상태) — **가로 overflow 0 · docScrollX 0** 전부 PASS (실 HARD gate=가로). 세로 bottom>vh 는 자연 스크롤(캐노니컬 `ui:audit /games` 도 동일 성격 70건 보고 — 도구가 긴 스크롤 페이지 세로를 과다보고, 가로가 실 게이트).
- [x] vitest — dashboard/player/storage 29 pass. (`bun test` 네이티브 러너 mass-fail 은 pre-existing `vi.*` 러너 mismatch, 본 변경 무관.)

## 비고

- 단일 백본·하이퍼캐주얼 룰 준수: 점수·랭크·뱃지 없음. 진행/정답률/활동만 정직하게 노출 (기존 톤 유지).
- 로그아웃 상태의 `/` 랜딩 바운스는 arcade 입구 게이트(별 plan `2026-06-01_arcade-entry-model.md`)라 본 작업 범위 밖 — 유지. 본 작업은 **로그인 후 홈이 항상 대시보드**가 되게 하는 것.
