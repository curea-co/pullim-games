// 미리보기 뷰 — 5번째 view. 16:10 preview 이미지 + 본문.
// `2026-05-11_game-preview.md` §3.3 따름.
// 자산 누락 시 fallback (큰 아이콘 + "미리보기 준비 중").

import Link from "next/link";
import { Lock } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";
import type { ProgressLookup } from "@/lib/games/filter";
import { subjectBadgeClass } from "@/lib/games/subject-badge";
import { Card } from "@/components/ui/card";
import { PreviewMock } from "@/components/game-hub/preview-mocks";
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
          <Card className="puds-hub-surface group h-full overflow-hidden p-0 transition-colors">
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
              <div className="flex items-center gap-1.5 text-helper">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    subjectBadgeClass(g.meta.subject),
                  )}
                >
                  {g.meta.subject}
                </span>
                <span className="text-type-secondary">{g.meta.unit}</span>
              </div>
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
                data-cta-priority="informational"
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
  // 자산 미준비 — mock 애니메이션만 노출. 자산 생기면 img 블록 복원 (see git log).
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border-hairline bg-pullim-slate-50">
      <PreviewMock meta={meta} locked={!isAvailable} />
    </div>
  );
}
