// 한국사 연표 정렬 — V2 라인업.
// 사건 카드를 시간 순으로 배치하면 인과 연결선이 자동으로 그어진다.
// 본격 구현은 V2 진입 시 별도 PR.

import { Clock } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "history-timeline",
    title: "한국사 연표 정렬",
    subject: "사회",
    unit: "근대사",
    tagline: "사건을 시간 순으로 놓으면 인과가 그려져요",
    estimatedMinutes: 2,
    status: "available",
    icon: Clock,
    mechanic: "sorting",
    retrievalDepth: "medium",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
