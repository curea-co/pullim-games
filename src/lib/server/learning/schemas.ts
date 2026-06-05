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
} as const;

const epochMs = z.number().int().nonnegative();
const dateBucket = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

// SRS — 클라 SerializedState(fsrsCard 직렬화) 1장. fsrsCard 내부는 ts-fsrs Card 라
// 형태가 넓어 passthrough 객체로 받되 바이트 상한만 건다.
const srsCardInput = z.object({
  gameId: z.string().min(1).max(128),
  cardId: z.string().min(1).max(256),
  fsrsCard: z.record(z.unknown()),
  reviewCount: z.number().int().nonnegative(),
  lastReviewAt: epochMs.nullable(),
});

const streakInput = z.object({
  current: z.number().int().nonnegative(),
  longest: z.number().int().nonnegative(),
  lastActiveDate: dateBucket.nullable(),
});

const activityInput = z.object({
  gameId: z.string().min(1).max(128),
  date: dateBucket,
  count: z.number().int().positive(),
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
    srs: z.array(srsCardInput).max(5_000).optional(),
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
