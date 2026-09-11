import { it, expect, vi, afterEach } from "vitest";
const request = vi.hoisted(() => ({headers: new Headers()}));
vi.mock("next/headers", () => ({headers: async () => request.headers}));
import { getRequestOrigin } from "./request-origin";
afterEach(() => vi.unstubAllEnvs());
it.each([
 ["evil.example", "https", "https://games.pullim.ai"],
 ["games.pullim.ai.evil.example", "https", "https://games.pullim.ai"],
 ["games.pullim.ai", "javascript", "https://games.pullim.ai"],
 ["games.pullim.ai", "http", "https://games.pullim.ai"],
 ["dev-games.pullim.ai", "https", "https://dev-games.pullim.ai"],
 ["games.pullim.local:3004", "http", "http://games.pullim.local:3004"],
 ["localhost:3004", "http", "http://localhost:3004"],
 ["other.vercel.app", "https", "https://games.pullim.ai"],
])("origin 경계 %s %s", async (host, proto, expected) => {
 vi.stubEnv("VERCEL_ENV", ""); vi.stubEnv("VERCEL_GIT_COMMIT_REF", ""); vi.stubEnv("NEXT_PUBLIC_SITE_URL", ""); vi.stubEnv("VERCEL_URL", "");
 request.headers = new Headers({host, "x-forwarded-proto":proto});
 expect(await getRequestOrigin()).toBe(expected);
});
it("현재 배포의 정확한 preview 호스트만 허용", async () => {
 vi.stubEnv("VERCEL_URL", "games-current.vercel.app");
 request.headers = new Headers({host:"games-current.vercel.app", "x-forwarded-proto":"https"});
 expect(await getRequestOrigin()).toBe("https://games-current.vercel.app");
});
