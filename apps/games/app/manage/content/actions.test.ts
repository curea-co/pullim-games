import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/ai/anthropic", () => ({
  generateFromSourceLLM: vi.fn(),
  generateFromCurriculumLLM: vi.fn(),
}));

import {
  generateFromCurriculumLLM,
  generateFromSourceLLM,
} from "@/lib/server/ai/anthropic";
import {
  generateFromCurriculumAction,
  generateFromSourceAction,
} from "./actions";

const DISABLED_ERROR = "자동 생성 기능은 현재 사용할 수 없어요.";

describe("관리 LLM 생성 비활성화", () => {
  beforeEach(() => vi.clearAllMocks());

  it("자료 생성은 provider를 호출하지 않는다", async () => {
    const result = await generateFromSourceAction({
      kind: "typing",
      sourceText: "테스트 자료",
      count: 3,
    });

    expect(result).toEqual({ ok: false, error: DISABLED_ERROR });
    expect(generateFromSourceLLM).not.toHaveBeenCalled();
  });

  it("카탈로그 생성은 provider를 호출하지 않는다", async () => {
    const result = await generateFromCurriculumAction({
      kind: "typing",
      count: 3,
      catalogPath: {
        gradeBand: "middle",
        subject: "english",
        grade: 1,
        unitId: "more-about-myself",
      },
    });

    expect(result).toEqual({ ok: false, error: DISABLED_ERROR });
    expect(generateFromCurriculumLLM).not.toHaveBeenCalled();
  });

  it("정적 seed 변환은 유지한다", async () => {
    const result = await generateFromCurriculumAction({
      kind: "multiple-choice",
      count: 1,
      seedSubjectId: "math",
      seedUnitId: "factorization",
    });

    expect(result.ok).toBe(true);
    expect(result.drafts).toHaveLength(1);
    expect(result.drafts?.[0].source).toBe("curriculum-seed");
    expect(generateFromCurriculumLLM).not.toHaveBeenCalled();
  });
});
