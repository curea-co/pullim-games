// 게스트 플레이어 프로필 — 입구 인증 모델(arcade 미러, 2026-06-01).
// plan: proc/plan/2026-06-01_arcade-entry-model.md. spec/05 §5.2.
// 회원가입 없이 닉네임+학년으로 게스트 신원을 만든다(localStorage). fingerprint 는 부속 신호.
// arcade 패턴 차용 — 코드 복사 아님, games 네이티브.

const STORAGE_KEY = "pullim-games:player";
// 게스트 신원 힌트 쿠키(non-HttpOnly) — middleware 가 서버에서 입구 게이트를 판정하게 한다
// (Codex #114 R4: 클라 useEffect-only 게이트는 직접요청·JS off 에서 계약 불충족).
export const GUEST_COOKIE = "pullim_games_guest";
const GUEST_TTL_DAYS = 180;
// 게스트 신원에 묶인 모든 로컬 데이터 prefix — "다른 사용자로 시작" 시 일괄 초기화.
const LOCAL_PREFIX = "pullim-games:";

// 타겟 학령 = 중등(중1~중3). 초등은 풀림 주니어(별도 앱), 고등은 대상 아님.
// 근거: proc/plan/2026-06-23_middle-school-repositioning.md (G1 결정 2026-06-23).
// 구 grade 값(초·고)을 보유한 기존 게스트는 isGrade 가 거부 → getPlayer null →
// 온보딩 재선택으로 자연 마이그레이션(프리런치라 실사용자 영향 없음).
export const GRADES = ["중1", "중2", "중3"] as const;

export type Grade = (typeof GRADES)[number];

export type Player = {
  nickname: string;
  grade: Grade;
  /**
   * 동의 플래그(정통망법) — "만 14세 이상" 또는 "만 14세 미만이며 보호자 동의 완료"를 의미한다.
   * over14 boolean 이 거짓 나이를 기록하던 문제(Codex #114 R1)를 피하려 honest 단일 동의로 둔다.
   * 연령대 자체는 `grade` 로 보존(예: 중1≈13세는 만14세 미만일 수 있어 보호자 동의 필요).
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
    if (!raw) {
      // 프로필은 없는데 게스트 쿠키만 남은 stale 상태(스토리지 외부 삭제·브라우저 eviction).
      // middleware 는 쿠키 존재만으로 /home·/games/[id] 를 통과시키므로 그대로 두면 무프로필
      // split-brain(+ auth 장애 시 fail-open). 쿠키 + 잔여 로컬 진행도까지 정리한다(R7·R11).
      if (hasGuestCookie()) resetGuestSession();
      return null;
    }
    const p = JSON.parse(raw) as Partial<Player>;
    if (typeof p.nickname !== "string" || !isGrade(p.grade)) {
      // 저장된 프로필이 무효(구 grade 초·고 등) — **프로필·쿠키뿐 아니라 그 신원에 묶인 모든
      // 로컬 진행도(SRS·스트릭·활동·커스텀, `pullim-games:*`)까지 비운다**(resetGuestSession, R11).
      // clearPlayer 만 쓰면 학습 데이터가 남아, 온보딩을 다시 한 새 중등 프로필이 이전(고1 등)
      // 사용자의 진행도를 그대로 이어받아 신원·학습 기록이 섞이고 보관한 고등 게임 기록이 홈에
      // 재등장한다. + 무효 프로필이 남기던 stale 쿠키 split-brain(Codex #125) 도 함께 해소.
      resetGuestSession();
      return null;
    }
    return {
      nickname: p.nickname,
      grade: p.grade,
      consent: p.consent === true,
      createdAt: typeof p.createdAt === "number" ? p.createdAt : 0,
    };
  } catch {
    // 파싱 불가(손상) 프로필도 동일하게 신원+로컬 진행도를 전부 정리한다(교차 신원 혼입 차단).
    resetGuestSession();
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
  // middleware 서버 게이트는 `pullim_games_guest` 쿠키 존재를 전제로 한다. 쿠키 쓰기가 조용히
  // 무시되는 환경(쿠키 차단)이면 localStorage(=CSR 이동)는 되지만 새로고침·직접진입에서
  // middleware 가 무신원으로 튕기는 split-brain 이 난다. 쿠키도 read-back 으로 확인하고,
  // 안 박히면 게스트 신원 영속 실패로 보고 null 반환(Codex #114 R5). StartForm 이 안내한다.
  setGuestCookie(true);
  if (!hasGuestCookie()) {
    clearPlayer(); // 부분 상태(player만 남음) 정리.
    return null;
  }
  return player;
}

function hasGuestCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim() === `${GUEST_COOKIE}=1`);
}

export function clearPlayer(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  setGuestCookie(false);
}

/**
 * "다른 사용자로 시작"(공용 기기) — 게스트 프로필뿐 아니라 **fingerprint 와 그에 묶인 모든
 * 로컬 진행도(SRS·스트릭·활동·커스텀 등 `pullim-games:*`)를 일괄 초기화**한다(Codex #114 R4).
 * 그러지 않으면 다음 게스트가 이전 사용자의 학습 기록을 그대로 이어받는다.
 */
export function resetGuestSession(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(LOCAL_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* noop */
  }
  setGuestCookie(false);
}

function setGuestCookie(present: boolean): void {
  if (typeof document === "undefined") return;
  const secure = window.location?.protocol === "https:" ? "; Secure" : "";
  document.cookie = present
    ? `${GUEST_COOKIE}=1; Path=/; Max-Age=${GUEST_TTL_DAYS * 24 * 60 * 60}; SameSite=Lax${secure}`
    : `${GUEST_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

function nowMs(): number {
  return new Date().getTime();
}
