// 자모/문자 조합 — 게임 매니페스트.
// V0: 한자 부수 조합 (合字). 카드 풀에서 부수 선택 → 슬롯 배치 → 한자 완성.

import { Combine } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "letter-assembly",
    title: "한자 부수 조합",
    subject: "국어",
    unit: "고1 국어 — 한자 부수",
    tagline: "부수를 조합해 한자를 완성해요",
    estimatedMinutes: 4,
    status: "available",
    icon: Combine,
    mechanic: "manipulation",
    retrievalDepth: "medium",
    previewImagePath: "/previews/letter-assembly.png",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
