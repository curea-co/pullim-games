// games 인증 입력 검증 (zod). 근거: proc/plan/2026-05-29_auth-login-signup.md.
import { z } from "zod";
import { isGrade } from "@/lib/core/player";

// 중등 타겟(2026-06-23) — 가입 시 학년 수집·검증. 게스트(/start)와 동일 GRADES(중1~중3).
// isGrade 단일 출처 재사용(드리프트 차단). 근거: proc/plan/2026-06-23_middle-school-repositioning.md.
const gradeSchema = z
  .string({ required_error: "학년을 선택해주세요" })
  .refine(isGrade, "중등(중1~중3) 학년만 선택할 수 있어요");

// bcrypt 72바이트 한계 — 초과 시 뒤가 조용히 잘려 입력≠해시대상. 가입·로그인 공통 적용.
const within72Bytes = (v: string) => new TextEncoder().encode(v).length <= 72;
const BYTES_MSG = "비밀번호가 너무 길어요 (UTF-8 72바이트 이하). 한글·이모지는 더 짧게 입력해주세요";

// 가입 비밀번호: 8자 이상 + 72바이트 이하 + 영문·숫자 각 1자 이상.
const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 해요")
  .refine(within72Bytes, BYTES_MSG)
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "비밀번호에 영문과 숫자를 함께 넣어주세요");

// 로그인 비밀번호: 비어있지 않음 + 72바이트 이하(가입과 동일 truncation 처리로 의미 일치).
const loginPasswordSchema = z
  .string()
  .min(1, "비밀번호를 입력해주세요")
  .refine(within72Bytes, BYTES_MSG);

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
    // 정보통신망법 동의(spec §5.6, 2026-06-23 개정): 게스트(§5.2)와 동일 honest 단일 동의 —
    // "만 14세 이상" 또는 "만 14세 미만 + 보호자 동의". 중등 타겟엔 14세 미만(중1 등)이 포함되어
    // over14 단순 나이 게이트는 타겟 사용자를 차단하므로 동의 모델로 통일(Codex #125 R3, G1 승인).
    consent: z.literal(true, {
      errorMap: () => ({ message: "만 14세 이상이거나 보호자 동의가 필요해요" }),
    }),
    grade: gradeSchema,
    fingerprint: fingerprintSchema,
  })
  .strict();

export const LoginSchema = z
  .object({
    email: emailSchema,
    password: loginPasswordSchema,
    fingerprint: fingerprintSchema,
  })
  .strict();

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
