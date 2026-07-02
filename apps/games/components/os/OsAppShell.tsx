"use client";

// 루트 셸 라우터 — 기존 components/shell/app-shell.tsx 의 3-variant 분기(default/game/landing)를
// OS 크롬으로 재구현. pathname 자동 분기:
// - default (홈/게임허브/관리/소개 등): 풀 OsShell(topbar + rail + 모바일 tabbar + breadcrumb).
// - game (/games/<id>): OS topbar(백링크 + mast) + full-bleed content. rail·tabbar 미렌더(게임 몰입).
// - landing (/): 최소 topbar(mast + 계정) + 풀폭 온보딩 스크롤.
import type { ReactNode } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { OsShell } from "./OsShell";
import { OsServiceRail } from "./OsServiceRail";
import { OsTopbar } from "./OsTopbar";
import { DevResetButton } from "../dev/DevResetButton";

type Variant = "default" | "game" | "landing";

function detectVariant(pathname: string): Variant {
  // /games/<id> = game mode. /games 자체(허브)는 default. `/` = 랜딩.
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "landing";
  if (segments[0] === "games" && segments.length >= 2) return "game";
  return "default";
}

function Mast({ href }: { href: string }) {
  return (
    <a className="mast" href={href} aria-label="풀림 게임즈 홈">
      <span className="glyph">
        <Image
          src="/os/icons/pullim.svg"
          alt="풀림 게임즈"
          width={30}
          height={30}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </span>
      <span className="wordmark">풀림</span>
      <span className="sub">게임즈</span>
    </a>
  );
}

export function OsAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mode = detectVariant(pathname);

  if (mode === "game") {
    // 게임 몰입 — GameShell 이 자체 스크롤(h-full) + CTA viewport-in. 부모는 h-screen flex column.
    return (
      <div className="os-root" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <header className="topbar">
          <a href="/games" className="rail-collapse-btn" aria-label="게임 허브로 돌아가기" title="게임 허브로">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </a>
          <Mast href="/home" />
          <div className="spacer" />
        </header>
        <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
        <DevResetButton />
      </div>
    );
  }

  if (mode === "landing") {
    // 랜딩(`/`) 온보딩 — mast(→`/`, 랜딩 우회 방지) + 계정 진입만. 풀폭 자연 스크롤.
    return (
      <div className="os-root">
        <header className="topbar">
          <Mast href="/" />
          <div className="spacer" />
          <OsTopbar />
        </header>
        <div>{children}</div>
        <DevResetButton />
      </div>
    );
  }

  // default — 풀 OS 셸.
  return (
    <>
      <OsShell current="games" rail={<OsServiceRail />}>
        {children}
      </OsShell>
      <DevResetButton />
    </>
  );
}
