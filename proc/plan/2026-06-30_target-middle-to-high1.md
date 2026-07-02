# 타겟 학령 정밀화 — 중·고등 전 학년 → 중1~고1

> 작성: Claude Opus 4.8 (에이전트) · 2026-06-30
> 근거: G1 확정 2026-06-30 ("중1~고1까지가 타겟 유저") + 스코프 확인(고2·고3 하드 컷)
> 연결: [[project_middle_school_repositioning]] · `proc/plan/2026-06-26_middle-high-target.md`(번복 대상) · `proc/plan/2026-06-23_middle-school-repositioning.md`

## 0. 결정 — 06-26 대표 결정의 정밀화(번복)

| 시점 | 타겟 | 근거 |
|---|---|---|
| 2026-06-23 | 고등 → 중등 단독 | `2026-06-23_middle-school-repositioning.md` (#125) |
| 2026-06-26 | 중등 → **중·고등 전 학년(중1~고3)** | `2026-06-26_middle-high-target.md` (대표 확정, #126) |
| **2026-06-30** | **중1~고1** (중등 전체 + 고1, **고2·고3 제외**) | **본 plan — G1 확정** |

2026-06-26 "중·고등 전 학년(중1~고3)" 을 **중1~고1 로 정밀화**. 고2·고3 은 타겟에서 제외 — 가입 학년 수집에서도 제거(하드 컷). G1 이 06-30 직접 확정, 스코프(소프트 포커스 아닌 하드 컷) 확인 완료.

## 1. 변경 (코드)

| 파일 | 변경 |
|---|---|
| `apps/games/lib/core/player/index.ts` | `GRADES = ["중1","중2","중3","고1"]` (고2·고3 제거) + 주석 갱신. `isGrade` 단일 출처라 게스트·회원 양쪽 검증 동시 반영 |
| `apps/games/lib/core/player/player.test.ts` | GRADES 단정 `["중1","중2","중3","고1"]` 로 갱신 |
| `apps/games/lib/server/auth/schemas.ts` | refine 메시지·주석 "중1~고1" |
| `apps/games/lib/server/auth/users.ts` | grade 주석 "중1~고1" (×2) |

## 2. 변경 (권위 spec)

| 파일 | 변경 |
|---|---|
| `proc/spec/02-제품-정의.md` §2.4 | Primary "중·고등학생 (전 학년)" → "중1~고1 (중등 전체 + 고1)" + 정밀화 근거 주석. 페르소나 "고등 대표" → "타겟 상단(고1) 대표" |

- "중·고등" 밴드 표현(전과목 명제 등)은 중1~고1 에도 유효해 유지. 명시적 "전 학년" 만 정정.
- spec/05(동의 모델)·spec/10(테스트 모집): "중·고등" 밴드 언어 유지 — 14세 미만(중1) 포함 컴플라이언스 논리 불변. 본 정밀화로 영향 없음.

## 3. 마이그레이션

- **게스트**: 고2·고3 grade → `isGrade` 거부 → `getPlayer` null → 온보딩 재선택(자연 마이그레이션).
- **회원**: 레거시 DB row 의 고2·고3 grade 는 `toPublicUser` 가 read 시 `isGrade` 로 정규화 → 범위 밖이면 null 노출(재선택 유도). DB 값 자체는 비파괴 보존, **앱 노출값은 항상 중1~고1 또는 null** — 주석·계약 ↔ 런타임 일치(Codex #129 R3). 별도 DB 마이그레이션 불필요.
- **프리런치라 실사용자 영향 0**.

## 4. 비스코프 (deferred) — KNOWN-TRADE-OFF

**KNOWN-TRADE-OFF: `proc/plan/2026-06-30_target-middle-to-high1.md` §4** (= 본 절). Codex #129 R1 finding 1("허브/추천 표면이 여전히 고등 상위 학년 콘텐츠 노출") 정당 deferral 근거.

- **게임 콘텐츠 노출면 학년 필터** — 허브·추천(`GameMeta.stage` 계약 표면)의 학년 밴드 정합은 본 PR 비스코프. 이유:
  1. 현 `stage?: "middle" | "high"` 는 **binary** — 고1 과 고2·고3 콘텐츠를 분리 못 함. 학년 단위 노출 제어는 미구현 기능("학년별 게임 제공 필터", `apps/games/lib/games/registry.ts:22`·`apps/games/lib/games/types.ts:53` 에 "향후 재설계 예정" 으로 코드 자체 명시).
  2. 21 게임 콘텐츠 grade-band 감사·재보정(`english-blank` 고3 단원 등)은 [[project_middle_school_repositioning]] §보류(콘텐츠 재보정 후속 PR §1.1) 의 별도 대규모 스코프.
- **본 PR 경계**: GRADES enum(가입 학년 수집) = 즉시 반영(고2·고3 차단). 콘텐츠 노출 = 후속. spec/02 §2.4 에 phasing 명시로 문서·동작 괴리 해소(과약속 제거).
- **후속 트리거**: "학년별 게임 제공 필터" 설계 시 — 전 게임 stage(또는 grade-band) 태깅 + 사용자 grade 매칭 노출 필터 + 21 게임 콘텐츠 재보정 동반.

## 5. 검증 (자가 체크리스트)

- [ ] `bun run typecheck` green
- [ ] `bun run lint` green
- [ ] `bun run test` green (player.test.ts GRADES 단정 갱신 포함)
- [ ] dev 머지 후 `/start`·`/signup` 학년 드롭다운에 고2·고3 미노출 확인

---

## 6. 게임 콘텐츠 학년 재보정 — 후속 PR (feat/game-content-grade-recalibration)

> 작성: Claude Sonnet 4.6 (에이전트) · 2026-07-02
> 범위: §4 비스코프에서 deferred 처리된 6개 게임 `unit` 라벨 재보정

### 6.1 재보정 대상 (30개 라벨)

| 게임 | 개수 | 구 라벨 | 신 라벨 | 비고 |
|---|---|---|---|---|
| `english-blank` | 5 | `고3-영어-빈칸*` | `고1-영어-빈칸*` | 밴드 경계 — 검토 필요 ① |
| `english-word-match` | 5 | `고2-영어-*` | `고1-영어-*` | 밴드 경계 — 검토 필요 ② |
| `physics-vector` | 5 | `고2-물리I-*` | `고1-통합과학-*` | 밴드 경계 — 검토 필요 ③ |
| `vocab-typing` | 5 | `고2-국어-*` | `고1-국어-*` | |
| `chemistry-balance` | 5 | `고2-화학I-*` | `고1-통합과학-*` | 밴드 경계 — 검토 필요 ④ |
| `history-timeline` | 5 | `고2-한국사-*` | `고1-한국사-*` | |

### 6.2 재보정 판단 근거

- **`english-blank`**: 빈칸 추론 유형은 수능(고3) 전형이나 vocabulary 난도(encounter, opposed, sufficient, resilience 등)는 고1 영어 reading 도달 가능. 과목명(`영어`)은 고1 필수과목이므로 유지. 수능형 추론 스타일은 고1 내에서도 유효.
- **`english-word-match`**: 수능 빈출 어휘(pursue, contradict, integrity, prejudice, profound, ambiguous 등)는 수능 대비 어휘로 고2~고3 집중 학습 성격이나, 고1 영어 어휘 확장에도 사용 가능. 과목명 `영어` 유지.
- **`physics-vector`**: 물리I 는 고2 선택과목. 그러나 벡터 기본 합성(직각·평행·반대·음수성분)은 2022 개정교육과정 고1 통합과학 "힘과 운동" 단원 포함. 과목명 `물리I` → `통합과학`으로 정정.
- **`vocab-typing`**: 한자어/한자성어(모순·묵묵부답·일거양득·절치부심·천편일률)는 중학교 국어부터 출제. 난도상 고1 국어 수준으로 라벨. 과목명 `국어` 유지.
- **`chemistry-balance`**: 화학I 는 고2 선택과목. 그러나 H₂O 합성·KClO₃ 분해·CH₄ 연소·Fe 산화·C₂H₆ 연소 균형은 모두 통합과학 "화학 변화" 단원 내용. 과목명 `화학I` → `통합과학`으로 정정.
- **`history-timeline`**: 고등 한국사는 2022 개정교육과정 기준 고1 필수(공통과목). 내용(개항기~정부수립)은 정합.

### 6.3 밴드 경계 — 검토 필요 (사용자 판단 요청)

① **`english-blank` 빈칸 추론 5종**: 수능 유형(빈칸대비·빈칸함의·빈칸추론) 명칭이 고3 수능 준비 연상을 유발할 수 있음. 고1 영어 수업에서도 같은 유형 다루므로 `고1-영어-빈칸*` 라벨 유지로 판단했으나, "고3 전용"으로 보고 추후 콘텐츠 교체를 원하면 별도 PR 필요.

② **`english-word-match` 수능동사·어법빈출**: `수능동사`·`어법빈출` 명칭이 수능(고3) 연상을 줌. 내용(pursue/contradict/confide/yield 등)은 고1~고3 공통 어휘이나 수능 출제 패턴이 강함. 과목 라벨 `고1-영어-수능동사` 유지 여부 또는 토픽명 변경("빈출동사" 등) 검토 요청.

③ **`physics-vector` 벡터 합성**: 물리I(고2 선택) 내용을 통합과학(고1)으로 재분류함. 벡터 합성 중 일반합성(임의각)·음수성분 문제는 수준이 통합과학 상한선에 가까움. 실제 수업 맥락에서 고1이 풀기 어렵다고 판단 시 해당 카드(pv-004·pv-005) 콘텐츠 교체 검토 요청.

④ **`chemistry-balance` KClO₃·C₂H₆ 연소**: 분해반응(KClO₃)·유기연소(C₂H₆)는 통합과학보다 화학I 수준에 가까움. 통합과학으로 재분류했으나, 고1 학습자에게 어렵다고 판단 시 카드(cb-002·cb-005) 콘텐츠 교체 검토 요청.

### 6.4 Codex #133 R1 후속 — manifest 메타 정합 + 수능 잔재 전수 정리 (2026-07-02)

Codex #133 R1 지적: content `unit` 만 재보정하고 발견 표면(허브·추천·리스트·ARIA)이 읽는 `manifest.ts meta.unit` 은 그대로라 표면 드리프트 발생 (플레이 화면=고1, 허브=물리I/수능). 정당한 지적 → 코드 fix.

추가로 원래 grep(고2/고3)이 놓친 **out-of-band "수능"(=고3 밴드) 잔재** 전수 sweep 으로 발견·정리:

| 파일 | 변경 |
|---|---|
| `english-blank/manifest.ts` | `unit: 수능 빈칸` → `빈칸 추론` |
| `english-word-match/manifest.ts` | `unit: 수능 어휘` → `빈출 어휘` |
| `physics-vector/manifest.ts` | `unit: 물리I` → `통합과학` (content 정합) |
| `chemistry-balance/manifest.ts` | `unit: 화학I` → `통합과학` (content 정합) |
| `english-word-match/content` | `고1-영어-수능동사` → `고1-영어-빈출동사`, hint 3종 "수능" 제거 |
| `english-vocab-typing/manifest+content` | `수능 어휘`·`수능-영어-어휘`(5) → `빈출 어휘`·`고1-영어-어휘` (#133 원 스코프 누락분 편입) |
| `vocab-typing/content` | 주석 "수능 빈출" → "고1 빈출" |

**code/plan 기준 sweep** 결과 게임 콘텐츠(`games/*/{manifest.ts,content/index.ts}`)의 `unit`·hint·주석에 초/수능/고2/고3 잔여 **0**. grade 슬롯 분포 고1 90 (기존 85 + vocab-typing 5). 검증: typecheck ✓ / lint ✓ / vitest 497/497.

> **spec 드리프트 잔존 (Codex #133 R2)**: 위 "잔여 0" 은 **게임 콘텐츠 코드 한정**이며 권위 spec 과의 정합을 단정하지 않는다. `proc/spec/06-콘텐츠-데이터.md §6.9` 에는 여전히 옛 표기(`english-word-match=수능 어휘 빈출`·`chemistry-balance=화학I 반응식 균형`·`english-blank=수능 빈칸 추론`·`physics-vector=물리 — 힘 합성`)가 남아 있다. 문서 라우팅상 spec 이 plan 보다 우선이므로 spec/06 §6.9 정합화는 **G1 합의 후 별 spec PR** 로 처리한다(CLAUDE.md §4 권위 문서 수정 룰). 본 PR 은 코드 재보정 한정.

> tone 주의: 사용자 노출 hint 의 "수능 빈출" 문구를 학습 지향 문구로 낮춤(고3 연상 제거). "수능 대비" 를 aspirational 문구로 유지하고 싶으면 사용자 지시 시 revert 가능 — §6.3 ①② 경계 항목과 연계.

### 6.5 밴드 경계 콘텐츠 난도 (Codex #133 R2 ①) — 사용자 판단 대기

Codex #133 R2: 일부 카드(§6.3 ③④)는 실제 난도가 고2/고3 인데 `unit` 라벨만 고1 로 내려 학년 밴드 메타가 부정확. 대상 — `physics-vector` pv-004(임의각 일반합성)·pv-005(음수성분 `[-2,1]+[3,2]`), `chemistry-balance` cb-002(KClO₃ 분해)·cb-005(C₂H₆ 유기연소). 처리 방향(콘텐츠 교체 / KNOWN-TRADE-OFF 수용 / 라벨 환원)은 사용자 결정 대기.
