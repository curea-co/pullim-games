// 영단어 매칭 — V2 라인업.
// 의미 짝이 맞으면 두 카드가 결합 애니메이션 (Quizlet match 시각 차용).
// 본격 구현은 V2 진입 시 별도 PR.

import { Link2 } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "english-word-match",
    title: "영단어 매칭",
    subject: "영어",
    unit: "빈출 어휘",
    tagline: "의미가 맞는 짝을 찾으면 카드가 결합돼요",
    estimatedMinutes: 1,
    status: "available",
    icon: Link2,
    mechanic: "matching",
    retrievalDepth: "shallow",
    previewImagePath: "/previews/english-word-match.png",
    mechanismComponent: "WordMatch",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
