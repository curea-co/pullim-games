# 풀림 게임즈 — SPEC

V1 (인수분해 블록 분리 모드) 정식 명세. 2026-05-07 작성.

## 문서 목록

| # | 문서 | 핵심 내용 |
|---|---|---|
| 01 | [AI 명령지침](01-AI-명령지침.md) | AI가 따라야 하는 행동 규칙, 사고 원칙, 정책 |
| 02 | [제품 정의](02-제품-정의.md) | Problem, Goal, Persona, V1 범위 |
| 03 | [핵심 기능](03-핵심-기능.md) | MoSCoW, Sitemap, IA, Screen Spec |
| 04 | [사용자 경험](04-사용자-경험.md) | 정보 위계, 시나리오, Navigation Flow, RBAC, 첫 30초 모먼트 |
| 05 | [비즈니스 정책](05-비즈니스-정책.md) | 비즈니스 규칙, Auth/ACL, ERD, Validation |
| 06 | [콘텐츠 데이터](06-콘텐츠-데이터.md) | 5장 카드 풀, microcopy, OG 카드 콘텐츠 |
| 07 | [브랜딩](07-브랜딩.md) | 서비스명, 톤앤매너, microcopy 테이블 |
| 08 | [디자인 시스템](08-디자인-시스템.md) | Color, Typography, Spacing, Motion, AI Slop 차단 |
| 09 | [기술 환경](09-기술-환경.md) | 스택, 라이브러리, 배포, 성능 예산 |
| 10 | [개발 로드맵](10-개발-로드맵.md) | Phase 0~4, 검증 기준, V2+ 메모 |

## 한 줄 요약

**풀림 게임즈 V1** = 한국 고등학생을 위한 모바일 웹 인수분해 게임. 단일 FSRS 백본 위에 인수분해 블록 분리 모드 1개. 4주 빌드 + 2주 신호 수집으로 "풀이 동작 = 게임 메커닉 = 학습 메커니즘" 명제 검증.

## 출처 및 의사결정 트레이스

본 SPEC은 다음 문서들의 substance를 정식 형식으로 정리한 것입니다:

- `proc/research/2026-05-07_education_gamification_research.md` — 인지과학·시장·FSRS·Prodigy 분석, 6 핵심 원칙, (B) 아키텍처
- `~/.gstack/projects/pullim-games/curea-concept-design-20260507-144702.md` — v2 design doc (research-integrated, Design Spec v0.1 addendum 포함)
- `~/.gstack/projects/pullim-games/curea-concept-eng-review-test-plan-20260507-145133.md` — Test plan
- `/office-hours` D1-D8 의사결정 (V1 wedge 선택, 메커닉 결, 일정, 테스터 접근)
- `/plan-eng-review` 14 issues + 4 critical gaps
- `/plan-design-review` 7 design 결정 + Design Spec v0.1

세부 의사결정 과정은 위 트레이스 문서들을 참조.

## 다음 단계

이 SPEC을 입력으로 **Phase 0 사전 게이트** (Week 1) 부터 시작합니다. 자세한 내용은 [10-개발-로드맵.md](10-개발-로드맵.md) 참조.

## 변경 이력

| 일자 | 변경 | 출처 |
|---|---|---|
| 2026-05-07 | V1 초안 작성 (10개 문서) | `/create-spec` (office-hours → plan-eng-review → plan-design-review 체인 후) |
