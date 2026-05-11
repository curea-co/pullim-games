// 영어 빈칸 추론 — V3 라인업.
// 빈칸에 들어갈 단어를 고르면 글의 흐름이 강물처럼 시각화.
// 본격 구현은 V3 진입 시 별도 PR.

import { Pencil } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "english-blank",
    title: "영어 빈칸 추론",
    subject: "영어",
    unit: "수능 빈칸",
    tagline: "정답을 고르면 글의 흐름이 이어져요",
    estimatedMinutes: 3,
    status: "available",
    icon: Pencil,
    mechanic: "multiple-choice",
    retrievalDepth: "deep",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
