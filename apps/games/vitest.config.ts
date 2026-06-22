import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["{app,components,games,lib}/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: [
        "lib/core/**",
        "games/*/logic/**",
      ],
      exclude: [
        "**/*.{test,spec}.ts",
        "**/types.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` 는 React Server Component runtime 보호용. vitest 환경에서는
      // no-op 으로 alias 하여 server-side 모듈 직접 테스트 가능하게 한다.
      "server-only": path.resolve(__dirname, "./test/server-only-shim.ts"),
    },
  },
});
