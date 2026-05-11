// 영어 어순 맞추기 — V1.5 라인업.
// 한국어 문장이 위에 있고 영어 단어를 정답 어순으로 배치. retrieval 중간 — 출력형.
// V1.5 출시 전엔 status='coming-soon', 본격 구현은 별도 PR.

import { ListOrdered } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "english-order",
    title: "영어 어순 맞추기",
    subject: "영어",
    unit: "어법·어순",
    tagline: "단어가 자석처럼 정답 자리에 붙어요",
    estimatedMinutes: 2,
    status: "available",
    icon: ListOrdered,
    mechanic: "sorting",
    retrievalDepth: "medium",
    previewImagePath: "/previews/english-order.png",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
