import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Database, Gamepad2, Send, ShieldCheck } from "lucide-react";

import { isLibraryDemoEnabled } from "@/lib/server/library/demo-memory";

export const metadata: Metadata = {
  title: "Library 연동 샘플 · 풀림 게임즈",
  robots: { index: false, follow: false },
};

const FLOW = [
  {
    icon: Send,
    step: "01",
    title: "Library handoff",
    body: "샘플 활동의 고정 버전과 익명 사용자 ID를 전달해요.",
  },
  {
    icon: ShieldCheck,
    step: "02",
    title: "Opaque session",
    body: "원본 토큰 대신 HttpOnly 세션으로 게임을 열어요.",
  },
  {
    icon: Database,
    step: "03",
    title: "LearningEvent",
    body: "풀이 이벤트를 같은 eventId로 안전하게 재전송해요.",
  },
] as const;

export default function LibraryDemoPage() {
  if (!isLibraryDemoEnabled()) notFound();

  return (
    <main
      data-puds-page="library-demo"
      className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6 md:py-12 lg:px-8"
    >
      <header className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <p className="puds-page-eyebrow uppercase">Library integration</p>
          <span className="rounded-full bg-[var(--puds-lemon-500)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--puds-primary-700)]">
            Dev sample
          </span>
        </div>
        <h1 className="puds-page-title mt-3 sm:text-[34px]">
          Library에서 게임을 열어봐요
        </h1>
        <p className="puds-page-meta mt-3 max-w-2xl text-sm sm:text-base">
          실제 서명 키나 데이터베이스 없이, Library 실행 계약의 세션과 학습
          이벤트 흐름을 로컬 메모리에서 확인하는 개발용 샘플이에요.
        </p>
      </header>

      <section aria-labelledby="demo-flow-title">
        <h2 id="demo-flow-title" className="sr-only">
          Library 실행 흐름
        </h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {FLOW.map(({ icon: Icon, step, title, body }) => (
            <li
              key={step}
              className="puds-hub-surface flex min-h-40 flex-col border p-5"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--puds-action-secondary)] text-[var(--puds-action-secondary-fg)]">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="tabular text-xs font-bold text-[var(--puds-text-tertiary)]">
                  {step}
                </span>
              </div>
              <h3 className="mt-5 text-base font-bold text-[var(--puds-text-primary)]">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-[var(--puds-text-secondary)]">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="puds-hub-surface border p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--puds-primary-100)] text-[var(--puds-primary-700)]">
              <Gamepad2 aria-hidden="true" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--puds-text-tertiary)]">
                Sample activity
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--puds-text-primary)]">
                수학 빠른 퀴즈
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--puds-text-secondary)]">
                기존 QuickQuiz 메커니즘과 게임 비주얼은 그대로 두고, Library
                세션만 개발용 메모리 어댑터로 연결해요.
              </p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--puds-border-subtle)] bg-[var(--puds-border-subtle)] sm:grid-cols-4">
            {[
              ["게임", "math-quick-quiz"],
              ["모드", "default"],
              ["버전", "demo-2026.07.22"],
              ["세션", "30분 · 메모리"],
            ].map(([term, value]) => (
              <div
                key={term}
                className="min-w-0 bg-[var(--puds-surface-raised)] px-3 py-3"
              >
                <dt className="text-[11px] font-bold text-[var(--puds-text-tertiary)]">
                  {term}
                </dt>
                <dd className="mt-1 truncate text-xs font-semibold text-[var(--puds-text-primary)] sm:text-sm">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <form action="/api/library/demo/launch" method="post" className="mt-6">
            <button
              type="submit"
              className="puds-primary-control inline-flex w-full items-center justify-center gap-2 px-5 transition-colors hover:bg-[var(--puds-action-primary-hover)] sm:w-auto"
            >
              샘플 게임 열기
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </form>
        </div>

        <aside className="border-l-4 border-[var(--puds-primary-500)] bg-[var(--puds-surface-sunken)] p-5 sm:p-6">
          <h2 className="text-sm font-bold text-[var(--puds-text-primary)]">
            이 샘플은 안전하게 격리돼요
          </h2>
          <ul className="mt-3 space-y-2.5 text-sm leading-6 text-[var(--puds-text-secondary)]">
            <li>· 실제 DB와 마이그레이션을 사용하지 않아요.</li>
            <li>· 새 환경변수나 운영 시크릿이 필요하지 않아요.</li>
            <li>· 개발 서버를 다시 켜면 세션과 이벤트가 초기화돼요.</li>
            <li>· 운영 빌드에서는 이 페이지와 발급 API가 404예요.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
