import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./puds-jr.css", import.meta.url), "utf8");

describe("PUDS pullim-jr consumer snapshot", () => {
  it("검토한 로컬 PUDS commit과 pullim-jr scope를 기록한다", () => {
    expect(css).toContain("648258ef1884b29e2536942c9d6fc0324cf15ef0");
    expect(css).toContain('.puds-jr-shell[data-theme="pullim-jr"]');
  });

  it("vendored custom properties를 --puds-* 이름공간에만 선언한다", () => {
    const declarations = [...css.matchAll(/--([a-z0-9-]+)\s*:/gi)].map(
      ([, name]) => name,
    );

    expect(declarations.length).toBeGreaterThan(20);
    expect(declarations.every((name) => name?.startsWith("puds-"))).toBe(
      true,
    );
    expect(css).not.toMatch(/^\s*(?::root|html|body|\*)\s*\{/m);
  });

  it("공통 chrome의 focus와 reduced-motion 경로를 유지한다", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain('[data-puds-player-part="footer"]');
    expect(css).toContain('[data-puds-player-state="result"]');
  });
});
