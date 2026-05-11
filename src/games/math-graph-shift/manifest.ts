// 함수 그래프 변형 — V3 라인업.
// 그래프를 손가락으로 끌면 식이 실시간 변형. 풀이 동작 = 게임 메커닉 (manipulation).
// 본격 구현은 V3 진입 시 별도 PR.

import { TrendingUp } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "math-graph-shift",
    title: "함수 그래프 변형",
    subject: "수학",
    unit: "함수",
    tagline: "그래프를 끌면 식이 실시간으로 변해요",
    estimatedMinutes: 3,
    status: "available",
    icon: TrendingUp,
    mechanic: "manipulation",
    retrievalDepth: "deep",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
