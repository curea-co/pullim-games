// 사용자 객관식 게임 — 관리에서 입력한 multiple-choice 카드를 풀이.
// `2026-05-08_management.md` §5.7 따름.

import { CircleDot } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "custom-multiple-choice",
    title: "내 객관식",
    subject: "내 콘텐츠",
    unit: "사용자 입력",
    tagline: "내가 만든 4지선다 카드를 풀어요",
    estimatedMinutes: 1,
    status: "available",
    kind: "custom",
    icon: CircleDot,
    mechanic: "multiple-choice",
    retrievalDepth: "shallow",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
