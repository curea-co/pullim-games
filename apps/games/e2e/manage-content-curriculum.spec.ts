// /manage/content — 교육과정 통합 picker e2e.
// plan: proc/plan/2026-05-27_curriculum-ai-content-creation.md §Phase 4·5
// spec/06 §6.10·§6.11·§6.12
//
// 3 시나리오 — 실 LLM API 키 의존 없이 모두 검증:
//   (1) seed 정적 변환 (factorization) → cards 생성 + source="curriculum-seed"
//   (2) catalog-ai 캐시 hit (사전 seed) → LLM 미호출 + "AI 캐시" 라벨 + "다시 생성" 노출
//   (3) 일일 가드 exhausted (quota=30) → AI 분기 시 에러
//
// 실 LLM 호출 경로는 ANTHROPIC_API_KEY 가 있는 로컬 환경에서 별도 수동 검증.

import { test, expect, type Page } from "@playwright/test";
import { MANAGE_ENABLED } from "../lib/features";

// 관리 영역 비활성화(MANAGE_ENABLED=false) 시 스킵 — /manage/content 는 /home 으로
// 리다이렉트된다. true 로 되돌리면 자동 복원. 근거: proc/plan/2026-07-02_disable-manage.md
test.beforeEach(() => {
  test.skip(!MANAGE_ENABLED, "MANAGE_ENABLED=false — 관리 영역 비활성화");
});

async function seedUserData(page: Page) {
  await page.evaluate(() => {
    const now = new Date().toISOString();
    localStorage.setItem(
      "pullim-games:custom:subjects",
      JSON.stringify([
        { id: "e2e-sub", name: "E2E", createdAt: now, updatedAt: now },
      ]),
    );
    localStorage.setItem(
      "pullim-games:custom:curriculum",
      JSON.stringify([
        {
          id: "e2e-curr",
          subjectId: "e2e-sub",
          name: "AI 검증",
          order: 0,
          createdAt: now,
          updatedAt: now,
        },
      ]),
    );
  });
}

async function pickSelect(page: Page, triggerIndex: number, optionText: string) {
  const triggers = page.locator('button[role="combobox"]');
  await triggers.nth(triggerIndex).click();
  await page.locator(`[role="option"]:has-text("${optionText}")`).first().click();
}

test.describe("/manage/content — 교육과정 통합 picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/manage/content", { waitUntil: "networkidle" });
    await seedUserData(page);
    await page.reload({ waitUntil: "networkidle" });
  });

  test("(1) seed 정적 변환 — factorization 단원 → LLM 미호출 + source=curriculum-seed", async ({
    page,
  }) => {
    await page.locator('button:has-text("타이핑")').first().click();
    await pickSelect(page, 0, "E2E");
    await pickSelect(page, 1, "AI 검증");
    await pickSelect(page, 2, "고등");
    await pickSelect(page, 3, "수학");
    await pickSelect(page, 4, "고등 1학년 (공통수학)");
    await pickSelect(page, 5, "다항식의 인수분해");

    // 서브토글 노출 ("정적 변환" 기본 활성)
    await expect(page.locator('button[aria-label="정적 변환"]')).toBeVisible();
    await expect(page.locator('button[aria-label="AI 생성"]')).toBeVisible();
    await expect(
      page.locator('button[aria-label="정적 변환"][data-state="on"]'),
    ).toBeVisible();

    // seed 모드: quota 카운터 미노출 (LLM 안 씀)
    await expect(page.locator("text=/오늘 AI 호출 남음:/")).toHaveCount(0);

    // 자동 생성 → 즉시 미리보기 (정적 변환은 거의 즉시)
    await page.locator('button:has-text("자동 생성")').first().click();
    await expect(page.locator("text=/4\\. 미리보기 — 카드/")).toBeVisible({
      timeout: 5000,
    });

    // 저장 → localStorage 의 source 메타 확인
    await page.locator('button:has-text("저장하기")').first().click();
    await expect(page.locator('text=/저장됐어요/')).toBeVisible({ timeout: 5000 });

    const sources = await page.evaluate(() => {
      const raw = localStorage.getItem("pullim-games:custom:cards");
      if (!raw) return [];
      return (JSON.parse(raw) as { source?: string }[]).map((c) => c.source);
    });
    expect(sources.length).toBeGreaterThan(0);
    for (const s of sources) {
      expect(s).toBe("curriculum-seed");
    }

    // quota 안 증가했는지 — 키 자체가 없음 또는 0
    const quotaUsed = await page.evaluate(() => {
      const d = new Date();
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return localStorage.getItem(`pullim-games:llm-quota:${ymd}`);
    });
    expect(quotaUsed).toBeNull();
  });

  test("(2) catalog-ai 캐시 hit — 사전 캐시 시드 → LLM 미호출 + 캐시 라벨/다시 생성 노출", async ({
    page,
  }) => {
    // 캐시 시드 — 영어 중1 "자기소개 확장" / 객관식 / 10장 (page default count=10 매칭)
    // (초등은 타겟 제외라 picker·server 에서 차단 — 중·고 단원으로 검증)
    await page.evaluate(() => {
      const now = new Date().toISOString();
      const cacheKey =
        "pullim-games:llm-cache:middle::english::1::more-about-myself::multiple-choice::10";
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          savedAt: now,
          drafts: [
            {
              kind: "multiple-choice",
              difficulty: 2,
              question: "Cached card 1",
              choices: ["A", "B", "C", "D"],
              correctIndex: 0,
              source: "curriculum-ai",
            },
            {
              kind: "multiple-choice",
              difficulty: 3,
              question: "Cached card 2",
              choices: ["A", "B", "C", "D"],
              correctIndex: 1,
              source: "curriculum-ai",
            },
          ],
        }),
      );
    });

    await page.locator('button:has-text("객관식")').first().click();
    await pickSelect(page, 0, "E2E");
    await pickSelect(page, 1, "AI 검증");
    await pickSelect(page, 2, "중학교");
    await pickSelect(page, 3, "영어");
    await pickSelect(page, 4, "중학교 1학년");
    await pickSelect(page, 5, "자기소개 확장");

    // 서브토글 미노출 (seedRef 없는 단원)
    await expect(page.locator('button[aria-label="정적 변환"]')).toHaveCount(0);

    // 자동 생성 → 캐시 hit → 즉시 미리보기 + "AI 캐시" 라벨
    await page.locator('button:has-text("자동 생성")').first().click();
    await expect(page.locator("text=/4\\. 미리보기/")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator("text=/AI 캐시/")).toBeVisible();
    await expect(page.locator('button:has-text("다시 생성")')).toBeVisible();
    // quota 미증가
    const quotaUsed = await page.evaluate(() => {
      const d = new Date();
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return localStorage.getItem(`pullim-games:llm-quota:${ymd}`);
    });
    expect(quotaUsed).toBeNull();
  });

  test("(3) 일일 가드 exhausted — quota=30 → AI 분기 시 에러 메시지", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const d = new Date();
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      localStorage.setItem(`pullim-games:llm-quota:${ymd}`, "30");
    });
    await page.reload({ waitUntil: "networkidle" });

    await page.locator('button:has-text("객관식")').first().click();
    await pickSelect(page, 0, "E2E");
    await pickSelect(page, 1, "AI 검증");
    await pickSelect(page, 2, "중학교");
    await pickSelect(page, 3, "영어");
    await pickSelect(page, 4, "중학교 1학년");
    await pickSelect(page, 5, "자기소개 확장");

    // quota 카운터 "0 / 30" 노출
    await expect(page.locator("text=/오늘 AI 호출 남음: 0 \\/ 30/")).toBeVisible();

    // 자동 생성 버튼은 disabled
    await expect(page.locator('button:has-text("자동 생성")').first()).toBeDisabled();
  });
});
