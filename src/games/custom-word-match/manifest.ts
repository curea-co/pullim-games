// 사용자 매칭 게임 — 관리에서 입력한 word-match 카드를 풀이.

import { Link2 } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "custom-word-match",
    title: "내 매칭",
    subject: "내 콘텐츠",
    unit: "사용자 입력",
    tagline: "내가 만든 짝을 맞춰요",
    estimatedMinutes: 1,
    status: "available",
    kind: "custom",
    icon: Link2,
    mechanic: "matching",
    retrievalDepth: "shallow",
    previewImagePath: "/previews/custom-word-match.png",
    mechanismComponent: "WordMatch",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
