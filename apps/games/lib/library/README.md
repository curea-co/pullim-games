# Library 게임 계약

`lib/library`는 Pullim Library가 현재 게임 카탈로그를 실행하고 학습 이벤트를 회수하기 위한 직렬화 계약이다. UI나 FSRS 백본을 대체하지 않는다.

## 기존 정본과의 관계

- 21개 게임 메타와 코드 로딩: `lib/games/registry`의 `GameManifest`가 정본이다. `gameTemplateFromManifest()`가 이를 `GameTemplate`으로 투영한다.
- 4개 공용 메커니즘: `GameMeta.mechanismComponent`의 `Blank | QuickQuiz | Typing | WordMatch`를 그대로 사용한다.
- FSRS: 기존 `GameMode`와 `isModeSupportedFor()`를 재사용한다. Library 계약에는 SRS 카드 상태나 스케줄링 알고리즘을 복제하지 않는다.
- 교육 데이터: `createRegisteredCurriculumDatasetSchema(cardSchema)`에 각 게임의 기존 Zod 카드 schema를 전달한다. 별도 공통 카드 타입을 만들지 않는다.
- 레거시 이벤트: `lib/core/schema/EventSchema`와 `logEvent()`의 기존 직렬화·`/api/event` 전송 계약은 유지한다. 새 `LearningEvent`는 관찰 브리지에서 함께 만들며 기존 `EventAction`도 허용한다.

## 데이터 흐름

1. registry manifest를 정확한 코드 버전의 `GameTemplate`으로 투영한다.
2. 게임별 기존 카드 schema로 `CurriculumDataset`을 검증하고 별도 버전으로 배포한다.
3. `GameBinding`이 template/dataset의 정확한 버전과 FSRS mode를 연결한다. 기존 소비자는 동형 별칭 `GameActivity`를 계속 사용할 수 있다.
4. Library가 binding을 해석해 `PinnedGameActivity`를 만들고 단기 `LaunchTokenPayload`에 서명한다.
5. 게임은 launch의 `anonymousUserId`, `sessionId`, 활동 스냅샷을 모든 `LearningEvent`에 복사한다.

## 런타임 브리지

`lib/library/runtime`은 실제 Library 인프라와 게임 런타임 사이의 경계다.

- `resolveLibraryLaunch()`는 주입된 `LaunchTokenVerifier`가 compact token의 서명·알고리즘·키 신뢰 체인을 검증한 뒤에만 payload를 받는다. 이 모듈은 token을 단순 decode하지 않는다.
- 소비자는 issuer, audience, 최대 token 수명을 `LaunchValidationPolicy`로 명시한다. 만료·미래 발급·`nbf`·수명 상한을 게임 쪽에서도 다시 확인한다.
- `LibraryArtifactResolver`는 token에 고정된 binding/template/dataset의 정확한 버전을 가져온다. runtime은 id/version/integrity와 전이 참조, registry game/mode, 필수 curriculum slot을 교차 검증한다.
- `resolveGameRouteLaunch()`는 `/games/[gameId]` 연결 계약이다. token이 없으면 현재 직접 실행과 mode 정규화를 그대로 유지한다. token이 있으면 URL의 gameId/mode가 서명된 activity를 덮어쓸 수 없다.
- 실제 서명 키와 artifact 저장소, token 전달 방식(URL 또는 POST handoff)은 이 repo에 없으므로 adapter로 주입한다. 전달 방식이 결정되기 전에는 page에서 query token을 임의 decode하거나 신뢰하지 않는다.

이벤트 쪽은 `installLibraryLearningEventBridge()`가 검증된 Library launch 동안 기존 `logEvent()`를 관찰한다. 기존 `/api/event` 전송은 그대로 유지하면서 같은 이벤트를 `LearningEvent`로 만들어 영속 queue에 넣는다. queue는 enqueue 때 발급한 `eventId`를 재시도에서도 재사용하고, batch sender가 수신 확인한 ID만 제거한다. 브라우저 `online` 복귀 시에도 남은 batch를 다시 시도한다.

## POST handoff

Library producer는 `POST /api/library/launch`에 compact HS256 token과 세 artifact를 함께 보낸다. 브라우저 top-level form handoff는 `application/x-www-form-urlencoded`의 `token`, `binding`, `template`, `curriculum` 필드를 사용하고, 서버 연동은 같은 구조의 JSON을 사용할 수 있다.

각 token ref에는 canonical JSON의 `sha256-<base64>` integrity가 필수다. games 서버는 다음 순서로 처리한다.

1. 고정된 HS256 알고리즘으로 token 서명을 검증한다.
2. issuer, audience, 최대 5분(환경 설정은 최대 15분) 수명과 registry/mode를 검증한다.
3. POST artifact의 canonical SHA-256을 token ref와 대조한다.
4. 성공한 handoff만 DB의 단기 opaque session으로 승격하고 HttpOnly cookie를 발급한다. 원 token과 cookie 원문은 DB에 저장하지 않는다.
5. `/games/[gameId]?library=1`에서 session의 gameId/mode가 URL과 일치할 때만 기존 identity gate를 Library gate로 대체한다.

필수 서버 설정은 `PULLIM_LIBRARY_LAUNCH_SECRET`(32 bytes 이상)이다. 선택 설정은 `PULLIM_LIBRARY_LAUNCH_ISSUER`, `PULLIM_LIBRARY_LAUNCH_AUDIENCE`, `PULLIM_LIBRARY_LAUNCH_MAX_AGE_SECONDS`, `PULLIM_LIBRARY_ORIGINS`다. 실제 값과 키 배포는 이 repo가 아니라 운영 secret 관리에서 수행한다.

Library 실행 중 생성된 event batch는 same-origin + double-submit CSRF + opaque launch session을 모두 검증하는 `POST /api/library/events`로 보낸다. 서버는 익명 ID, session, pinned activity, event timestamp를 launch와 대조하고 `eventId` PK로 멱등 저장한다. 같은 ID/다른 본문은 `409`로 거부한다. 명세의 익명 이벤트 정책에 따라 수신 시각 기준 6개월이 지난 행은 기존 일일 cleanup에서 삭제한다.

## 로컬 연동 샘플

개발 서버의 `/library-demo`에서 실제 DB나 Library 서명 키 없이 handoff → opaque session → 게임 실행 → `LearningEvent` 수락 흐름을 확인할 수 있다.

```bash
bun dev
# 터미널에 표시된 Local 주소에서 /library-demo 열기
```

- 샘플은 registry의 `math-quick-quiz`와 기존 `QuickQuiz` 메커니즘을 그대로 실행한다.
- 익명 ID와 `demo-2026.07.22` 고정 artifact 버전을 가진 30분 session을 프로세스 메모리에만 저장한다.
- 샘플 event도 같은 메모리 adapter에서 `eventId` 멱등성 및 동일 ID/다른 본문 충돌을 검사한다.
- 개발 서버를 다시 시작하면 샘플 session과 event는 모두 사라진다.
- `NODE_ENV=production`에서는 샘플 페이지와 발급 API가 `404`이며, `demo_` token은 DB fallback으로 전달되지 않는다.
- 샘플을 위해 새 환경변수, 운영 secret, DB schema 적용은 필요하지 않다. 실제 Library handoff는 위의 서명·integrity·DB 경로를 계속 사용한다.

```ts
const launch = await resolveLibraryLaunch(compactToken, dependencies);
const queue = new LearningEventQueue(queueStore, batchSender);
const bridge = createLibraryLearningEventBridge(launch, queue);
const cleanup = installLibraryLearningEventBridge(bridge);

// 게임 session 종료 또는 route 이탈 시
cleanup();
```

`version`에는 `latest`, `^1.2.0` 같은 가변 범위를 넣지 않는다. 이벤트 생산자는 로컬 큐에 넣을 때 `eventId`를 한 번 발급하고 모든 재시도에서 같은 값을 사용한다. 수신자는 `eventId`를 unique key로 중복 제거한다.

`anonymousUserId`, `launchConfig`, 이벤트 payload에는 이메일·이름·원본 회원 ID 같은 PII를 넣지 않는다. `sub`는 `anonymousUserId`와 같아야 한다.

## 검증

```bash
bun run test
bun run typecheck
bun run lint
```
