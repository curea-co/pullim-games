"use client";

// / — 랜딩 히어로 (2026-06-01 도입, plan: proc/plan/2026-06-01_landing-page.md).
// 신규 방문자에게 풀림 게임즈가 무엇인지·어떻게 시작/로그인하는지 진입 플로우를 제공.
// 무마찰 원칙(spec/05 §5.2): 로그인 없이 "바로 시작"으로 게스트 즉시 플레이 — 게이트 아님.
// 로그인했거나 이미 플레이 기록이 있으면 대시보드(/home)로 자동 진입.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, BookOpenCheck, Sparkles } from "lucide-react";
import { computeDashboardStats } from "@/lib/core";
import { getMe } from "@/lib/auth/client";

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
  const [resolved, setResolved] = useState(false);
  const [returning, setReturning] = useState(false);

  // 로그인 or 게스트 플레이 기록 보유 → 대시보드로 단방향 진입(/ → /home).
  useEffect(() => {
    let cancelled = false;
    async function decide() {
      const [me, stats] = await Promise.all([
        getMe(),
        computeDashboardStats().catch(() => null),
      ]);
      if (cancelled) return;
      const isReturning = Boolean(me) || (stats?.gamesPlayed ?? 0) > 0;
      if (isReturning) {
        setReturning(true);
        router.replace("/home");
        return;
      }
      setResolved(true);
    }
    decide();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // 판정 전 / 리다이렉트 중 — 깜빡임 방지용 최소 로딩.
  if (!resolved || returning) {
    return (
      <div className="grid min-h-[60vh] place-items-center" aria-hidden="true">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-positive/10 text-accent-positive">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 animate-pulse"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12h8M12 8v8" />
          </svg>
        </span>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 md:px-8 md:py-20">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
        {/* 좌 — 카피 & CTA */}
        <div className="flex flex-col">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-positive/10 px-3 py-1 text-xs font-bold text-accent-positive">
            <span className="flex h-4 w-4 items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12h8M12 8v8" />
              </svg>
            </span>
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
              className="inline-flex h-12 items-center justify-center rounded-lg bg-accent-positive px-8 text-base font-bold text-white shadow-sm transition-colors hover:bg-accent-positive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-positive focus-visible:ring-offset-2"
            >
              바로 시작
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-lg px-4 text-sm font-semibold text-type-secondary hover:text-type-primary hover:underline"
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
          <ul className="grid gap-3 rounded-2xl border border-pullim-slate-200 bg-card p-3 shadow-sm sm:p-4 lg:p-5">
            {HIGHLIGHTS.map(({ Icon, label, body }) => (
              <li
                key={label}
                className="flex items-start gap-4 rounded-xl border border-pullim-slate-200 bg-background/60 p-4 lg:p-5"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-positive/10 text-accent-positive">
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
