#!/usr/bin/env node
// scripts/capture-ui-audit.mjs — UI 변경 PR 머지 전 4 viewport 캡처 + bbox overflow audit.
// plan: proc/plan/2026-05-19_ui-viewport-capture-rule.md §3 Phase 2.
// 룰: ~/dev_git/.pullim-meta/CONVENTION.md §8.
//
// 사용:
//   bun run ui:audit /games/math-quick-quiz
//   bun run ui:audit /manage/billing
//   bun run ui:audit /                  (홈)
//   bun run ui:audit /games/factorization --base https://pullim-games.vercel.app
//
// 출력: 4 viewport 결과 JSON + 화면 PNG 파일 경로 + overflow 발견 시 종료 코드 1.

import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const path = args[0];

if (!path || path.startsWith("--")) {
  console.error("usage: bun run ui:audit <path> [--base <url>] [--out <dir>]");
  console.error("       bun run ui:audit /games/math-quick-quiz");
  process.exit(2);
}

const baseIdx = args.indexOf("--base");
const base = baseIdx >= 0 ? args[baseIdx + 1] : "http://localhost:3033";

const outIdx = args.indexOf("--out");
const outDir = outIdx >= 0 ? args[outIdx + 1] : "/tmp/ui-audit";

const VIEWPORTS = [
  { name: "mobile-sm-320", width: 320, height: 568, label: "iPhone SE 1세대 · 안드로이드 소형" },
  { name: "iphone13-390", width: 390, height: 844, label: "iPhone 13/14/15 standard", device: devices["iPhone 13"] },
  { name: "tablet-768", width: 768, height: 1024, label: "iPad portrait" },
  { name: "desktop-1280", width: 1280, height: 800, label: "desktop standard" },
];

mkdirSync(outDir, { recursive: true });

console.log(`UI audit — ${base}${path}`);
console.log(`out: ${outDir}\n`);

const browser = await chromium.launch();
const summary = [];
let totalOverflow = 0;

for (const vp of VIEWPORTS) {
  const ctx = vp.device
    ? await browser.newContext(vp.device)
    : await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();

  try {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(800);

    const pngPath = `${outDir}/${vp.name}.png`;
    await page.screenshot({ path: pngPath, fullPage: true });

    const result = await page.evaluate(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const found = [];
      const selectors = "button, a, [role='button'], [draggable='true']";
      // CONVENTION §8.2.1·§8.2.2 — critical vs informational 분류.
      function classify(el) {
        // 명시 마커 우선
        const explicit = el.getAttribute("data-cta-priority");
        if (explicit === "critical" || explicit === "informational") return explicit;
        // form 안 → informational (자연 스크롤 form 영역)
        if (el.closest("form")) return "informational";
        // position sticky / fixed → informational (어디서든 노출)
        let cur = el;
        while (cur && cur !== document.body) {
          const pos = getComputedStyle(cur).position;
          if (pos === "sticky" || pos === "fixed") return "informational";
          cur = cur.parentElement;
        }
        return "critical";
      }
      document.querySelectorAll(selectors).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return; // 숨김
        const overflowX = r.right > vw + 1;
        const overflowY = r.bottom > vh + 1;
        if (overflowX || overflowY) {
          found.push({
            tag: el.tagName,
            text: (el.textContent || "").trim().slice(0, 30),
            priority: classify(el),
            box: {
              x: Math.round(r.x),
              y: Math.round(r.y),
              w: Math.round(r.width),
              h: Math.round(r.height),
              right: Math.round(r.right),
              bottom: Math.round(r.bottom),
            },
            overflowX,
            overflowY,
          });
        }
      });
      return { vw, vh, overflows: found };
    });

    const criticals = result.overflows.filter((o) => o.priority === "critical");
    const informationals = result.overflows.filter((o) => o.priority === "informational");
    const pass = criticals.length === 0;
    if (!pass) totalOverflow += criticals.length;
    summary.push({
      viewport: vp.name,
      label: vp.label,
      vw: result.vw,
      vh: result.vh,
      pass,
      criticals,
      informationals,
      png: pngPath,
    });

    const icon = pass ? (informationals.length > 0 ? "✅⚠" : "✅") : "❌";
    console.log(
      `${icon} ${vp.name} (${result.vw}×${result.vh}) — ${vp.label}`,
    );
    if (criticals.length > 0) {
      console.log(`   🔴 critical (gate fail):`);
      criticals.slice(0, 5).forEach((o) =>
        console.log(
          `      "${o.text}" right=${o.box.right}/${result.vw} bottom=${o.box.bottom}/${result.vh}`,
        ),
      );
    }
    if (informationals.length > 0) {
      console.log(`   🟡 informational (자연 스크롤, gate 통과):`);
      informationals.slice(0, 5).forEach((o) =>
        console.log(
          `      "${o.text}" right=${o.box.right}/${result.vw} bottom=${o.box.bottom}/${result.vh}`,
        ),
      );
    }
    console.log(`   📷 ${pngPath}`);
  } catch (e) {
    summary.push({
      viewport: vp.name,
      label: vp.label,
      pass: false,
      error: e.message,
    });
    console.log(`⚠ ${vp.name}: ${e.message.slice(0, 80)}`);
  }

  await ctx.close();
}

await browser.close();

const jsonPath = `${outDir}/audit.json`;
writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      base,
      path,
      timestamp: new Date().toISOString(),
      totalOverflow,
      pass: totalOverflow === 0,
      viewports: summary,
    },
    null,
    2,
  ),
);

const totalInformational = summary.reduce(
  (n, s) => n + (s.informationals?.length ?? 0),
  0,
);

console.log(`\n=== 요약 ===`);
console.log(`critical overflow: ${totalOverflow} (gate)`);
console.log(`informational overflow: ${totalInformational} (자연 스크롤, gate 통과)`);
console.log(`결과 JSON: ${jsonPath}`);

if (totalOverflow > 0) {
  console.log(`\n❌ FAIL — critical overflow ${totalOverflow}건 발견. 머지 전 0까지 fix 의무 (CONVENTION §8.2.1).`);
  process.exit(1);
}
if (totalInformational > 0) {
  console.log(`\n✅ PASS (with warnings) — critical=0. informational ${totalInformational}건 (자연 스크롤·form 안·sticky).`);
} else {
  console.log(`\n✅ PASS — 4 viewport 모두 overflow=0.`);
}
