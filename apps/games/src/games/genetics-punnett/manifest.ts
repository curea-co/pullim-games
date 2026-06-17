// 펀넷 사각형 — 게임 매니페스트.
// scripts/generate-registry.ts 가 자동 발견하는 default export.

import { Dna } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "genetics-punnett",
    title: "펀넷 사각형 비율",
    subject: "과학",
    unit: "고1 생명과학 — 멘델 유전",
    tagline: "자손 격자를 보고 표현형 비율을 맞춰요",
    estimatedMinutes: 5,
    status: "available",
    icon: Dna,
    mechanic: "manipulation",
    retrievalDepth: "deep",
    previewImagePath: "/previews/genetics-punnett.png",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
