import { describe, expect, it } from "vitest";
import { sanitizeUserText } from "./index";

describe("sanitizeUserText", () => {
  it("일반 텍스트는 변경 X", () => {
    expect(sanitizeUserText("안녕하세요 hello")).toBe("안녕하세요 hello");
  });

  it("빈 문자열 처리", () => {
    expect(sanitizeUserText("")).toBe("");
  });

  it("<script> tag block 제거", () => {
    const input = "before <script>alert('xss')</script> after";
    expect(sanitizeUserText(input)).toBe("before  after");
  });

  it("unclosed <script> tag 제거", () => {
    const input = "before <script src='evil.js'> after";
    expect(sanitizeUserText(input)).toBe("before  after");
  });

  it("inline event handler 제거 — onclick", () => {
    const input = '<div onclick="alert(1)">text</div>';
    expect(sanitizeUserText(input)).toBe("<div>text</div>");
  });

  it("inline event handler 제거 — onload·onerror", () => {
    const input = '<img onload="x" src="a" onerror="y">';
    const result = sanitizeUserText(input);
    expect(result).not.toContain("onload");
    expect(result).not.toContain("onerror");
  });

  it("javascript: URL 제거", () => {
    const input = "<a href=\"javascript:alert(1)\">click</a>";
    const result = sanitizeUserText(input);
    expect(result).not.toContain("javascript:");
  });

  it("data:text/html 제거", () => {
    const input = "<a href=\"data:text/html,<script>1</script>\">x</a>";
    const result = sanitizeUserText(input);
    expect(result).not.toContain("data:text/html");
  });

  it("정상 markdown·한글·구두점 보존", () => {
    const input = "**굵게** *기울임* `code` — 2025년 5월";
    expect(sanitizeUserText(input)).toBe(input);
  });

  it("연속 XSS 패턴 일괄 제거", () => {
    const input =
      '<script>a</script><img onclick="b" src="c"> javascript:d data:text/html';
    const result = sanitizeUserText(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("data:text/html");
  });
});
