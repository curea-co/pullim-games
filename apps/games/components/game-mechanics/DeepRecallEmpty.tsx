"use client";

// deep-recall 모드 빈 풀 화면 — R<0.6 카드 0건 시 "잊혀가는 카드 없음" 안내.
// Plan E Phase 4 §3 "빈 풀(R<0.6 카드 0건) 처리 — '잊혀가는 카드 없음' 화면 컴포넌트".
//
// 디자인: 압박 X, 캐주얼 톤 (Plan E §0.C). 정의 토큰만 사용.

import Link from "next/link";
import { motion } from "framer-motion";

interface Props {
  /** 홈으로 돌아갈 link href. default "/". */
  homeHref?: string;
  /** default 모드로 다시 풀기 URL — pathname (mode 쿼리 제거). */
  defaultModeHref: string;
}

export function DeepRecallEmpty({ homeHref = "/", defaultModeHref }: Props) {
  return (
    <main
      data-testid="deep-recall-empty"
      data-puds-state="empty"
      className="mx-auto flex min-h-full max-w-[480px] flex-col items-center justify-center gap-4 px-6 py-10 text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="flex flex-col items-center gap-3"
      >
        <span
          aria-hidden="true"
          className="text-display text-accent-positive"
        >
          ✓
        </span>
        <h1 className="text-display text-type-primary">
          잊혀가는 카드가 없어요
        </h1>
        <p className="text-helper text-type-secondary">
          오늘 만난 카드를 잘 기억하고 있어요. 다시 만날 때 풀어볼까요?
        </p>
      </motion.div>
      <div className="mt-4 flex w-full flex-col gap-2">
        <Link
          href={defaultModeHref}
          className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10"
        >
          전체 모드로 풀기
        </Link>
        <Link
          href={homeHref}
          className="block w-full px-4 py-3 text-center text-body text-type-secondary hover:text-type-primary"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
