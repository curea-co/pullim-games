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
  /**
   * 동의 플래그(정통망법) — "만 14세 이상" 또는 "만 14세 미만이며 보호자 동의 완료"를 의미한다.
   * over14 boolean 이 거짓 나이를 기록하던 문제(Codex #114 R1)를 피하려 honest 단일 동의로 둔다.
   * 연령대 자체는 `grade` 로 보존(예: 초등은 만14세 미만으로 간주 → 보호자 동의 필요).
   */
  consent: boolean;
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
      consent: p.consent === true,
      createdAt: typeof p.createdAt === "number" ? p.createdAt : 0,
    };
  } catch {
    return null;
  }
}

/**
 * 게스트 프로필 생성·저장. **localStorage 영속에 실패하면 `null` 반환**(Codex #114 R1):
 * Safari private mode 등에서 write 가 조용히 무시되면, 저장 안 됐는데 성공처럼 진행 →
 * /start→/home→무신원 재판정 무한루프가 난다. write 후 read-back 으로 실제 영속을 확인한다.
 */
export function createPlayer(
  nickname: string,
  grade: Grade,
  consent: boolean,
): Player | null {
  const player: Player = { nickname, grade, consent, createdAt: nowMs() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  } catch {
    return null; // 쓰기 거부 — 게스트 신원 영속 불가
  }
  // read-back: setItem 이 throw 안 해도 실제로 안 남는 환경(일부 private mode) 차단.
  if (!getPlayer()) return null;
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
