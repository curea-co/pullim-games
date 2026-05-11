// 수학 빠른 퀴즈 — V1.5 라인업.
// 30초 안에 5문제, 4지선다. retrieval 얕음 — 자투리 시간 침투용.
// V1.5 출시 전엔 status='coming-soon', 본격 구현은 별도 PR.

import { Zap } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "math-quick-quiz",
    title: "수학 빠른 퀴즈",
    subject: "수학",
    unit: "고1 전 단원",
    tagline: "30초, 5문제, 손가락만 빠르면 돼요",
    estimatedMinutes: 1,
    status: "available",
    icon: Zap,
    mechanic: "multiple-choice",
    retrievalDepth: "shallow",
    previewImagePath: "/previews/math-quick-quiz.png",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
