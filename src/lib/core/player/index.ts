// 게스트 플레이어 프로필 — 입구 인증 모델(arcade 미러, 2026-06-01).
// plan: proc/plan/2026-06-01_arcade-entry-model.md. spec/05 §5.2.
// 회원가입 없이 닉네임+학년으로 게스트 신원을 만든다(localStorage). fingerprint 는 부속 신호.
// arcade 패턴 차용 — 코드 복사 아님, games 네이티브.

const STORAGE_KEY = "pullim-games:player";

export const GRADES = [
  "초1", "초2", "초3", "초4", "초5", "초6",
  "중1", "중2", "중3",
  "고1", "고2", "고3",
] as const;

export type Grade = (typeof GRADES)[number];

export type Player = {
  nickname: string;
  grade: Grade;
  /** 만 14세 이상 자가확인(정통망법) — 미만이면 보호자 동의 간주. */
  over14: boolean;
  createdAt: number;
};

export const NICKNAME_MAX = 12;

export function isGrade(v: unknown): v is Grade {
  return typeof v === "string" && (GRADES as readonly string[]).includes(v);
}

/** 닉네임 검증 — 1~12자, 공백만 불가. */
export function validateNickname(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (value.length === 0) return { ok: false, error: "닉네임을 입력해주세요." };
  if (value.length > NICKNAME_MAX) return { ok: false, error: `닉네임은 ${NICKNAME_MAX}자 이하예요.` };
  return { ok: true, value };
}

/** 현재 게스트 프로필. 없거나 SSR 이면 null. */
export function getPlayer(): Player | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Player>;
    if (typeof p.nickname !== "string" || !isGrade(p.grade)) return null;
    return {
      nickname: p.nickname,
      grade: p.grade,
      over14: p.over14 === true,
      createdAt: typeof p.createdAt === "number" ? p.createdAt : 0,
    };
  } catch {
    return null;
  }
}

/** 게스트 프로필 생성·저장. 실패해도 객체는 반환(휘발성). */
export function createPlayer(nickname: string, grade: Grade, over14: boolean): Player {
  const player: Player = { nickname, grade, over14, createdAt: nowMs() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  } catch {
    /* localStorage 거부 — 휘발성 진행 */
  }
  return player;
}

export function clearPlayer(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

function nowMs(): number {
  return new Date().getTime();
}
