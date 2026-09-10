// HTML fixture는 감사 엔진의 대조군이다. 실제 앱 로그인 검사를 대체하지 않는다.
import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanControls, viewportOptions, assertTarget } from "../scripts/ui-audit.mjs";

test("버튼·링크 안 중첩 텍스트의 잘림도 탐지한다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.setContent(`<main>
    <button style="border:0;width:100px;overflow:hidden"><span style="white-space:nowrap">전체를 읽어야 풀 수 있는 아주 긴 정답 선택지입니다</span></button>
    <a href="#" style="display:block;width:100px;overflow:hidden"><strong><span style="white-space:nowrap">중첩 링크 설명도 모두 읽을 수 있어야 합니다</span></strong></a>
  </main>`);
  const result = await scanControls(page);
  expect(result.overflows.some(item => item.text.includes("정답 선택지") && item.overflowX)).toBe(true);
  expect(result.overflows.some(item => item.text.includes("중첩 링크") && item.overflowX)).toBe(true);
});

test("정상 테두리는 통과하고 테두리 안 글자 잘림은 탐지한다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.setContent(`<main>
    <p style="border:4px solid;width:100px;overflow:hidden">짧은 설명</p>
    <button style="border:4px solid;width:100px;overflow:hidden"><span>정상 선택지</span></button>
    <p style="border:4px solid;width:100px;overflow:hidden;white-space:nowrap">테두리 안에서 잘리는 긴 설명입니다</p>
  </main>`);
  const result = await scanControls(page);
  expect(result.overflows.some(item => item.text === "짧은 설명")).toBe(false);
  expect(result.overflows.some(item => item.text === "정상 선택지")).toBe(false);
  expect(result.overflows.some(item => item.text.includes("잘리는 긴 설명") && item.overflowX)).toBe(true);
});

test("문제 설명·힌트·도해의 가로 초과와 자체 잘림을 탐지한다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.setContent(`<style>body{margin:0}</style><main>
    <h1 style="width:600px">문제 제목</h1>
    <p style="width:120px;overflow:hidden;white-space:nowrap">화면에서 모두 읽을 수 있어야 하는 긴 힌트입니다</p>
    <svg role="img" aria-label="학습 도해" width="500" height="80"></svg>
    <button>확인</button></main>`);
  const result = await scanControls(page);
  expect(result.overflows.some(item => item.text === "문제 제목")).toBe(true);
  expect(result.overflows.some(item => item.text.includes("긴 힌트"))).toBe(true);
  expect(result.overflows.some(item => item.text === "학습 도해")).toBe(true);
});

test("정상 줄바꿈과 스크롤 가능한 학습 본문은 통과한다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.setContent(`<style>body{margin:0}</style><main>
    <p style="width:160px">정상적으로 여러 줄에 걸쳐 표시되는 학습 설명입니다.</p>
    <span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap">화면 낭독기 전용 안내</span>
    <div style="height:100px;overflow-y:auto"><div style="height:700px"></div><p>스크롤 끝 설명</p></div>
    <details><summary>설명</summary><p style="width:900px">접힌 설명</p></details>
    <svg role="img" aria-label="정상 도해" width="200" height="80"></svg></main>`);
  expect((await scanControls(page)).overflows).toEqual([]);
});

test("접힌 details·숨김 버튼은 검사하지 않고 세로 목록은 스크롤해서 검사한다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.setContent(`<style>body{margin:0}button{width:100px;height:44px}</style>
    <details><summary>필터</summary><button style="position:absolute;top:1500px">접힘</button></details>
    <button style="visibility:hidden;position:absolute;left:1000px">숨김</button>
    <div style="height:350px;overflow-y:auto"><div style="height:1200px"></div><button>목록 끝</button></div>`);
  const result = await scanControls(page);
  expect(result.overflows).toEqual([]);
});

test("실제 가로 초과와 스크롤할 수 없는 잘림은 실패한다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.setContent(`<style>body{margin:0}button{height:44px}</style>
    <button style="width:400px">가로 초과</button>
    <div style="height:60px;overflow:clip"><div style="height:700px"></div><button>접근 불가</button></div>`);
  const result = await scanControls(page);
  expect(result.overflows.some((item) => item.text === "가로 초과" && item.overflowX)).toBe(true);
  expect(result.overflows.some((item) => item.text === "접근 불가")).toBe(true);
});

test("iPhone 프리셋보다 요청한 390×844 viewport 계약을 우선한다", async ({ browser }) => {
  const context = await browser.newContext(viewportOptions({ width: 390, height: 844, device: "iPhone 13" }));
  try {
    expect(context.pages()).toHaveLength(0);
    const page = await context.newPage();
    await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1">');
    expect(await page.evaluate(() => [innerWidth, innerHeight])).toEqual([390, 844]);
  } finally { await context.close(); }
});

test("접속 오류는 전체 보고서와 프로세스를 실패시킨다", async () => {
  const out = mkdtempSync(join(tmpdir(), "cur23-audit-error-"));
  let exitCode = 0;
  try {
    execFileSync(process.execPath, ["scripts/capture-ui-audit.mjs", "/games", "--base", "http://127.0.0.1:1", "--out", out], { stdio: "pipe", timeout: 20000 });
  } catch (error) { exitCode = error.status; }
  expect(JSON.parse(readFileSync(join(out, "audit.json"), "utf8")).pass).toBe(false);
  expect(exitCode).toBe(1);
});

test("문서 가로 넘침과 overflow:hidden의 접근 불가 버튼을 통과시키지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.setContent(`<style>body{margin:0}button{width:100px;height:44px}</style>
    <button style="position:absolute;left:1000px">문서 밖</button>
    <div style="height:60px;overflow:hidden"><div style="height:700px"></div><button>숨김 잘림</button></div>`);
  const result = await scanControls(page);
  expect(result.overflows.some((item) => item.text === "문서 밖" && item.overflowX)).toBe(true);
  expect(result.overflows.some((item) => item.text === "숨김 잘림" && item.overflowY)).toBe(true);
});

test("랜딩에 머문 상태를 게임 허브 검사 성공으로 인정하지 않는다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "가입 없이 게스트로 시작 →" })).toBeVisible();
  await expect(assertTarget(page, new URL("/games", page.url()))).rejects.toThrow();
});


test("form·sticky·fixed 넘침은 경고이고 일반 넘침은 critical이다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.setContent(`<main>
    <form><button style="width:600px">form overflow</button></form>
    <div style="position:fixed;top:100px"><button style="width:600px">fixed overflow</button></div>
    <div style="position:sticky;top:0"><button style="width:600px">sticky overflow</button></div>
    <button style="width:600px">ordinary overflow</button>
  </main>`);
  const result = await scanControls(page);
  for (const name of ["form overflow", "fixed overflow", "sticky overflow"])
    expect(result.overflows.find(item => item.text === name)?.priority).toBe("informational");
  expect(result.overflows.find(item => item.text === "ordinary overflow")?.priority).toBe("critical");
});
