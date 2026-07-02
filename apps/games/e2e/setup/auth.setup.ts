// e2e 전역 인증 셋업 — Playwright storageState 파일 생성.
// plan: proc/plan/2026-06-30_e2e-infra-fix.md §2 H2 fix.
//
// 목적:
//   모든 e2e spec 이 인증/온보딩 게이트를 통과한 상태에서 시작할 수 있도록
//   Playwright storageState 를 미리 만든다. playwright.config.ts 의 chromium 프로젝트가
//   `use.storageState` 로 이 상태를 상속받는다.
//
// SoT: 게스트 fixture(쿠키·localStorage 프로필)와 경로 상수는 helpers/auth.ts 가 단일 출처다
//   (Codex #134 R2 — setup 과 재시드 helper 가 같은 fixture 를 중복 정의하던 split-brain 제거).
//   본 파일은 seedGuestSession() 을 호출해 상태를 주입한 뒤 storageState 로 저장만 한다.
//
// 주의: 일부 spec 은 내부에서 localStorage.clear() 를 호출하는데, 이는 player profile 도 함께
//   지운다 → 게이트 실패. 그런 spec 은 helpers/auth.ts 의 seedGuestSession() 을 명시적으로
//   호출해 재주입해야 한다 (activity-heatmap.spec.ts, home-dashboard-layout.spec.ts 등).
//   storageState 는 테스트 시작 시점의 초기 상태를 제공하지, 런타임 localStorage.clear() 이후를
//   복구하지는 않는다.

import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";
import { seedGuestSession, STORAGE_STATE_PATH } from "../helpers/auth";

setup("게스트 인증 storageState 생성", async ({ page, context }) => {
  // 1. 게스트 쿠키 + localStorage 프로필 주입 (helpers/auth.ts SoT).
  //    addInitScript 로 등록되므로 아래 goto 전에 호출해야 첫 렌더 전에 반영된다.
  await seedGuestSession(page, context);

  // 2. "/" 로 이동해 addInitScript 가 localStorage 에 프로필을 쓰게 한다 → storageState 에 캡처.
  await page.goto("/");

  // 3. storageState 저장 — 이후 chromium 프로젝트의 모든 테스트가 이 상태를 상속.
  //    fresh checkout 엔 .playwright/ 가 없으므로 부모 디렉터리를 먼저 생성한다(Codex #134 R1).
  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
