# `lib/core/` — 공유 인프라 (Read-only 계약)

이 디렉토리의 코드는 모든 게임이 의존하는 공유 인프라입니다.

## 규칙

1. **게임 모듈은 `lib/core/`를 수정하지 않습니다.** 의존만 하세요.
2. **게임 모듈은 `@/lib/core` barrel만 import합니다.** internal 경로 직접 import 금지.
3. **`lib/core/` 변경은 별도 PR입니다.** 게임 PR과 섞지 마세요.
4. **`lib/core/` 변경 시 모든 게임 테스트가 자동 실행됩니다** (Phase R4 CI 매트릭스).

## 현재 제공 항목

- `fsrs/` — FSRS 엔진과 `default`·`review-queue`·`time-attack`·`deep-recall` 모드 정책
- `storage/`, `streak/`, `event/`, `dashboard/` — 브라우저 학습 상태·활동 기록·표시용 집계
- `fingerprint/`, `schema/`, `distractor/`, `sanitize/`, `ast/` — 공통 식별·검증·문항 보조 기능
- `custom/`, `curriculum/`, `recommendation/` — 사용자 콘텐츠와 허브 표시를 위한 공통 API

## 이유

게임을 self-contained 모듈로 만들어 병렬 개발이 가능하지만, 풀림 게임즈의 핵심 가치 중 하나는 **단일 백본 (FSRS) + 다중 모드** 입니다 (proc/spec/05 §B 아키텍처). 백본이 게임마다 갈라지면 학습효과 측정이 깨집니다. 그래서 lib/core/는 read-only 로 격리합니다.
