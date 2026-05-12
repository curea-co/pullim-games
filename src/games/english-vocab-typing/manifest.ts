// 영어 어휘 타이핑 — vocab-typing 의 영어 라인업.
// `proc/plan/2026-05-12_game-discrimination-and-polish.md` I7.

import { Languages } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "english-vocab-typing",
    title: "영어 어휘 타이핑",
    subject: "영어",
    unit: "수능 어휘",
    tagline: "한국어 뜻 보고 영단어 입력",
    estimatedMinutes: 2,
    status: "available",
    icon: Languages,
    mechanic: "typing",
    retrievalDepth: "medium",
    previewImagePath: "/previews/english-vocab-typing.png",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
