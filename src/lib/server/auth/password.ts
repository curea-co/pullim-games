// 비밀번호 해시 — bcryptjs cost 12. 평문 저장 금지(spec §5.6).
import "server-only";
import bcrypt from "bcryptjs";

const COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
