"use client";

// / — 랜딩 히어로 (2026-06-01 도입, plan: proc/plan/2026-06-01_landing-page.md).
// 신규 방문자에게 풀림 게임즈가 무엇인지·어떻게 시작/로그인하는지 진입 플로우를 제공.
// 무마찰 원칙(spec/05 §5.2): 로그인 없이 "바로 시작"으로 게스트 즉시 플레이 — 게이트 아님.
// 로그인했거나 이미 플레이 기록이 있으면 대시보드(/home)로 자동 진입.

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, BookOpenCheck, Sparkles } from "lucide-react";
import { computeDashboardStats } from "@/lib/core";
import { getMe } from "@/lib/auth/client";
import { PullimMark } from "@/components/brand/PullimMark";

const HIGHLIGHTS = [
  {
    Icon: BookOpenCheck,
    label: "교과를 한 판으로",
    body: "국·영·수·과·사 — 개념을 게임으로 풀며 익혀요.",
  },
  {
    Icon: BarChart3,
    label: "진행 자체가 보상",
    body: "점수·랭크·뱃지 없이 성공·실패·진행만 솔직하게 보여줘요.",
  },
  {
    Icon: Sparkles,
    label: "회원가입 없이 바로",
    body: "계정은 선택이에요. 게스트로 즉시 한 판 시작.",
  },
];

export function LandingHero() {
  const router = useRouter();

  // 무마찰·LCP(spec/05 §5.2·spec/04): 랜딩 본문은 즉시 렌더한다. 신규 익명 방문자를
  // 네트워크 왕복(getMe)으로 붙잡지 않는다. 로그인했거나 게스트 플레이 기록이 있는
  // "복귀" 사용자만 비동기 판정 후 /home 으로 단방향 리다이렉트(덮어쓰기).
  useEffect(() => {
    let cancelled = false;
    async function redirectReturning() {
      const [me, stats] = await Promise.all([
        getMe().catch(() => null),
        computeDashboardStats().catch(() => null),
      ]);
      if (cancelled) return;
      if (Boolean(me) || (stats?.gamesPlayed ?? 0) > 0) {
        router.replace("/home");
      }
    }
    redirectReturning();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 md:px-8 md:py-20">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
        {/* 좌 — 카피 & CTA */}
        <div className="flex flex-col">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-positive/10 px-3 py-1 text-xs font-bold text-accent-positive">
            <PullimMark className="h-4 w-4 rounded-[3px]" />
            풀림 게임즈
          </span>

          <h1 className="mt-5 text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-type-primary sm:text-4xl lg:text-5xl">
            공부가{" "}
            <span className="text-accent-positive">한 판</span>으로
            <br className="hidden sm:inline" /> 풀리는 곳.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-type-secondary lg:text-lg">
            초·중등 교과를 게임으로 익히는 학습 놀이터예요. 개념을 풀고,
            틀린 건 다시 만나고, 진행은 솔직하게.{" "}
            <strong className="text-type-primary">점수·랭크·뱃지는 없어요.</strong>
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/games"
              className="inline-flex h-12 items-center justify-center rounded-md bg-accent-positive px-8 text-base font-bold text-white shadow-sm transition-colors hover:bg-accent-positive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-positive focus-visible:ring-offset-2"
            >
              바로 시작
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-md px-4 text-sm font-semibold text-type-secondary hover:text-type-primary hover:underline"
            >
              로그인 / 회원가입 →
            </Link>
          </div>
          <p className="mt-3 text-xs text-type-secondary">
            회원가입 없이 게스트로 바로 풀 수 있어요. 계정은 기록 저장이 필요할 때만.
          </p>
        </div>

        {/* 우 — 특징 카드 */}
        <div className="relative">
          <ul className="grid gap-3 rounded-block border border-pullim-slate-200 bg-card p-3 shadow-sm sm:p-4 lg:p-5">
            {HIGHLIGHTS.map(({ Icon, label, body }) => (
              <li
                key={label}
                className="flex items-start gap-4 rounded-block border border-pullim-slate-200 bg-background/60 p-4 lg:p-5"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-block bg-accent-positive/10 text-accent-positive">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-type-primary lg:text-base">
                    {label}
                  </p>
                  <p className="mt-0.5 text-xs text-type-secondary lg:text-sm">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
