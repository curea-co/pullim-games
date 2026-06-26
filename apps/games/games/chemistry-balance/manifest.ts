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
    // 몰·반응식 균형 = 고등 편향(중등 부재) → 보관. 중등 재보정 시 stage 해제(후속).
    // 근거: proc/plan/2026-06-23_middle-school-repositioning.md.
    stage: "high",
    icon: FlaskConical,
    mechanic: "manipulation",
    retrievalDepth: "deep",
    previewImagePath: "/previews/chemistry-balance.png",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
