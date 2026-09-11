const config = {
  plugins: {
    // os-tokens.css(.os-root) 의 네이티브 CSS 네스팅(`& .foo {}`)을 flatten.
    // tailwindcss 앞에 와야 함. (Tailwind v3 내장 nesting 래퍼)
    "tailwindcss/nesting": {},
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
