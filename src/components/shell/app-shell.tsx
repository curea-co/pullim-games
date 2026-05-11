// 통합 앱 shell — pullim-study-demo AppShell 패턴 차용.
//
// 반응형:
// - 모바일 (xs/sm): 헤더(햄버거) + 본문
// - 태블릿 (md): 헤더 + 사이드바 (축약, 아이콘만) + 본문
// - 데스크탑 (lg+): 헤더 + 사이드바 (전체) + 본문
//
// 콘텐츠 폭: max 1280px (4K·울트라와이드 과확장 방지).

import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { Breadcrumb } from "./breadcrumb";
import type { Role } from "./nav-config";

interface Props {
  role: Role;
  children: ReactNode;
}

const CONTENT_MAX = "mx-auto w-full max-w-[1280px]";

export function AppShell({ role, children }: Props) {
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

          {/* 페이지 콘텐츠 */}
          <div className={CONTENT_MAX}>{children}</div>
        </div>
      </div>
    </div>
  );
}
