// 도식 + region overlay (absolute positioned bbox).
// 영역 탭 → onTap(regionId). 배치된 라벨 텍스트는 region 위에 표시.

import type { DiagramId, LabelCard, Region } from "../schema";
import { PlantDiagram } from "./PlantDiagram";

interface HotspotCanvasProps {
  diagramId: DiagramId;
  regions: Region[];
  /** regionId → 배치된 라벨 (없으면 null). */
  placements: Map<string, LabelCard | null>;
  disabled: boolean;
  onTap: (regionId: string) => void;
}

export function HotspotCanvas({
  diagramId,
  regions,
  placements,
  disabled,
  onTap,
}: HotspotCanvasProps) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px]">
      <PlantDiagram diagramId={diagramId} />
      {regions.map((region, i) => {
        const occupant = placements.get(region.id) ?? null;
        return (
          <button
            key={region.id}
            type="button"
            onClick={() => onTap(region.id)}
            disabled={disabled}
            aria-label={
              occupant
                ? `영역 ${i + 1}, 라벨 ${occupant.text} — 탭하면 풀로 복귀`
                : `영역 ${i + 1} 비어있음 — 탭하면 활성 카드 배치`
            }
            style={{
              left: `${region.bbox.x}%`,
              top: `${region.bbox.y}%`,
              width: `${region.bbox.width}%`,
              height: `${region.bbox.height}%`,
            }}
            className={[
              "absolute flex items-center justify-center rounded-block border-2 text-helper transition-colors disabled:opacity-70",
              occupant
                ? "border-type-primary bg-bg-block/85 text-type-primary"
                : "border-dashed border-type-primary/40 bg-bg-shell/40 text-type-secondary hover:bg-bg-shell/70",
            ].join(" ")}
          >
            {occupant?.text ?? `?${i + 1}`}
          </button>
        );
      })}
    </div>
  );
}
