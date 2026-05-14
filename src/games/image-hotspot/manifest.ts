// 이미지 핫스팟 — 게임 매니페스트.
// V0: 식물 구조 5장 (꽃·잎·뿌리·줄기·씨앗). 이미지 위 영역 ↔ 라벨 매칭.

import { ScanSearch } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "image-hotspot",
    title: "이미지 핫스팟",
    subject: "과학",
    unit: "고1 과학 — 식물 구조",
    tagline: "그림 위 영역에 라벨을 끼워요",
    estimatedMinutes: 5,
    status: "available",
    icon: ScanSearch,
    mechanic: "matching",
    retrievalDepth: "medium",
    previewImagePath: "/previews/image-hotspot.png",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
