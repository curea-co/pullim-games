// 관리 영역 비활성(MANAGE_ENABLED=false) 정책 검증 — custom-games-cta.spec.ts(활성 상태)의
// 대칭 스위트. 활성이면 이 파일 전체 skip, 비활성이면 실행.
//
// Codex #139 R2 대응: manage 비활성 시 기존 e2e 를 skip 만 하지 말고 새 정책
// (섹션 숨김·0장 타일 미노출·/manage 리다이렉트)을 실제로 잡는 assertion 추가.
// 근거: proc/plan/2026-07-02_disable-manage.md

import { test, expect } from "@playwright/test";
import { MANAGE_ENABLED } from "../lib/features";
import { seedGuestSession } from "./helpers/auth";

const CUSTOM_HREFS = {
  mc: "/games/custom-multiple-choice",
  blank: "/games/custom-blank",
  typing: "/games/custom-typing",
  wordMatch: "/games/custom-word-match",
};

test.describe("관리 비활성 — CTA 제거·라우트 차단·dead-end 없음", () => {
  test.skip(
    MANAGE_ENABLED,
    "MANAGE_ENABLED=true — 활성 상태 검증은 custom-games-cta.spec.ts",
  );

  test.beforeEach(async ({ page, context }) => {
    // 게스트 신원 seed — /games RequireIdentity + /home middleware 게이트 통과용.
    await seedGuestSession(page, context);
  });

  test("빈 상태 — '나만의 게임' 섹션·CTA 미노출 (카드 0장)", async ({ page }) => {
    await page.goto("/games");

    // 빈 상태 CTA("첫 카드 만들기")·채워진 헤더 모두 없음 → 섹션 자체 숨김.
    await expect(page.getByRole("link", { name: "첫 카드 만들기" })).toHaveCount(0);
    await expect(
      page.getByText(/총 \d+장 — 메커닉별로 골라 풀어보세요/),
    ).toHaveCount(0);
  });

  test("일부만 채움 — 0장 메커닉 타일 미노출 (dead-end 없음)", async ({
    page,
  }) => {
    // 객관식 1장만 seed — 나머지 3 메커닉은 0장.
    await page.addInitScript(() => {
      const now = "2026-07-02T00:00:00.000Z";
      window.localStorage.setItem(
        "pullim-games:custom:subjects",
        JSON.stringify([
          { id: "sub-d", name: "비활성 검증", createdAt: now, updatedAt: now },
        ]),
      );
      window.localStorage.setItem(
        "pullim-games:custom:curriculum",
        JSON.stringify([
          {
            id: "curr-d",
            subjectId: "sub-d",
            name: "단원",
            order: 0,
            createdAt: now,
            updatedAt: now,
          },
        ]),
      );
      window.localStorage.setItem(
        "pullim-games:custom:cards",
        JSON.stringify([
          {
            id: "mc-d-1",
            kind: "multiple-choice",
            subjectId: "sub-d",
            curriculumId: "curr-d",
            difficulty: 1,
            question: "1 + 1 = ?",
            choices: ["1", "2", "3", "4"],
            correctIndex: 1,
            createdAt: now,
            updatedAt: now,
          },
        ]),
      );
    });

    await page.goto("/games");

    // 채워진 섹션 노출 (총 1장)
    await expect(page.getByText(/총 1장 — 메커닉별로 골라 풀어보세요/)).toBeVisible();

    // 플레이 가능한 객관식 타일만 링크 노출
    await expect(page.locator(`a[href="${CUSTOM_HREFS.mc}"]`)).toBeVisible();

    // 0장 메커닉으로의 링크 부재 — 클릭 시 빈 화면 dead-end 가 되므로 숨겨야 함.
    await expect(page.locator(`a[href="${CUSTOM_HREFS.blank}"]`)).toHaveCount(0);
    await expect(page.locator(`a[href="${CUSTOM_HREFS.typing}"]`)).toHaveCount(0);
    await expect(
      page.locator(`a[href="${CUSTOM_HREFS.wordMatch}"]`),
    ).toHaveCount(0);
  });

  test("/manage/* 접근 시 /home 으로 리다이렉트", async ({ page }) => {
    await page.goto("/manage/content");
    await expect(page).toHaveURL(/\/home$/);

    await page.goto("/manage/billing");
    await expect(page).toHaveURL(/\/home$/);

    await page.goto("/manage");
    await expect(page).toHaveURL(/\/home$/);
  });
});
