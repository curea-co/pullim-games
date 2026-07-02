// 모바일 하단 탭바 — pullim-web src/components/os/OsTabbar.tsx verbatim 이식.
// <920px 에서 os-tokens.css 가 .tabbar 를 노출(데스크톱은 display:none). rail 의 CORE 미러.
import type { ReactNode } from "react";

export interface TabbarItem {
  label: string;
  href: string;
  icon?: ReactNode;
  active?: boolean;
}

interface OsTabbarProps {
  items: TabbarItem[];
}

export function OsTabbar({ items }: OsTabbarProps) {
  return (
    <nav className="tabbar" aria-label="모바일 탭 메뉴">
      {items.map((item) => (
        <a
          key={item.href + item.label}
          className={item.active ? "active" : undefined}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
        >
          {item.icon}
          {item.label}
        </a>
      ))}
    </nav>
  );
}
