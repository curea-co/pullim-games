// /manage — 관리 (placeholder, V0.5 management plan 이 본격 구현).

import Link from "next/link";
import { ArrowRight, Settings } from "lucide-react";

export default function ManagePage() {
  return (
    <main className="flex flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-type-secondary">
          관리
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-type-primary">
          내 학습 콘텐츠 만들기
        </h1>
        <p className="mt-1.5 text-label text-type-secondary">
          내가 가진 문제·본문으로 나만의 게임 카드를 만들어요
        </p>
      </header>

      <section className="rounded-block border border-border-hairline bg-bg-block p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-button bg-accent-positive/10 text-accent-positive"
          >
            <Settings className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="flex-1">
            <h2 className="text-base font-bold text-type-primary">
              관리 페이지 준비 중
            </h2>
            <p className="mt-1 text-helper text-type-secondary">
              과목과 교육과정을 만들고, 4지선다·빈칸·타이핑·매칭 카드를 텍스트로
              입력해 나만의 게임을 만들 수 있어요. 지금은 기본 게임을 풀어주세요.
            </p>
          </div>
        </div>
      </section>

      <Link
        href="/games"
        className="group inline-flex items-center justify-between rounded-block border border-type-primary bg-bg-block px-5 py-4 text-body text-type-primary transition-colors hover:bg-accent-positive/10"
      >
        <span>기본 게임 보러가기</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </main>
  );
}
