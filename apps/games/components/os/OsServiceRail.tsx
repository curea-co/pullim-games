"use client";

// 풀림 OS 사이드바(rail) — pullim-web src/components/os/OsServiceRail.tsx 구조 이식 + games 어댑트.
// pullim-web 은 role lane 토글·entitlement 잠금·OS 서비스 목록을 얹지만, games 는 student 단일 앱이라
// 그 전부를 제거하고 **games 자체 섹션**(홈/게임 허브/관리/소개)만 .nav-item 스타일로 노출한다.
// (사용자 결정: "레이아웃은 pullim-web 그대로, 내용물은 games". 앱-홉은 상단 ServiceSwitcher 가 담당.)
//
// 기존 nav-config 재사용: studentDomains(4 섹션 + lucide 아이콘) + findActiveNav(활성 판정).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { findActiveNav, studentDomains } from "@/components/shell/nav-config";

export function OsServiceRail() {
  const pathname = usePathname();
  const active = findActiveNav(pathname, "student");

  return (
    <nav className="rail" aria-label="풀림 게임즈 메뉴">
      <div className="rail-head">풀림 게임즈</div>
      {studentDomains.map((item) => {
        const Icon = item.icon;
        const isActive = active?.href === item.href;
        return (
          // 내부 games 라우트 — next/link(App Router 클라 전환). 앱-홉만 raw <a>(ServiceSwitcher).
          <Link
            key={item.href}
            className={`nav-item${isActive ? " active" : ""}`}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            title={item.description}
          >
            {/* lucide 아이콘은 os-tokens `.nav-item svg{width:19px}` 로 자동 사이징 */}
            <Icon aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
