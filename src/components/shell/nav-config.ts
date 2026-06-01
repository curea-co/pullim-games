// 풀림 게임즈 통합 네비게이션 설정.
//
// `2026-05-08_nav-ia-restructure.md` §4-5 따름.
// 4 최상위 메뉴 (홈 / 게임 허브 / 관리 / 소개하기).
// children 펼침 폐기 — 게임 진입은 /games (게임 허브) 안에서 처리.
// 풀림 패밀리 잠금 도메인 (스튜디오·스토어·플래너 등) 제거 — V2 SSO 시점에 별도 plan.

import {
  Home,
  Gamepad2,
  Settings,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { games } from "@/lib/games/registry";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  /** 활성 표시 prefix (예: "/games" 가 활성이면 "/games/[id]" 도 활성) */
  matchPrefix?: string[];
  description?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type Role = "student";

/** 4 최상위 메뉴 */
export const studentDomains: NavItem[] = [
  {
    href: "/home",
    label: "홈",
    icon: Home,
    description: "대시보드 — 진행한 게임 / 성공·실패 통계",
  },
  {
    href: "/games",
    label: "게임 허브",
    icon: Gamepad2,
    description: "모든 게임 모음 + 나만의 게임",
    matchPrefix: ["/games"],
  },
  {
    href: "/manage",
    label: "관리",
    icon: Settings,
    description: "과목·교육과정·콘텐츠 커스텀",
    matchPrefix: ["/manage"],
  },
  {
    href: "/about",
    label: "소개하기",
    icon: BookOpen,
    description: "풀림 게임즈 소개",
  },
];

/** 호환용 그룹 구조 */
export const studentNav: NavGroup[] = [{ label: "", items: studentDomains }];

export function navForRole(_role: Role): NavGroup[] {
  return studentNav;
}

/**
 * pathname → 활성 NavItem.
 * matchPrefix 가 있으면 그 prefix 도 매칭. 가장 긴 prefix 우선.
 */
export function findActiveNav(
  pathname: string,
  role: Role,
): NavItem | undefined {
  const nav = navForRole(role);
  let best: NavItem | undefined;
  let bestLen = -1;
  for (const group of nav) {
    for (const item of group.items) {
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

/** 라우트 → breadcrumb. 게임 플레이는 게임 메타에서 제목 가져옴. */
export function buildBreadcrumb(
  pathname: string,
  role: Role,
): { label: string; href?: string }[] {
  // in-app 홈 = 대시보드(/home). `/` 는 랜딩이라 brand 크럼은 /home 을 가리킨다(랜딩 바운스 회피).
  const root = { label: "풀림 게임즈", href: "/home" };
  const trail: { label: string; href?: string }[] = [root];

  if (pathname === root.href) return trail;

  const active = findActiveNav(pathname, role);
  if (!active) return trail;

  if (active.href !== root.href) {
    trail.push({ label: active.label, href: active.href });
  }

  // 게임 플레이 페이지: /games/<id> → registry 에서 제목 lookup
  if (active.href === "/games" && pathname.startsWith("/games/")) {
    const gameId = pathname.replace("/games/", "").split("/")[0];
    if (gameId) {
      const game = games.find((g) => g.meta.id === gameId);
      trail.push({ label: game?.meta.title ?? gameId });
    }
  }

  return trail;
}
