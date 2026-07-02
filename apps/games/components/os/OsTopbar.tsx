"use client";

// 상단 바 우측 액션 — pullim-web src/components/os/OsTopbar.tsx 구조 이식 + games 어댑트.
// pullim-web 은 CommandPalette·Notifications·useSession 을 얹지만 games 는 해당 백엔드가 없어
// 검색·알림을 disabled placeholder("준비 중", 기존 AppHeader 정합)로 두고, 아바타 메뉴만
// games auth(@/lib/auth/client · @/lib/core/player)로 배선한다.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getAuthState, logout, type AuthUser } from "@/lib/auth/client";
import { getPlayer, resetGuestSession, type Player } from "@/lib/core/player";

function initialOf(s: string, fallback: string): string {
  const t = (s || "").trim();
  return t ? Array.from(t)[0] : fallback;
}

export function OsTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 경로 변화마다 재조회 → 로그인/로그아웃 상태 헤더 갱신(hard refresh 없이).
  useEffect(() => {
    let alive = true;
    setPlayer(getPlayer());
    getAuthState().then(({ user: u, unavailable: un }) => {
      if (alive) {
        setUser(u);
        setUnavailable(un);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [pathname]);

  // 외부 클릭 / Esc → 메뉴 닫기.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isMember = Boolean(user);
  const isGuest = !user && Boolean(player);

  async function onLogout() {
    setBusy(true);
    const ok = await logout();
    if (ok) {
      setUser(null);
    } else {
      const st = await getAuthState();
      setUser(st.user);
      setUnavailable(st.unavailable);
    }
    setBusy(false);
    setMenuOpen(false);
    router.refresh();
  }

  // 게스트 나가기 — 이 기기의 게스트 진행도(SRS·스트릭·활동·커스텀) 전부 삭제. 파괴적 → 확인 1회.
  function onGuestExit() {
    const ok = window.confirm(
      "이 기기의 게스트 학습 기록(진행도·스트릭·커스텀 카드)을 모두 지우고 나갈까요? 되돌릴 수 없어요.",
    );
    if (!ok) return;
    resetGuestSession();
    setPlayer(null);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const initial = !loaded
    ? "풀"
    : isMember
      ? initialOf(user!.email, "풀").toUpperCase()
      : isGuest
        ? initialOf(player!.nickname, "게")
        : "게";
  const displayName = isMember ? user!.email : isGuest ? `${player!.nickname} (게스트)` : "게스트";
  const modeLabel = isMember ? "로그인됨" : "게스트 모드";
  // auth 미확정(게스트도 없음) — 로그인/게스트 어느 쪽도 단정 불가.
  const neutral = loaded && !user && !player && unavailable;

  return (
    <div className="tb-actions">
      {/* 검색 — 준비 중(placeholder) */}
      <button className="icon-btn" aria-label="검색 (준비 중)" title="검색 — 준비 중" disabled style={{ opacity: 0.55 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" />
        </svg>
      </button>

      {/* 알림 — 준비 중(placeholder) */}
      <button className="icon-btn" aria-label="알림 (준비 중)" title="알림 — 준비 중" disabled style={{ opacity: 0.55 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      </button>

      {/* 로드 전 / 중립 — 레이아웃 시프트 방지 placeholder */}
      {!loaded || neutral ? (
        <span aria-hidden className="avatar" style={{ opacity: 0.4 }} />
      ) : (
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="avatar"
            aria-label={`${displayName} 메뉴`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {initial}
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="사용자 메뉴"
              className="card"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "min(280px, 92vw)",
                padding: 0,
                zIndex: 120,
                boxShadow: "var(--sh-3)",
                overflow: "hidden",
              }}
            >
              {/* Identity */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontWeight: 700, fontSize: 14, wordBreak: "break-all" }}>{displayName}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {modeLabel}
                </div>
              </div>

              {/* 게스트 전용 — 로그인/회원가입 진입 */}
              {!isMember && (
                <nav style={{ padding: 6, borderBottom: "1px solid var(--line)" }} aria-label="계정 진입">
                  {[
                    { href: "/login", label: "로그인" },
                    { href: "/signup", label: "회원가입" },
                  ].map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: "block",
                        padding: "10px 12px",
                        borderRadius: "var(--r-sm)",
                        color: "var(--ink)",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
              )}

              {/* 회원 — 로그아웃 */}
              {isMember && (
                <div style={{ padding: 6 }}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onLogout}
                    disabled={busy}
                    className="btn btn-ghost btn-sm"
                    style={{ width: "100%", justifyContent: "flex-start", color: "var(--ink-2)" }}
                  >
                    {busy ? "…" : "로그아웃"}
                  </button>
                </div>
              )}

              {/* 게스트 — 기록 지우고 나가기(파괴적) */}
              {isGuest && (
                <div style={{ padding: 6 }}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onGuestExit}
                    title="이 기기의 게스트 학습 기록을 모두 지우고 나갑니다"
                    className="btn btn-ghost btn-sm"
                    style={{ width: "100%", justifyContent: "flex-start", color: "var(--danger)" }}
                  >
                    기록 지우고 나가기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
