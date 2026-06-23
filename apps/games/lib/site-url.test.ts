import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteHost, getSiteUrl } from "./site-url";

describe("getSiteUrl — 공개 도메인 매핑", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("NEXT_PUBLIC_SITE_URL override 가 최우선", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://forced.example.com/");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(getSiteUrl()).toBe("https://forced.example.com"); // 끝 슬래시 제거
  });

  it("production 배포 → games.pullim.ai", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "main");
    expect(getSiteUrl()).toBe("https://games.pullim.ai");
  });

  it("dev 브랜치 배포 → dev-games.pullim.ai", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "dev");
    expect(getSiteUrl()).toBe("https://dev-games.pullim.ai");
  });

  it("PR preview(임의 브랜치) → 자기 배포 호스트(VERCEL_URL)", () => {
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
