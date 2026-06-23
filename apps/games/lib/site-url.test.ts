import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteHost, getSiteUrl } from "./site-url";

describe("getSiteUrl — 공개 도메인 매핑", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("production 배포 → games.pullim.ai (stale NEXT_PUBLIC_SITE_URL 무시)", () => {
    // 기존 프로젝트에 남은 옛 값이 있어도 매핑이 우선.
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pullim-games.vercel.app");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "main");
    expect(getSiteUrl()).toBe("https://games.pullim.ai");
  });

  it("dev 브랜치 배포 → dev-games.pullim.ai (stale override 무시)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://old.example.com");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "dev");
    expect(getSiteUrl()).toBe("https://dev-games.pullim.ai");
  });

  it("prod/dev 외 컨텍스트에서는 NEXT_PUBLIC_SITE_URL override 적용", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://forced.example.com/");
    expect(getSiteUrl()).toBe("https://forced.example.com"); // 끝 슬래시 제거
  });

  it("PR preview(임의 브랜치, override 없음) → 자기 배포 호스트(VERCEL_URL)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "feat/foo");
    vi.stubEnv("VERCEL_URL", "pullim-games-abc123.vercel.app");
    expect(getSiteUrl()).toBe("https://pullim-games-abc123.vercel.app");
  });

  it("로컬/미상 → games.pullim.ai 폴백", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(getSiteUrl()).toBe("https://games.pullim.ai");
  });

  it("getSiteHost 는 스킴 제거", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "dev");
    expect(getSiteHost()).toBe("dev-games.pullim.ai");
  });
});
