// 어휘 타이핑 — V2 라인업.
// 한자/어휘를 키보드로 입력하면 한자가 손글씨처럼 한 획씩 나타남.
// 본격 구현은 V2 진입 시 별도 PR.

import { Type } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "vocab-typing",
    title: "어휘 타이핑",
    subject: "국어",
    unit: "한자/어휘",
    tagline: "타이핑하면 한자가 한 획씩 나타나요",
    estimatedMinutes: 2,
    status: "coming-soon",
    icon: Type,
    mechanic: "typing",
    retrievalDepth: "medium",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
