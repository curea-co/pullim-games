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

const epochMs = z.number().int().nonnegative();
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
const dateBucket = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
  .refine(isRealCalendarDate, "유효한 날짜가 아닙니다 (YYYY-MM-DD)");

// SRS — 클라 SerializedState(fsrsCard 직렬화) 1장. fsrsCard 내부는 ts-fsrs Card 라
// 형태가 넓어 passthrough 객체로 받되 직렬화 바이트 상한을 카드별로 강제한다(남용 방어).
const srsCardInput = z.object({
  gameId: z.string().min(1).max(128),
  cardId: z.string().min(1).max(256),
  fsrsCard: z
    .record(z.unknown())
    .refine(
      (v) => Buffer.byteLength(JSON.stringify(v), "utf8") <= LIMITS.cardPayloadBytes,
      `카드 데이터가 너무 큽니다 (${LIMITS.cardPayloadBytes}바이트 이하)`,
    ),
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

// 커스텀 — CustomDataExport 스냅샷 전량. 항목 수 한도 적용.
const customSnapshot = z
  .object({
    version: z.literal(1),
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
