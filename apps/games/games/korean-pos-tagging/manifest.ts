// 한국어 품사 태깅 — 게임 매니페스트.
// scripts/generate-registry.ts 가 자동 발견하는 default export.

import { Tag } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "korean-pos-tagging",
    title: "품사 태깅",
    subject: "국어",
    unit: "고1 국어 — 9품사",
    tagline: "문장의 어절마다 품사를 칠해요",
    estimatedMinutes: 5,
    status: "available",
    icon: Tag,
    mechanic: "multiple-choice",
    retrievalDepth: "medium",
    previewImagePath: "/previews/korean-pos-tagging.png",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
