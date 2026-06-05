// 학습 데이터 동기화 입력 검증 (zod) + 용량 한도(D6).
// 근거: proc/plan/2026-06-05_learning-data-server-sync.md §4.4.
import "server-only";
import { z } from "zod";

// D6 용량 한도 — 커스텀 콘텐츠 DB 비대화 방지(스냅샷 교체 모델).
export const LIMITS = {
  cards: 2_000,
  subjects: 50,
  curriculum: 1_000,
  cardPayloadBytes: 16 * 1024, // 카드 1장 남용 방어선
  snapshotBytes: 4 * 1024 * 1024, // 스냅샷 총 거부선
  srsBatch: 500, // 1회 push SRS 카드 수(델타). 과대 배치로 body limit 치는 것 방지(R6).
  bodyBytes: Math.floor(4.5 * 1024 * 1024), // 전체 요청 body 상한(Vercel 함수 한도 정렬, R6).
} as const;

// epoch ms. 먼 미래(clock skew/오염) 거부 — recency 기준 조건부 머지에서 미래값이 영구
// "최신"으로 굳어 정상 업데이트를 막는 것 방지(오늘+1일 grace 까지 허용, R8).
const epochMs = z
  .number()
  .int()
  .nonnegative()
  .refine((v) => v <= Date.now() + 24 * 60 * 60 * 1000, "미래 시각은 허용되지 않습니다");
// Postgres int4 컬럼(review_count·current·longest·count)로 내려가므로 상한 cap(R6).
// 없으면 3e9 같은 값이 zod 통과 후 DB overflow → 503 으로 뭉개짐. 클라 오염을 422 로 정규화.
const int4NonNeg = z.number().int().nonnegative().max(2_147_483_647);

// "YYYY-MM-DD" — 포맷 + **실제 달력 날짜**까지 검증(R5). 정규식만으로는 2026-99-99 통과 →
// 문자열 비교 로직(activity purge / streak 머지)에서 미래 버킷처럼 취급돼 오염될 수 있다.
function isRealCalendarDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [, y, mo, d] = m.map(Number) as [number, number, number, number];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  // UTC 로 구성해 month/date round-trip 일치 확인(2월 30일 등 거부).
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}
// 미래 날짜 상한 — 먼 미래 date 가 들어오면 streak.lastActiveDate 비교를 영구 막거나
// activity 미래 버킷이 영구 보존/집계된다(R6). 클라 로컬이 UTC 보다 앞설 수 있어(TZ)
// **오늘(UTC)+1일 grace** 까지만 허용, 그 너머(먼 미래=오염/악의)는 거부.
function notFarFuture(s: string): boolean {
  const max = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return s <= max;
}
const dateBucket = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
  .refine(isRealCalendarDate, "유효한 날짜가 아닙니다 (YYYY-MM-DD)")
  .refine(notFarFuture, "미래 날짜는 허용되지 않습니다");

// fsrsCard — 클라 SerializedState.fsrsCard(ts-fsrs Card 직렬화). 임의 JSON 을 그대로
// 받으면 손상된 payload 가 저장돼 다음 pull 에서 deserialize()(src/lib/core/storage/srs.ts)
// 가 깨지므로(R6), 필수 키/타입을 명시 검증한다. due/last_review 는 ISO 문자열(파싱 가능).
const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "ISO 날짜가 아닙니다");
const fsrsCardSchema = z
  .object({
    due: isoDate,
    stability: z.number(),
    difficulty: z.number(),
    elapsed_days: z.number(),
    scheduled_days: z.number(),
    reps: int4NonNeg,
    lapses: int4NonNeg,
    state: z.number().int().min(0).max(3),
    last_review: isoDate.nullable().optional(),
    learning_steps: z.number().int().nonnegative().optional(), // v4 데이터엔 누락 가능
  })
  .passthrough() // last_elapsed_days 등 ts-fsrs 부가 필드 허용(전방호환)
  .refine(
    (v) => Buffer.byteLength(JSON.stringify(v), "utf8") <= LIMITS.cardPayloadBytes,
    `카드 데이터가 너무 큽니다 (${LIMITS.cardPayloadBytes}바이트 이하)`,
  );

// SRS — SerializedState 1장(서버 contract: lastReviewAt 은 epoch ms, fsrsCard 는 위 스키마).
const srsCardInput = z.object({
  gameId: z.string().min(1).max(128),
  cardId: z.string().min(1).max(256),
  fsrsCard: fsrsCardSchema,
  reviewCount: int4NonNeg,
  lastReviewAt: epochMs.nullable(),
});

const streakInput = z.object({
  current: int4NonNeg,
  longest: int4NonNeg,
  lastActiveDate: dateBucket.nullable(),
});

const activityInput = z.object({
  gameId: z.string().min(1).max(128),
  date: dateBucket,
  count: int4NonNeg.refine((n) => n > 0, "count 는 1 이상"),
});

// 커스텀 — CustomDataExport 스냅샷 전량. 항목 수 한도 + exportedAt revision.
// exportedAt(클라 export 시각, ISO)을 server 가 비교해 **오래된 스냅샷은 거부**(R8) —
// 없으면 늦게 도착한 stale 세션이 최신 편집을 통째로 덮음. 미래값은 거부(굳음 방지).
const customSnapshot = z
  .object({
    version: z.literal(1),
    exportedAt: isoDate.refine(
      (s) => Date.parse(s) <= Date.now() + 24 * 60 * 60 * 1000,
      "미래 시각은 허용되지 않습니다",
    ),
    subjects: z.array(z.record(z.unknown())).max(LIMITS.subjects),
    curriculum: z.array(z.record(z.unknown())).max(LIMITS.curriculum),
    cards: z.array(z.record(z.unknown())).max(LIMITS.cards),
  })
  .passthrough();

// POST /api/sync — push 배치. 비어있는 리소스는 생략 가능. device_id 는 활동 카운터 키.
export const syncPushSchema = z
  .object({
    deviceId: z.string().min(1).max(128),
    srs: z.array(srsCardInput).max(LIMITS.srsBatch).optional(),
    streak: streakInput.optional(),
    activity: z.array(activityInput).max(2_000).optional(),
    custom: customSnapshot.optional(),
  })
  .strict();

export type SyncPushBody = z.infer<typeof syncPushSchema>;

// 스냅샷 바이트 상한(스키마 후 별도 검사 — JSON 직렬화 크기).
export function customSnapshotTooLarge(snapshot: unknown): boolean {
  return Buffer.byteLength(JSON.stringify(snapshot), "utf8") > LIMITS.snapshotBytes;
}
