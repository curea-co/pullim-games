"use client";

// 풀림 OS 셸(default 크롬) — pullim-web src/components/os/OsShell.tsx 구조 이식 + games 어댑트.
// topbar(레일 토글 + mast + ServiceSwitcher + OsTopbar) → shell(rail + main) → 모바일 tabbar.
// mast 워드마크 = 풀림 게임즈(사용자 결정). tabbar 는 rail(studentDomains) CORE 미러.
// game/landing 최소 크롬은 OsAppShell 이 분기 — 본 컴포넌트는 default 전용.
import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ServiceSwitcher } from "./ServiceSwitcher";
import { OsTabbar, type TabbarItem } from "./OsTabbar";
import { OsTopbar } from "./OsTopbar";
import { RailCollapseToggle } from "./RailCollapseToggle";
import { buildBreadcrumb, findActiveNav, studentDomains } from "@/components/shell/nav-config";

interface OsShellProps {
  current?: string; // ServiceSwitcher 하이라이트 slug
  rail?: ReactNode;
  children: ReactNode;
}

export function OsShell({ current = "games", rail, children }: OsShellProps) {
  const pathname = usePathname();
  const active = findActiveNav(pathname, "student");
  const trail = buildBreadcrumb(pathname, "student");

  // 모바일 탭바 = 데스크톱 레일 CORE 미러(홈/게임 허브/관리/소개). 활성은 pathname 추종.
  const tabbarItems: TabbarItem[] = studentDomains.map((item) => {
    const Icon = item.icon;
    return {
      label: item.label,
      href: item.href,
      active: active?.href === item.href,
      icon: <Icon aria-hidden="true" />,
    };
  });

  return (
    <div className="os-root">
      <header className="topbar">
        <RailCollapseToggle />
        <a className="mast" href="/home" aria-label="풀림 게임즈 홈">
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

        <ServiceSwitcher current={current} />

        <div className="spacer" />

        <OsTopbar />
      </header>

      <div className="shell">
        {rail}
        <main className="main">
          {trail.length > 1 && (
            <nav className="crumbs" aria-label="현재 위치">
              {trail.map((node, i) => {
                const isLast = i === trail.length - 1;
                return (
                  <Fragment key={`${node.label}-${i}`}>
                    {i > 0 && <span className="sep">/</span>}
                    {node.href && !isLast ? <a href={node.href}>{node.label}</a> : <span>{node.label}</span>}
                  </Fragment>
                );
              })}
            </nav>
          )}
          {children}
        </main>
      </div>

      <OsTabbar items={tabbarItems} />
    </div>
  );
}
