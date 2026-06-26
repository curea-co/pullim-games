import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GRADES, GUEST_COOKIE, createPlayer, getPlayer } from "./index";

// 중등 재포지셔닝(2026-06-23) — GRADES 축소에 따른 신원 마이그레이션.
// 근거: proc/plan/2026-06-23_middle-school-repositioning.md + Codex #125.
// 본 리포 vitest 기본 env = node(jsdom 미사용) → window/document 를 최소 stub.
const STORAGE_KEY = "pullim-games:player";

function makeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    get length() {
      return m.size;
    },
    key: (i: number) => Array.from(m.keys())[i] ?? null,
  };
}

// 단일 쿠키 키만 추적하는 최소 cookie jar(본 테스트 범위).
function makeDocument(initial = "") {
  let jar = initial;
  return {
    get cookie() {
      return jar;
    },
    set cookie(v: string) {
      const seg = v.split(";")[0];
      const eq = seg.indexOf("=");
      const k = seg.slice(0, eq).trim();
      const val = seg.slice(eq + 1).trim();
      jar = /max-age=0/i.test(v) || val === "" ? "" : `${k}=${val}`;
    },
  };
}

describe("player — GRADES 중등 한정", () => {
  it("GRADES 는 중1·중2·중3 만 포함(초·고 제외)", () => {
    expect([...GRADES]).toEqual(["중1", "중2", "중3"]);
  });
});

describe("getPlayer — 무효 프로필 마이그레이션(split-brain 차단)", () => {
  let storage: ReturnType<typeof makeStorage>;
  let doc: ReturnType<typeof makeDocument>;

  beforeEach(() => {
    storage = makeStorage();
    doc = makeDocument(`${GUEST_COOKIE}=1`);
    vi.stubGlobal("window", { localStorage: storage, location: { protocol: "http:" } });
    vi.stubGlobal("document", doc);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("구 grade(고1) 프로필 — null + 프로필·쿠키만 정리, 진행도는 보존(R14 회원 안전)", () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ nickname: "민서", grade: "고1", consent: true, createdAt: 1 }),
    );
    // getPlayer 는 동기 호출이라 회원 세션 확인 불가 → 진행도 wipe 금지(세션 살아있는 회원 +
    // stale guest profile 동거 시 회원 데이터 비가역 삭제). 교차사용자 차단은 createPlayer 가 처리.
    storage.setItem("pullim-games:srs:factorization", '{"some":"state"}');
    storage.setItem("pullim-games:streak", '{"current":3}');
    expect(getPlayer()).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull(); // 프로필 정리
    expect(doc.cookie.includes(`${GUEST_COOKIE}=1`)).toBe(false); // 쿠키 정리
    expect(storage.getItem("pullim-games:srs:factorization")).not.toBeNull(); // 진행도 보존
    expect(storage.getItem("pullim-games:streak")).not.toBeNull();
  });

  it("구조 손상 프로필(nickname 누락) — 프로필·쿠키만 정리, 진행도 보존(회원 안전, R12)", () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ grade: "중2", consent: true }));
    storage.setItem("pullim-games:srs:factorization", '{"some":"state"}');
    expect(getPlayer()).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem("pullim-games:srs:factorization")).not.toBeNull(); // 진행도 보존
  });

  it("유효 grade(중2) 프로필은 그대로 반환", () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ nickname: "민서", grade: "중2", consent: true, createdAt: 1 }),
    );
    expect(getPlayer()?.grade).toBe("중2");
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(doc.cookie.includes(`${GUEST_COOKIE}=1`)).toBe(true); // 유효 → 쿠키 보존
  });

  it("손상(파싱 불가) 프로필도 스토리지·쿠키 정리", () => {
    storage.setItem(STORAGE_KEY, "{not-json");
    expect(getPlayer()).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(doc.cookie.includes(`${GUEST_COOKIE}=1`)).toBe(false);
  });

  it("프로필 없음 + 게스트 쿠키 잔존 → 쿠키도 정리(stale split-brain 차단)", () => {
    // beforeEach: storage 빈 + 쿠키=1. 프로필 없는데 쿠키만 남은 stale 상태.
    expect(getPlayer()).toBeNull();
    expect(doc.cookie.includes(`${GUEST_COOKIE}=1`)).toBe(false); // 쿠키 정리됨
  });

  it("프로필·쿠키 모두 없음(완전 무신원) → null, 불필요한 부작용 없음", () => {
    doc = makeDocument(""); // 쿠키도 없음
    vi.stubGlobal("document", doc);
    expect(getPlayer()).toBeNull();
    expect(doc.cookie).toBe(""); // 쿠키가 애초에 없으면 건드리지 않음
  });
});

describe("createPlayer — 새 게스트 = 클린 슬레이트(교차 사용자 차단, R13)", () => {
  let storage: ReturnType<typeof makeStorage>;
  let doc: ReturnType<typeof makeDocument>;

  beforeEach(() => {
    storage = makeStorage();
    doc = makeDocument("");
    vi.stubGlobal("window", { localStorage: storage, location: { protocol: "http:" } });
    vi.stubGlobal("document", doc);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("성공 시: 신원 종속 진행도만 정리, 비용 가드(quota/cache)·프로필은 보존", () => {
    storage.setItem("pullim-games:srs:factorization", '{"old":"state"}');
    storage.setItem("pullim-games:streak", '{"current":9}');
    // 기기 단위 비용 가드 — 새 게스트 재생성으로 리셋되면 일일 한도 우회(R17). 보존돼야 함.
    storage.setItem("pullim-games:llm-quota:2026-06-24", "30");
    storage.setItem("pullim-games:llm-cache:middle::english::1::x::multiple-choice::10", "{}");
    const p = createPlayer("새사람", "중2", true);
    expect(p?.grade).toBe("중2");
    expect(getPlayer()?.grade).toBe("중2"); // 새 프로필 키 보존
    expect(storage.getItem("pullim-games:srs:factorization")).toBeNull(); // 신원 진행도 정리
    expect(storage.getItem("pullim-games:streak")).toBeNull();
    expect(storage.getItem("pullim-games:llm-quota:2026-06-24")).toBe("30"); // 비용 가드 보존
    expect(storage.getItem("pullim-games:llm-cache:middle::english::1::x::multiple-choice::10")).not.toBeNull();
    expect(doc.cookie.includes(`${GUEST_COOKIE}=1`)).toBe(true); // 새 게스트 쿠키 설정
  });

  it("실패 시(쿠키 차단): null 반환 + 기존 진행도 보존(R15 — 생성 실패 데이터 손실 방지)", () => {
    // 쿠키 쓰기가 무시되는 환경 — setGuestCookie 해도 hasGuestCookie=false → createPlayer null.
    const blocked = { get cookie() { return ""; }, set cookie(_v: string) {} };
    vi.stubGlobal("document", blocked);
    storage.setItem("pullim-games:srs:factorization", '{"old":"state"}');
    storage.setItem("pullim-games:streak", '{"current":9}');
    expect(createPlayer("새사람", "중2", true)).toBeNull(); // 신원 생성 실패
    // 생성 실패했으므로 진행도 wipe 미도달 → 기존 데이터 보존.
    expect(storage.getItem("pullim-games:srs:factorization")).not.toBeNull();
    expect(storage.getItem("pullim-games:streak")).not.toBeNull();
  });
});
