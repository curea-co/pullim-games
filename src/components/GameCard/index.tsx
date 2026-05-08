// 메인페이지 게임 카드 — registry 항목 1개를 카드 UI로 렌더.
// 레이아웃 패턴: pullim-study-demo DomainCard 차용, 색은 우리 SPEC §08 토큰.

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import type { GameMeta } from "@/lib/games/types";

interface GameCardProps {
  meta: GameMeta;
}

export function GameCard({ meta }: GameCardProps) {
  const isAvailable = meta.status === "available";
  const Icon = meta.icon;

  const inner = (
    <article
      className={[
        "group relative flex h-full flex-col rounded-block border p-5 transition-all",
        isAvailable
          ? "border-border-hairline bg-bg-block hover:border-type-primary/30 hover:shadow-block"
          : "border-border-hairline bg-bg-primary opacity-65",
      ].join(" ")}
      aria-disabled={!isAvailable}
    >
      {/* 좌상단 아이콘 + 우상단 화살표/락 */}
      <div className="mb-3 flex items-start justify-between">
        <span
          className={[
            "flex h-9 w-9 items-center justify-center rounded-button",
            isAvailable
              ? "bg-accent-positive/10 text-type-primary"
              : "bg-bg-block text-type-secondary",
          ].join(" ")}
          aria-hidden="true"
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        {isAvailable ? (
          <ArrowRight
            className="h-4 w-4 text-type-secondary/40 transition-colors group-hover:text-type-primary"
            aria-hidden="true"
          />
        ) : (
          <Lock
            className="h-3.5 w-3.5 text-type-secondary/60"
            aria-hidden="true"
          />
        )}
      </div>

      {/* 제목 */}
      <h3 className="text-base font-bold leading-tight tracking-tight text-type-primary">
        {meta.title}
      </h3>

      {/* 메타: 과목 · 단원 */}
      <div className="mt-1 flex flex-wrap gap-1.5 text-helper text-type-secondary">
        <span>{meta.subject}</span>
        <span aria-hidden="true">·</span>
        <span>{meta.unit}</span>
      </div>

      {/* 한 줄 설명 */}
      <p className="mt-2 line-clamp-2 text-label leading-snug text-type-primary/80">
        {meta.tagline}
      </p>

      {/* 하단: 시간 (활성일 때만) */}
      {isAvailable && (
        <div className="mt-4 flex items-center justify-between text-helper text-type-secondary">
          <span className="tabular">약 {meta.estimatedMinutes}분</span>
        </div>
      )}
      {!isAvailable && (
        <div className="mt-4 text-helper text-type-secondary">곧 만나요</div>
      )}
    </article>
  );

  if (!isAvailable) {
    return inner;
  }

  return (
    <Link
      href={`/games/${meta.id}`}
      className="block rounded-block focus-visible:outline-2 focus-visible:outline-accent-positive"
      aria-label={`${meta.title} 시작 — ${meta.subject} ${meta.unit}, 약 ${meta.estimatedMinutes}분`}
    >
      {inner}
    </Link>
  );
}
