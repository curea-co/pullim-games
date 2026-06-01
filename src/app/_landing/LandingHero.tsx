// / — 랜딩 히어로 (2026-06-01 도입, plan: proc/plan/2026-06-01_landing-page.md).
// 신규 방문자에게 풀림 게임즈가 무엇인지 소개하고 진입 경로를 제공한다.
// 구성: 랜딩 → 회원가입·로그인 CTA(각각 /signup·/login 별도 화면) + 게스트 즉시 플레이.
// 무마찰 원칙(spec/05 §5.2): 회원가입은 선택, "게스트로 바로"로 비로그인 즉시 플레이 가능.
// ※ 자동 리다이렉트 없음 — 랜딩은 누구에게나 안정적으로 노출되는 진입 화면(2026-06-01 G1).
//   (정적 서버 컴포넌트 — 클라이언트 훅 불필요.)

import Link from "next/link";
import { BarChart3, BookOpenCheck, Sparkles } from "lucide-react";
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
    label: "회원가입 없이도 바로",
    body: "계정은 기록 저장이 필요할 때만. 게스트로 즉시 한 판.",
  },
];

export function LandingHero() {
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

          {/* 주 CTA — 회원가입 / 로그인 (각각 별도 화면) */}
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

          {/* 보조 CTA — 무마찰 게스트 즉시 플레이 */}
          <Link
            href="/games"
            className="mt-4 inline-flex w-fit items-center text-sm font-semibold text-type-secondary hover:text-type-primary hover:underline"
          >
            회원가입 없이 게스트로 바로 시작 →
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
