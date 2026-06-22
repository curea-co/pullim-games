// 이미지 핫스팟 카드 스키마.
// 도식 이미지 + N개 영역(bbox) + 라벨 카드 풀(정답 N + distractor 0~M).
// V0: SVG 인라인 컴포넌트 (diagramId 로 switch). V1+ 에서 외부 SVG/이미지 자산 교체 가능.

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const DIAGRAM_IDS = ["flower", "leaf", "root", "stem", "seed"] as const;
export const DiagramIdSchema = z.enum(DIAGRAM_IDS);
export type DiagramId = z.infer<typeof DiagramIdSchema>;

const BBoxSchema = z.object({
  /** 0~100 정규화 좌표 (viewBox 200x200 기준 백분율). */
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  height: z.number().min(1).max(100),
});

const RegionSchema = z.object({
  id: z.string().min(1),
  bbox: BBoxSchema,
  /** 정답 라벨 카드 id. */
  correctCardId: z.string().min(1),
});

const LabelCardSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const ImageHotspotProblemSchema = z
  .object({
    diagramId: DiagramIdSchema,
    /** 영역 정의 — 이미지 위 클릭 hotspot 들. */
    regions: z.array(RegionSchema).min(2).max(6),
    /** 라벨 카드 풀 (정답 N + distractor 0~M). 영역 수 이상이어야 함. */
    cards: z.array(LabelCardSchema).min(2),
  })
  .refine(
    (p) => p.cards.length >= p.regions.length,
    "cards 풀이 regions 수보다 적으면 안 됨",
  )
  .refine((p) => {
    const ids = new Set(p.cards.map((c) => c.id));
    return p.regions.every((r) => ids.has(r.correctCardId));
  }, "region.correctCardId 가 cards 안에 존재해야 함");

export const ImageHotspotCardSchema = CardBaseSchema.extend({
  type: z.literal("image-hotspot"),
  problem: ImageHotspotProblemSchema,
});

export type ImageHotspotCard = z.infer<typeof ImageHotspotCardSchema>;
export type LabelCard = z.infer<typeof LabelCardSchema>;
export type Region = z.infer<typeof RegionSchema>;
export type BBox = z.infer<typeof BBoxSchema>;
