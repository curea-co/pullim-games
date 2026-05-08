// 인수분해 블록 분리 — 게임 매니페스트.
// scripts/generate-registry.ts 가 자동 발견하는 default export.

import { Variable } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "factorization",
    title: "인수분해 블록 분리",
    subject: "수학",
    unit: "고1 다항식",
    tagline: "공통인수를 손가락으로 끌어내요",
    estimatedMinutes: 5,
    status: "available",
    icon: Variable,
    mechanic: "manipulation",
    retrievalDepth: "deep",
  },
  // 동적 import — Next.js 가 게임별 청크 분할 처리.
  loadComponent: () => import("./component"),
};

export default manifest;
