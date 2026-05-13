// 생물 분류 트리 — 게임 매니페스트.
// scripts/generate-registry.ts 가 자동 발견하는 default export.

import { FolderTree } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "bio-taxonomy",
    title: "생물 분류 트리",
    subject: "과학",
    unit: "고1 생명과학 — 생물 분류",
    tagline: "생물 카드를 알맞은 분류로 모아요",
    estimatedMinutes: 5,
    status: "available",
    icon: FolderTree,
    mechanic: "sorting",
    retrievalDepth: "medium",
    previewImagePath: "/previews/bio-taxonomy.png",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
