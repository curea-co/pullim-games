#!/usr/bin/env node
// 표준 앱의 정상 게스트 진입 → 목표 화면 → 4 viewport 접근성 측정.
// bun run ui:audit /games [--base http://localhost:3004] [--out /tmp/ui-audit]
import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { viewportOptions, assertTarget, scanControls } from "./ui-audit.mjs";

const args = process.argv.slice(2);
const path = args[0];
if (!path || !path.startsWith("/") || path.startsWith("//")) {
  console.error("usage: bun run ui:audit /path [--base URL] [--out DIR]");
  process.exit(2);
}
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const base = option("--base", "http://localhost:3004");
const outDir = option("--out", "/tmp/ui-audit");
const target = new URL(path, base);
const viewports = [
  { name: "mobile-sm-320", width: 320, height: 568 },
  { name: "iphone13-390", width: 390, height: 844, device: "iPhone 13" },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 800 },
];
mkdirSync(outDir, { recursive: true });
const results = [];
let browser;

async function enterGuest(page) {
  // e2e/helpers/guest.ts와 같은 실제 폼 흐름. Node CLI에서 TS fixture/신원을 주입하지 않는다.
  await page.goto(new URL("/", base).href);
  await page.getByRole("link", { name: "가입 없이 게스트로 시작 →" }).click();
  await expect(page).toHaveURL(new URL("/start", base).href);
  await page.getByLabel("닉네임", { exact: true }).fill("화면검증");
  await page.getByLabel("학년", { exact: true }).selectOption({ index: 1 });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "시작하기", exact: true }).click();
  await expect(page).toHaveURL(new URL("/home", base).href);
}

try {
  browser = await chromium.launch();
  for (const vp of viewports) {
    let context;
    try {
      context = await browser.newContext(viewportOptions(vp));
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      if (/^\/(games|home|manage|about)(\/|$)/.test(target.pathname)) await enterGuest(page);
      const response = await page.goto(target.href);
      if (!response?.ok()) throw new Error(`Target HTTP ${response?.status() ?? "no response"}`);
      await assertTarget(page, target);
      const size = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
      if (size.width !== vp.width || size.height !== vp.height) throw new Error(`Viewport mismatch: ${size.width}×${size.height}, expected ${vp.width}×${vp.height}`);
      const png = `${outDir}/${vp.name}.png`;
      await page.screenshot({ path: png, fullPage: true });
      const measurement = await scanControls(page);
      await assertTarget(page, target);
      const criticals = measurement.overflows.filter(item => item.priority === "critical");
      const informationals = measurement.overflows.filter(item => item.priority === "informational");
      const pass = criticals.length === 0 && errors.length === 0;
      results.push({ viewport: vp.name, ...measurement, criticals, informationals, errors, pass, url: page.url(), title: await page.title(), png });
      console.log(`${pass ? "PASS" : "FAIL"} ${vp.name} ${measurement.vw}×${measurement.vh}: checked=${measurement.checked}, scrolled=${measurement.scrolled}, critical=${criticals.length}, informational=${informationals.length}, pageerror=${errors.length}`);
      for (const item of criticals.slice(0, 5)) console.log(`  ${item.text}: right=${item.box.right}, bottom=${item.box.bottom}`);
    } catch (error) {
      results.push({ viewport: vp.name, pass: false, error: error.message });
      console.error(`FAIL ${vp.name}: ${error.message.slice(0, 160)}`);
    } finally {
      await context?.close();
    }
  }
} catch (error) {
  results.push({ pass: false, error: error.message });
} finally {
  await browser?.close();
}

const pass = results.length === viewports.length && results.every((result) => result.pass);
const report = {
  base, path, timestamp: new Date().toISOString(),
  totalOverflow: results.reduce((sum, result) => sum + (result.criticals?.length ?? 0), 0),
  pass, viewports: results,
};
writeFileSync(`${outDir}/audit.json`, JSON.stringify(report, null, 2));
console.log(`${pass ? "PASS" : "FAIL"}: ${outDir}/audit.json`);
process.exitCode = pass ? 0 : 1;
