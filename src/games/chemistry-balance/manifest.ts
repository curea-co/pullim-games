// 화학 반응식 균형 — V2 라인업.
// 분자 수가 균형되는 순간 양변이 "찰칵" 결합. 풀이 동작 = 게임 메커닉 (manipulation).
// 본격 구현은 V2 진입 시 별도 PR.

import { FlaskConical } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "chemistry-balance",
    title: "화학 반응식 균형",
    subject: "과학",
    unit: "화학I",
    tagline: "양변의 원자 수를 맞추면 반응식이 결합돼요",
    estimatedMinutes: 3,
    status: "available",
    icon: FlaskConical,
    mechanic: "manipulation",
    retrievalDepth: "deep",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
