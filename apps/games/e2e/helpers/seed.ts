// Custom-* 4 게임 e2e 용 localStorage seed.
// `proc/plan/2026-05-11_qa-playwright-setup.md` §10.1 + `2026-05-12_daily-outcome-cleanup.md` §2.2 따름.
//
// 빈 상태 (콘텐츠 0) 의 custom 게임은 empty state UI 만 노출 → CTA 검증 불가.
// 본 seed 는 각 kind 별 최소 1장 카드 + 1개 curriculum + 1개 subject 를 주입해
// CUSTOM_GAMES (e2e/helpers/games.ts) 가 official 과 동일하게 viewport.spec 매트릭스에 들어가게.
//
// 키 (src/lib/core/custom/storage.ts):
//   pullim-games:custom:subjects
//   pullim-games:custom:curriculum
//   pullim-games:custom:cards

import type { Page } from "@playwright/test";

const NOW = "2026-05-12T00:00:00.000Z";

const SUBJECT = {
  id: "sub-e2e",
  name: "E2E 과목",
  createdAt: NOW,
  updatedAt: NOW,
};

const CURRICULUM = {
  id: "curr-e2e",
  subjectId: "sub-e2e",
  name: "E2E 단원",
  order: 0,
  createdAt: NOW,
  updatedAt: NOW,
};

const COMMON = {
  subjectId: "sub-e2e",
  curriculumId: "curr-e2e",
  difficulty: 1 as const,
  createdAt: NOW,
  updatedAt: NOW,
};

const CARDS = [
  {
    ...COMMON,
    id: "mc-e2e-1",
    kind: "multiple-choice",
    question: "1 + 1 = ?",
    choices: ["1", "2", "3", "4"],
    correctIndex: 1,
  },
  {
    ...COMMON,
    id: "b-e2e-1",
    kind: "blank",
    passage: "I ___ a student.",
    choices: ["am", "is", "are", "be"],
    correctIndex: 0,
    rationale: "주어가 I 이므로 am.",
  },
  {
    ...COMMON,
    id: "t-e2e-1",
    kind: "typing",
    meaning: "하나",
    answer: "one",
    pronunciation: "원",
  },
  {
    ...COMMON,
    id: "wm-e2e-1",
    kind: "word-match",
    pairs: [
      { left: "cat", right: "고양이" },
      { left: "dog", right: "개" },
      { left: "bird", right: "새" },
      { left: "fish", right: "물고기" },
    ],
  },
];

const SEED = {
  subjects: [SUBJECT],
  curriculum: [CURRICULUM],
  cards: CARDS,
};

/** 페이지 로드 전 localStorage 에 custom 콘텐츠 주입. */
export async function seedCustomGames(page: Page): Promise<void> {
  await page.addInitScript((data) => {
    try {
      window.localStorage.setItem(
        "pullim-games:custom:subjects",
        JSON.stringify(data.subjects),
      );
      window.localStorage.setItem(
        "pullim-games:custom:curriculum",
        JSON.stringify(data.curriculum),
      );
      window.localStorage.setItem(
        "pullim-games:custom:cards",
        JSON.stringify(data.cards),
      );
    } catch {
      // localStorage 거부 환경은 e2e 대상 아님
    }
  }, SEED);
}
