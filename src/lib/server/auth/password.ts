// 비밀번호 해시 — bcryptjs cost 12. 평문 저장 금지(spec §5.6).
import "server-only";
import bcrypt from "bcryptjs";

const COST = 12;

// 타이밍 공격 방어용 고정 더미 해시 — 사용자가 없을 때도 동일 비용의 compare 를 태워
// 응답 시간으로 계정 존재 여부를 추정하지 못하게 한다(login 계정 열거 차단).
// 모듈 로드 시 1회 계산(cold start 1회 비용).
const DUMMY_HASH = bcrypt.hashSync("pullim-games-timing-equalizer", COST);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * 상수 시간 비밀번호 검증. hash 가 null(사용자 미존재)이어도 더미 해시로 compare 를
 * 수행해 시간 특성을 맞춘 뒤 false 반환 — 타이밍 기반 계정 열거 차단.
 */
export async function verifyPasswordConstantTime(
  plain: string,
  hash: string | null,
): Promise<boolean> {
  if (hash === null) {
    await bcrypt.compare(plain, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(plain, hash);
}
