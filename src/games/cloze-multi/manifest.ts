// 다중 빈칸 cloze — 게임 매니페스트.
// scripts/generate-registry.ts 가 자동 발견하는 default export.

import { TextCursorInput } from "lucide-react";
import type { GameManifest } from "@/lib/games/types";

const manifest: GameManifest = {
  meta: {
    id: "cloze-multi",
    title: "다중 빈칸 채우기",
    subject: "영어",
    unit: "고1 영어 — 5형식 어순",
    tagline: "여러 빈칸에 단어 카드를 끼워 문장을 완성해요",
    estimatedMinutes: 5,
    status: "available",
    icon: TextCursorInput,
    mechanic: "multiple-choice",
    retrievalDepth: "medium",
    previewImagePath: "/previews/cloze-multi.png",
  },
  loadComponent: () => import("./component"),
};

export default manifest;
