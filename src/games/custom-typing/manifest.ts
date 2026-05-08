// 사용자 타이핑 게임 — 관리에서 입력한 typing 카드를 풀이.

import { Type } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "custom-typing",
    title: "내 타이핑",
    subject: "내 콘텐츠",
    unit: "사용자 입력",
    tagline: "내가 만든 어휘를 입력해요",
    estimatedMinutes: 2,
    status: "available",
    kind: "custom",
    icon: Type,
    mechanic: "typing",
    retrievalDepth: "medium",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
