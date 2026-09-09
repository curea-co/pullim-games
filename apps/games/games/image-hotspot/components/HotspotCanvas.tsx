// 도식 + region overlay (absolute positioned bbox).
// 영역 탭 → onTap(regionId). 배치된 라벨 텍스트는 region 위에 표시.
//
// 모바일 hit area 보장 (audit UX-3):
// - bbox 작은 region 도 최소 44×44px tap target (WCAG AA 권장).
// - `min-w-[44px] min-h-[44px]` 로 hit + visual 동시 확장. plant 도식의 region
//   좌표는 서로 충분히 떨어져 있어 확장 후에도 겹침 없음.

import type { DiagramId, LabelCard, Region } from "../schema";
import { diagramCallout } from "./presentation";
import { PlantDiagram } from "./PlantDiagram";

interface HotspotCanvasProps {
  diagramId: DiagramId;
  cardId?: string;
  regions: Region[];
  /** regionId → 배치된 라벨 (없으면 null). */
  placements: Map<string, LabelCard | null>;
  disabled: boolean;
  onTap: (regionId: string) => void;
}

export function HotspotCanvas({
  diagramId,
  cardId,
  regions,
  placements,
  disabled,
  onTap,
}: HotspotCanvasProps) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px] sm:max-w-[320px]">
      <PlantDiagram diagramId={diagramId} />
      {regions.map((region, i) => {
        const callout = diagramCallout(cardId, diagramId, region.id);
        const bbox = callout?.bbox ?? region.bbox;
        const occupant = placements.get(region.id) ?? null;
        return (
          <div key={region.id} className="contents">
            {callout && (
              <svg
                viewBox="0 0 100 100"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <line
                  x1={bbox.x + 11}
                  y1={bbox.y + 11}
                  x2={callout.point[0]}
                  y2={callout.point[1]}
                  stroke="currentColor"
                  strokeWidth="0.6"
                />
                <circle
                  cx={callout.point[0]}
                  cy={callout.point[1]}
                  r="1.5"
                  fill="currentColor"
                />
              </svg>
            )}
            <button
              type="button"
              onClick={() => onTap(region.id)}
              disabled={disabled}
              aria-label={
                occupant
                  ? `영역 ${i + 1}, 라벨 ${occupant.text} — 탭하면 풀로 복귀`
                  : `영역 ${i + 1} 비어있음 — 탭하면 활성 카드 배치`
              }
              style={{
                left: `${bbox.x}%`,
                top: `${bbox.y}%`,
                width: `${bbox.width}%`,
                height: `${bbox.height}%`,
              }}
              className={[
                "absolute flex min-h-[44px] min-w-[44px] items-center justify-center rounded-block border-2 text-helper transition-colors disabled:opacity-70",
                occupant
                  ? "border-type-primary bg-bg-block/85 text-type-primary"
                  : "border-dashed border-type-primary/40 bg-bg-shell/40 text-type-secondary hover:bg-bg-shell/70",
              ].join(" ")}
            >
              {occupant?.text ?? `?${i + 1}`}
            </button>
          </div>
        );
      })}
    </div>
  );
}
