// Plan D Phase 3 — AI error 일반화 회귀.
// generateFromSourceLLM throw → 사용자 응답은 일반화 메시지만, 원본 에러 누출 0.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/ai/anthropic", () => ({
  generateFromSourceLLM: vi.fn(),
}));

import { generateFromSourceLLM } from "@/lib/server/ai/anthropic";
import { generateFromSourceAction } from "./actions";

const GENERIC_ERROR = "자동 생성에 실패했어요. 잠시 후 다시 시도해주세요.";

describe("generateFromSourceAction — AI error 일반화", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(generateFromSourceLLM).mockReset();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("Anthropic rate-limit 에러 → 일반화 메시지 (원본 메시지 누출 X)", async () => {
    vi.mocked(generateFromSourceLLM).mockRejectedValueOnce(
      new Error("Anthropic rate_limit_error: please retry in 30s"),
    );
    const result = await generateFromSourceAction({
      kind: "typing",
      sourceText: "테스트 자료",
      count: 3,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe(GENERIC_ERROR);
    expect(result.error).not.toContain("Anthropic");
    expect(result.error).not.toContain("rate_limit");
  });

  it("auth 에러 → API key·status 코드 모두 누출 0", async () => {
    vi.mocked(generateFromSourceLLM).mockRejectedValueOnce(
      new Error("401 Unauthorized: invalid api key sk-ant-xxx"),
    );
    const result = await generateFromSourceAction({
      kind: "blank",
      sourceText: "테스트",
      count: 3,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe(GENERIC_ERROR);
    expect(result.error).not.toContain("sk-ant");
    expect(result.error).not.toContain("401");
    expect(result.error).not.toContain("Unauthorized");
  });

  it("network 에러 → 일반화 메시지", async () => {
    vi.mocked(generateFromSourceLLM).mockRejectedValueOnce(
      new Error("ECONNREFUSED 127.0.0.1:443"),
    );
    const result = await generateFromSourceAction({
      kind: "multiple-choice",
      sourceText: "테스트",
      count: 3,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe(GENERIC_ERROR);
    expect(result.error).not.toContain("ECONNREFUSED");
    expect(result.error).not.toContain("127.0.0.1");
  });

  it("원본 에러는 서버 로그에는 남는다 (디버그 가능)", async () => {
    const originalError = new Error("Anthropic 502 bad gateway");
    vi.mocked(generateFromSourceLLM).mockRejectedValueOnce(originalError);
    await generateFromSourceAction({
      kind: "word-match",
      sourceText: "테스트",
      count: 3,
    });
    expect(errorSpy).toHaveBeenCalled();
    const loggedArgs = errorSpy.mock.calls[0];
    // console.error 인자에 원본 에러가 포함되어야 디버깅 가능
    expect(loggedArgs.some((a: unknown) => a === originalError)).toBe(true);
  });

  it("정상 응답 — drafts 그대로 통과, error 미지정", async () => {
    vi.mocked(generateFromSourceLLM).mockResolvedValueOnce({
      drafts: [
        {
          kind: "typing",
          answer: "test",
          meaning: "테스트",
          difficulty: 3,
        },
      ],
    });
    const result = await generateFromSourceAction({
      kind: "typing",
      sourceText: "test source",
      count: 1,
    });
    expect(result.ok).toBe(true);
    expect(result.drafts).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });
});
