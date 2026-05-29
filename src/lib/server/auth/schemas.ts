// games 인증 입력 검증 (zod). 근거: proc/plan/2026-05-29_auth-login-signup.md.
import { z } from "zod";

// 비밀번호: 8~72자(bcrypt 72바이트 한계), 영문+숫자 각 1자 이상.
const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 해요")
  .max(72, "비밀번호는 72자 이하여야 해요")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "비밀번호에 영문과 숫자를 함께 넣어주세요");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("이메일 형식이 올바르지 않아요")
  .max(254, "이메일이 너무 길어요");

// fingerprint: 익명 식별자(UUID 또는 fallback 문자열). 선택값.
const fingerprintSchema = z.string().min(8).max(128).optional();

export const SignupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    // 정보통신망법: 로그인 도입 시 만 14세 이상 확인 (spec §5.6).
    over14: z.literal(true, {
      errorMap: () => ({ message: "만 14세 이상만 가입할 수 있어요" }),
    }),
    fingerprint: fingerprintSchema,
  })
  .strict();

export const LoginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "비밀번호를 입력해주세요").max(72),
    fingerprint: fingerprintSchema,
  })
  .strict();

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
