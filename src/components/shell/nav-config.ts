// 풀림 게임즈 통합 네비게이션 설정.
//
// pullim-study-demo `nav-config.ts` 패턴 차용 — 단일 nav 진실원.
// V0.4 시점: 풀림 게임즈만 활성, 6개 다른 도메인은 잠금.
// 사이드바·breadcrumb·(향후) 검색이 모두 이 파일을 참조.

import {
  Home,
  Wrench,
  Library,
  CalendarClock,
  BookOpen,
  GraduationCap,
  Sparkles,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";
import { games } from "@/lib/games/registry";

export type NavSubItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
  description?: string;
  locked?: boolean;
};

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  matchPrefix?: string[];
  locked?: boolean;
  description?: string;
  children?: NavSubItem[];
};

export type NavGroup = {
  label: string;
  caption?: string;
  items: NavItem[];
};

export type Role = "student";

/** 사이드바 최상단 — 항상 노출 */
export const studentHomeItem: NavItem = {
  href: "/",
  label: "홈",
  icon: Home,
  description: "오늘의 추천 + 게임 진입",
};

/** 풀림 게임즈 children — registry 에서 자동 발견된 10개 게임 */
const gamesSection: NavSubItem[] = games.map((g) => ({
  href: `/games/${g.meta.id}`,
  label: g.meta.title,
  icon: g.meta.icon,
  description: g.meta.tagline,
  locked: g.meta.status !== "available",
}));

/** 7 도메인 — 게임즈만 활성, 나머지는 V0.5+ 잠금 */
export const studentDomains: NavItem[] = [
  {
    href: "/",
    label: "풀림 게임즈",
    icon: Gamepad2,
    description: "푸는 게 곧 배우는 거예요",
    matchPrefix: ["/games"],
    children: gamesSection,
  },
  {
    href: "/studio",
    label: "풀림 스튜디오",
    icon: Wrench,
    description: "문항·강의 콘텐츠 제작 (준비 중)",
    locked: true,
  },
  {
    href: "/store",
    label: "풀림 스토어",
    icon: Library,
    description: "검증된 학습 콘텐츠 마켓플레이스 (준비 중)",
    locked: true,
  },
  {
    href: "/planner",
    label: "풀림 플래너",
    icon: CalendarClock,
    description: "AI 시간 블록 학습 계획 (준비 중)",
    locked: true,
  },
  {
    href: "/q",
    label: "풀림 Q",
    icon: BookOpen,
    description: "풀이·분석·복습·AI 대화 통합 (준비 중)",
    locked: true,
  },
  {
    href: "/classbot",
    label: "풀림 클래스봇",
    icon: GraduationCap,
    description: "교사가 만든 AI 학습 교실 (준비 중)",
    locked: true,
  },
  {
    href: "/library",
    label: "풀림 라이브러리",
    icon: Sparkles,
    description: "강의·이해용 시청각 자료 (준비 중)",
    locked: true,
  },
];

/** 호환용 — buildBreadcrumb / findActiveSection 등이 단일 그룹 구조 기대 */
export const studentNav: NavGroup[] = [
  { label: "", items: [studentHomeItem, ...studentDomains] },
];

export function navForRole(_role: Role): NavGroup[] {
  return studentNav;
}

/**
 * pathname → 활성 NavItem (children 가 있는 도메인 중 가장 잘 매칭되는 항목).
 * 사이드바가 children 펼치는 기준.
 */
export function findActiveSection(
  pathname: string,
  role: Role,
): NavItem | undefined {
  const nav = navForRole(role);
  let best: NavItem | undefined;
  let bestLen = -1;
  for (const group of nav) {
    for (const item of group.items) {
      if (!item.children) continue;
      // matchPrefix 가 있으면 그 prefix 도 후보
      const candidates = [item.href, ...(item.matchPrefix ?? [])];
      for (const cand of candidates) {
        const matches =
          pathname === cand ||
          (cand !== "/" && pathname.startsWith(cand + "/"));
        if (matches && cand.length > bestLen) {
          best = item;
          bestLen = cand.length;
        }
      }
    }
  }
  return best;
}

/** 라우트 → breadcrumb */
export function buildBreadcrumb(
  pathname: string,
  role: Role,
): { label: string; href?: string }[] {
  const root = { label: "풀림 게임즈", href: "/" };
  const trail: { label: string; href?: string }[] = [root];

  if (pathname === root.href) return trail;

  // 활성 도메인 찾기
  const active = findActiveSection(pathname, role);
  if (!active) {
    // 도메인 children 매칭 못하면 — 잠금 페이지 등 — 도메인만 추가 시도
    const nav = navForRole(role);
    for (const group of nav) {
      for (const item of group.items) {
        if (item.href === pathname) {
          trail.push({ label: item.label });
          return trail;
        }
      }
    }
    return trail;
  }

  if (active.href !== root.href) {
    trail.push({ label: active.label, href: active.href });
  }

  // children 매칭
  if (active.children) {
    let bestSub: NavSubItem | undefined;
    let bestLen = -1;
    for (const sub of active.children) {
      if (
        pathname === sub.href ||
        pathname.startsWith(sub.href + "/")
      ) {
        if (sub.href.length > bestLen) {
          bestSub = sub;
          bestLen = sub.href.length;
        }
      }
    }
    if (bestSub) {
      trail.push({ label: bestSub.label });
    }
  }

  return trail;
}
