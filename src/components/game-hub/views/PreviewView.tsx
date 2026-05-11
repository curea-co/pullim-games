// 미리보기 뷰 — 5번째 view. 16:10 preview 이미지 + 본문.
// `2026-05-11_game-preview.md` §3.3 따름.
// 자산 누락 시 fallback (큰 아이콘 + "미리보기 준비 중").

import Link from "next/link";
import { Lock } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";
import type { ProgressLookup } from "@/lib/games/filter";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  games: GameManifest[];
  progress?: ProgressLookup;
}

export function PreviewView({ games, progress }: Props) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((g) => {
        const isAvailable = g.meta.status === "available";
        const bucket = progress?.byGameId.get(g.meta.id) ?? "untouched";
        const inner = (
          <Card className="group h-full overflow-hidden rounded-block border-border-hairline bg-bg-block p-0 shadow-none transition-colors hover:border-type-primary/30">
            <PreviewMedia meta={g.meta} isAvailable={isAvailable} />
            <div className="flex flex-col gap-1.5 p-4">
              <header className="flex items-start justify-between gap-2">
                <h3 className="text-label font-bold leading-tight text-type-primary">
                  {g.meta.title}
                </h3>
                {!isAvailable && (
                  <Lock
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-type-secondary/60"
                    aria-hidden="true"
                  />
                )}
              </header>
              <p className="text-helper text-type-secondary">
                {g.meta.subject} · {g.meta.unit}
              </p>
              <p className="line-clamp-2 text-helper text-type-primary/80">
                {g.meta.tagline}
              </p>
              <p className="mt-1 flex items-center justify-between text-helper text-type-secondary">
                <span className="tabular">약 {g.meta.estimatedMinutes}분</span>
                {bucket !== "untouched" && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular",
                      bucket === "completed"
                        ? "bg-accent-positive/10 text-accent-positive"
                        : "bg-pullim-slate-100 text-pullim-slate-600",
                    )}
                  >
                    {bucket === "completed" ? "완료" : "진행 중"}
                  </span>
                )}
              </p>
            </div>
          </Card>
        );
        return (
          <li key={g.meta.id}>
            {isAvailable ? (
              <Link
                href={`/games/${g.meta.id}`}
                aria-label={`${g.meta.title} 시작 — ${g.meta.subject} ${g.meta.unit}, 약 ${g.meta.estimatedMinutes}분`}
                className="block h-full rounded-block focus-visible:outline-2 focus-visible:outline-accent-positive"
              >
                {inner}
              </Link>
            ) : (
              <div
                className="block h-full opacity-65"
                aria-disabled="true"
              >
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface PreviewMediaProps {
  meta: GameManifest["meta"];
  isAvailable: boolean;
}

function PreviewMedia({ meta, isAvailable }: PreviewMediaProps) {
  const Icon = meta.icon;
  // V1 자산 누락 시: state 로 추적 X — img onError 로 fallback 노출.
  // 단순화: 이미지 경로 있으면 시도, 실패 시 background fallback 이 노출됨.
  return (
    <div
      className={cn(
        "relative aspect-[16/10] w-full overflow-hidden border-b border-border-hairline bg-pullim-slate-100",
        !isAvailable && "grayscale",
      )}
    >
      {/* fallback 레이어 — 항상 깔리고, 이미지 로드 성공 시 위에 덮임 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-pullim-slate-500">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-button bg-bg-block text-type-secondary shadow-block"
        >
          <Icon className="h-6 w-6" strokeWidth={2} />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-wider">
          미리보기 준비 중
        </p>
      </div>
      {meta.previewImagePath && (
        <img
          src={meta.previewImagePath}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
          onError={(e) => {
            // 자산 누락 → 이미지 숨김, 아래 fallback 만 노출
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
}
