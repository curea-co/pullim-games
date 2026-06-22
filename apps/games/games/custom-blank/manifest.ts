// 사용자 빈칸 게임 — 관리에서 입력한 blank 카드를 풀이.

import { Pencil } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "custom-blank",
    title: "내 빈칸",
    subject: "내 콘텐츠",
    unit: "사용자 입력",
    tagline: "내가 만든 본문 빈칸 카드를 풀어요",
    estimatedMinutes: 3,
    status: "available",
    kind: "custom",
    icon: Pencil,
    mechanic: "multiple-choice",
    retrievalDepth: "deep",
    previewImagePath: "/previews/custom-blank.png",
    mechanismComponent: "Blank",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
