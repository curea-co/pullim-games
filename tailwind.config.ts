import type { Config } from "tailwindcss";

// 풀림 게임즈 디자인 시스템 v0.1
// 출처: proc/spec/08-디자인-시스템.md
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/games/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 토큰 시맨틱 이름. 다크모드는 V2.
        bg: {
          primary: "#FBFAF8", // 미세 warm white
          block: "#FFFFFF",
        },
        border: {
          hairline: "#E5E5E5",
        },
        type: {
          primary: "#0F172A",
          secondary: "#64748B",
        },
        accent: {
          positive: "#00D4A1", // 정답 glow, 드롭존 활성 — 글자 사용 금지
          negative: "#F87171", // 오답 절제
        },
        // SaaS shell 팔레트 — pullim-study-demo 차용.
        // 사이드바·헤더·breadcrumb·잠금 표시 등 SaaS UI chrome 에서만 사용.
        // 게임 안 (정답/오답 등) 에는 쓰지 말 것 — accent.* 사용.
        "pullim-slate": {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        "pullim-blue": {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        "pullim-danger": "#EF4444",
        // shadcn 호환 별칭 — shell 컴포넌트가 bg-card / text-foreground 사용.
        card: "#FFFFFF",
        foreground: "#0F172A",
        background: "#FBFAF8",
      },
      fontFamily: {
        // Pretendard Variable — 한국어 가독성. system-ui/Inter/Roboto 금지.
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "Spoqa Han Sans Neo",
          "sans-serif",
        ],
      },
      fontSize: {
        // SPEC §08.2 — display / body / label / helper
        display: ["2rem", { lineHeight: "1.2", fontWeight: "600" }],
        body: ["1.125rem", { lineHeight: "1.5", fontWeight: "500" }],
        label: ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
        helper: ["0.875rem", { lineHeight: "1.4", fontWeight: "400" }],
      },
      spacing: {
        // 8pt scale은 Tailwind 기본 (4px 단위)이 이미 8pt 호환. 별도 토큰 X.
      },
      borderRadius: {
        block: "4px",
        button: "6px",
        dropzone: "8px",
        modal: "16px",
      },
      boxShadow: {
        // SPEC §08.5
        block: "0 1px 0 rgba(0,0,0,0.04)",
        dragging: "0 8px 24px rgba(0,0,0,0.12)",
        glow: "0 0 24px rgba(0,212,161,0.4)",
        "pullim-sm": "0 1px 2px rgba(15, 23, 42, 0.08)",
      },
      transitionTimingFunction: {
        // SPEC §08.6 motion — spring은 Framer Motion에서 처리
        "ease-glow": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
