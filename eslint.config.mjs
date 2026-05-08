// ESLint Flat Config (ESLint 9.x).
// Plan R §5.4 — barrel import 강제: 게임 모듈은 `@/lib/core/<sub>/*` 직접 import 금지, `@/lib/core` 만 허용.

import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      ".next-dev/**", // dev distDir (next.config.ts NODE_ENV 분기)
      "node_modules/**",
      "src/lib/games/registry.generated.ts", // auto-generated
      "next-env.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      // 게임 모듈은 lib/core 의 barrel 만 import — internal 직접 import 차단.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/core/fsrs/*",
                "@/lib/core/fingerprint/*",
                "@/lib/core/schema/*",
                "@/lib/core/storage/*",
                "@/lib/core/event/*",
                "@/lib/core/ast/*",
                "@/lib/core/recommendation/*",
                "@/lib/core/dashboard/*",
              ],
              message:
                "lib/core 내부 경로 직접 import 금지. `@/lib/core` barrel 사용. (Plan R §5.4)",
            },
          ],
        },
      ],
    },
  },
  {
    // lib/core 내부에서는 internal import 허용 (자기 자신 참조 위해)
    files: ["src/lib/core/**"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // 테스트 파일은 internal 접근 허용 (white-box test 가능)
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // scripts 는 별도 환경
    files: ["scripts/**"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // 일반적으로 너무 시끄러운 규칙 OFF
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
);
