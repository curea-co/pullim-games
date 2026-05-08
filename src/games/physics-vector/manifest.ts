// 물리 벡터 합성 — V3 라인업.
// 두 화살표를 잡으면 합벡터가 평행사변형 그림으로 도출.
// 본격 구현은 V3 진입 시 별도 PR.

import { Move } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "physics-vector",
    title: "물리 벡터 합성",
    subject: "과학",
    unit: "물리I",
    tagline: "두 화살표를 잡으면 합벡터가 그려져요",
    estimatedMinutes: 3,
    status: "available",
    icon: Move,
    mechanic: "manipulation",
    retrievalDepth: "deep",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
