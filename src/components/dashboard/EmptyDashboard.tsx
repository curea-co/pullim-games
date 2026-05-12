// 빈 상태 대시보드 — 첫 방문 사용자.

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function EmptyDashboard() {
  return (
    <section className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-3 rounded-block border-border-hairline bg-bg-block p-8 text-center shadow-none">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-button bg-accent-positive/10 text-accent-positive"
        >
          <Sparkles className="h-6 w-6" strokeWidth={2} />
        </span>
        <h2 className="text-xl font-bold tracking-tight text-type-primary">
          처음 만나는 풀림 게임즈
        </h2>
        <p className="text-helper text-type-secondary">
          5분, 손가락으로 푸는 학습 게임으로 시작해 볼까요.
          <br />
          처음이라면 인수분해 블록 분리부터.
        </p>
      </Card>
      <Button
        asChild
        className="group h-auto justify-between rounded-block border-0 bg-accent-positive px-5 py-4 text-body font-semibold text-type-primary shadow-glow hover:bg-accent-positive/90 hover:text-type-primary"
      >
        <Link href="/games/factorization">
          <span>인수분해 블록 분리부터</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </Button>
      <Button
        asChild
        variant="ghost"
        className="h-auto justify-center rounded-block px-5 py-3 text-helper text-type-secondary hover:bg-bg-block hover:text-type-primary"
      >
        <Link href="/games">전체 게임 허브 보기</Link>
      </Button>
    </section>
  );
}
