// 결제·구독 알림 신청 스키마.
// SPEC §05.6 알림 신청 + §05.7.5 외부 메일 서비스 위임 정책.
//
// 정책 핵심 (필독, 2026-05-20 정책 갱신):
// - 본 서버는 이메일을 저장하지 않는다. 외부 메일 서비스(Resend)에 즉시 위임 후 변수 폐기.
// - `.strict()` 적용 — 정의되지 않은 필드 동봉 시 422 거부 (PII 누수 0 보장).
// - 단방향 hash 모델은 폐기 (Codex 지적 #1 — hash 만으로는 실제 메일 발송 불가).

import { z } from "zod";

/** 알림 신청 액션 (확장 시 z.union 으로 확장). */
export const BillingNotifyActionSchema = z.literal("billing.notify.signup");

/** 알림 신청 트리거 출처. 분석용 메타데이터. */
export const BillingNotifySourceSchema = z.enum(["billing-cta"]);

/**
 * 출시 알림 신청 페이로드.
 *
 * `email` 은 plain text (RFC 5322 단순 검증) — 라우트는 수신 즉시 Resend API 로 위임 후
 * 변수 폐기한다. 본 서버 DB·KV·파일·로그 어디에도 잔존하지 않는다 (SPEC §05.7.5).
 *
 * **반드시 `.strict()` 적용** — `{ email, source, secret: '...' }` 같은 추가 필드 동봉을
 * 거부해야 PII 누수를 막을 수 있다 (Codex 지적 #2).
 */
export const BillingNotifySignupSchema = z
  .object({
    action: BillingNotifyActionSchema,

    /** 신청자 이메일. 수신 즉시 Resend 위임 후 폐기. */
    email: z
      .string()
      .trim()
      .min(3, "email is required")
      .max(254, "email exceeds RFC 5321 limit (254)")
      // RFC 5322 단순화 — 로컬@도메인.tld 최소 검증 (Resend 측에서도 재검증).
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "invalid email format"),

    /** 신청 출처. 다른 진입점 추가 시 enum 확장. */
    source: BillingNotifySourceSchema,

    /** 클라이언트 시각 ms (분석용 메타데이터). */
    ts: z.number().int().nonnegative(),
  })
  .strict();

export type BillingNotifySignup = z.infer<typeof BillingNotifySignupSchema>;
