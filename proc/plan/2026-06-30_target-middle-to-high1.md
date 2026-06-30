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

- 기존 게스트/회원 중 고2·고3 grade: `isGrade` 가 거부 → `getPlayer` null → 온보딩 재선택(자연 마이그레이션). DB 회원 grade 는 read 시 enum 재검증 안 해 크래시 없음(기존 값 보존, 재선택만 막힘). **프리런치라 실사용자 영향 0**.

## 4. 비스코프 (deferred)

- **게임 콘텐츠 학년 재보정** — `english-blank` 의 "고3-영어" unit label 등 고등 콘텐츠. [[project_middle_school_repositioning]] §보류(콘텐츠 재보정 후속 PR §1.1) 스코프. 본 PR 은 GRADES enum(가입 학년 수집)만, 게임 카드 밴드는 미변경.

## 5. 검증 (자가 체크리스트)

- [ ] `bun run typecheck` green
- [ ] `bun run lint` green
- [ ] `bun run test` green (player.test.ts GRADES 단정 갱신 포함)
- [ ] dev 머지 후 `/start`·`/signup` 학년 드롭다운에 고2·고3 미노출 확인
