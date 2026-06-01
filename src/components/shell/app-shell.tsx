"use client";

// 통합 앱 shell — pullim-study-demo AppShell 패턴 차용.
//
// 반응형:
// - 모바일 (xs/sm): 헤더(햄버거) + 본문
// - 태블릿 (md): 헤더 + 사이드바 (축약, 아이콘만) + 본문
// - 데스크탑 (lg+): 헤더 + 사이드바 (전체) + 본문
//
// 콘텐츠 폭: max 1280px (4K·울트라와이드 과확장 방지).
//
// variant:
// - "default": 위 기본 레이아웃
// - "game": 게임 페이지 minimal chrome — 사이드바 미렌더, 헤더 minimal, breadcrumb 제거
// - "landing": `/` 랜딩 — 헤더(로고+로그인 진입)만, 사이드바·breadcrumb 제거, 풀폭 캔버스
//
// 자동 분기: `/games/<id>` 경로면 game variant, `/` 면 landing. override 필요 시 prop 우선.
// 근거: proc/plan/2026-05-11_layout-overhaul.md F2=B, proc/plan/2026-06-01_landing-page.md.

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { Breadcrumb } from "./breadcrumb";
import type { Role } from "./nav-config";

export type AppShellVariant = "default" | "game" | "landing";

interface Props {
  role: Role;
  children: ReactNode;
  /** 명시 override. 미지정 시 pathname 기반 자동 분기. */
  variant?: AppShellVariant;
}

const CONTENT_MAX = "mx-auto w-full max-w-[1280px]";

function detectVariant(pathname: string): AppShellVariant {
  // /games/<id> 는 game mode. /games 자체(허브)는 default.
  // 정규식 대신 split 으로 안전 — pathname.split('/') = ["", "games", "<id>", ...]
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "landing"; // `/` = 랜딩
  if (segments[0] === "games" && segments.length >= 2) return "game";
  return "default";
}

export function AppShell({ role, children, variant }: Props) {
  const pathname = usePathname();
  const mode = variant ?? detectVariant(pathname);

  if (mode === "game") {
    return (
      <div className="flex h-screen flex-col bg-pullim-slate-50">
        <AppHeader role={role} variant="game" />
        {/* GameShell 자체 스크롤 — content section 안에서 overflow. CTA viewport-in 보장. */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    );
  }

  if (mode === "landing") {
    // 랜딩(`/`): 헤더만 유지(로고·로그인 진입), 사이드바·breadcrumb 없는 풀폭 스크롤 캔버스.
    return (
      <div className="flex h-screen flex-col bg-pullim-slate-50">
        <AppHeader role={role} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-pullim-slate-50">
      <AppHeader role={role} />

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 — 데스크탑 전체, 태블릿 축약 */}
        <aside className="hidden shrink-0 border-r border-pullim-slate-200 bg-card md:flex md:w-16 md:flex-col lg:w-60">
          <AppSidebar role={role} className="hidden lg:flex" />
          <AppSidebar role={role} compact className="flex lg:hidden" />
        </aside>

        {/* 본문 — div 로 둠 (game page 컴포넌트가 자기 <main> 가짐, 중첩 회피) */}
        <div className="flex-1 overflow-y-auto">
          {/* breadcrumb */}
          <div className="sticky top-0 z-10 border-b border-pullim-slate-200/70 bg-pullim-slate-50/80 backdrop-blur-md">
            <div
              className={`${CONTENT_MAX} flex h-9 items-center px-4 md:px-6 xl:px-8`}
            >
              <Breadcrumb role={role} />
            </div>
          </div>

          {/* 페이지 콘텐츠 — sticky breadcrumb(h-9 = 36px) 빼고 정확한 사용 가능 높이 전달 */}
          <div className={`${CONTENT_MAX} h-[calc(100%-2.25rem)]`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
