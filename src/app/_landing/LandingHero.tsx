"use client";

// / — 랜딩 히어로 / 입구 게이트 (arcade 모델, 2026-06-01 개정).
// plan: proc/plan/2026-06-01_arcade-entry-model.md. spec/05 §5.2.
// 입구에서 게스트/회원을 구분해 받는다: [회원가입]·[로그인] vs [게스트로 시작(/start)].
// 랜딩 본문은 항상 즉시 렌더(SSR·LCP·no-JS 폴백, Codex #114 R2) — 스피너로 가리지 않는다.
// 확정 신원(게스트 프로필 OR 로그인) 보유자만 클라에서 /home 으로 덮어쓴다(미확정은 머묾).

import { useEffect } from "react";
import Link from "next/link";
import { BarChart3, BookOpenCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useIdentity } from "@/lib/core/player/use-identity";
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
    label: "게스트는 가입 없이",
    body: "닉네임·학년만 있으면 바로 시작. 계정은 기록 저장이 필요할 때.",
  },
];

export function LandingHero() {
  const router = useRouter();
  const { ready, hasDefiniteIdentity } = useIdentity();

  // 확정 신원(게스트/회원) 보유자만 /home 으로. 무신원·auth 미확정은 랜딩에 머문다.
  // (게스트는 동기 판정이라 거의 즉시 리다이렉트 — 짧은 깜빡임은 허용, 랜딩 가림보다 낫다.)
  useEffect(() => {
    if (ready && hasDefiniteIdentity) router.replace("/home");
  }, [ready, hasDefiniteIdentity, router]);

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

          {/* 주 CTA — 회원가입 / 로그인 (회원 경로, 각각 별도 화면) */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-md bg-accent-positive px-8 text-base font-bold text-white shadow-sm transition-colors hover:bg-accent-positive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-positive focus-visible:ring-offset-2"
            >
              회원가입
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-md border border-pullim-slate-300 bg-card px-8 text-base font-bold text-type-primary shadow-sm transition-colors hover:bg-pullim-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-positive focus-visible:ring-offset-2"
            >
              로그인
            </Link>
          </div>

          {/* 게스트 경로 — 가입 없이 닉네임·학년만 */}
          <Link
            href="/start"
            className="mt-4 inline-flex w-fit items-center text-sm font-semibold text-type-secondary hover:text-type-primary hover:underline"
          >
            가입 없이 게스트로 시작 →
          </Link>
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
