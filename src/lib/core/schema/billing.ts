// 결제·구독 알림 신청 스키마.
// SPEC §05.6 알림 신청 + §05.7 결제·구독 정책.
//
// 정책 핵심 (필독):
// - 이메일 원문 저장 금지. 서버는 클라이언트가 보낸 sha256 hash 만 받는다.
// - 6개월 보존 (익명 이벤트 로그 정책과 동일).
// - PII 0 — hash 는 단방향, 역추적 불가.

import { z } from "zod";

/** 알림 신청 액션 (확장 시 z.union 으로 확장). */
export const BillingNotifyActionSchema = z.literal("billing.notify.signup");

/**
 * 출시 알림 신청 페이로드.
 *
 * `emailHash` 는 클라이언트에서 계산한 SHA-256 hex (64자).
 * 원본 이메일은 절대 서버로 전송되지 않는다.
 */
export const BillingNotifySignupSchema = z.object({
  action: BillingNotifyActionSchema,

  /** SHA-256 hash of normalized email (lowercase + trim). hex 64자 고정. */
  emailHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/, "emailHash must be lowercase hex sha-256 (64 chars)"),

  /** 클라이언트 시각 ms (보존 만료 계산 보조). */
  ts: z.number().int().nonnegative(),
});

export type BillingNotifySignup = z.infer<typeof BillingNotifySignupSchema>;
