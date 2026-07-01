import type { Config } from "tailwindcss";

// 풀림 게임즈 디자인 시스템 v0.1
// 출처: proc/spec/08-디자인-시스템.md
const config: Config = {
    darkMode: ["class"],
    content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./games/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			// 풀림 통합 룩 팔레트 (spec/08 §8.1). 기존 시맨틱 이름 유지 + 값 remap.
  			bg: {
  				primary: '#F0F6FB',
  				block: '#FFFFFF'
  			},
  			border: {
  				hairline: '#D6E2EE'
  			},
  			type: {
  				primary: '#0D1A1F',
  				secondary: '#45555C'
  			},
  			accent: {
  				positive: '#0362DA',
  				negative: '#F87171'
  			},
  			// Core 4 + Extended (web)
  			'pullim-ink': {
  				DEFAULT: '#0D1A1F',
  				'2': '#1F2C32',
  				'3': '#45555C',
  				'4': '#5E6B72',
  				'5': '#B0BCC3'
  			},
  			'pullim-paper': {
  				DEFAULT: '#F0F6FB',
  				'2': '#F0F6FB',
  				'3': '#F4FAFF'
  			},
  			'pullim-line': {
  				DEFAULT: '#D6E2EE',
  				'2': '#E8EFF6'
  			},
  			'pullim-lemon': '#E6FF4C',
  			// 풀림 통합 룩 — 중립 스케일을 ink/paper-tinted 로 remap(cool-gray → blue-ink).
  			// slate 직접 사용 컴포넌트(셸·인증·허브)도 통합 룩 반영. spec/08 §8.1.
  			'pullim-slate': {
  				'50': '#F4FAFF',
  				'100': '#E8EFF6',
  				'200': '#D6E2EE',
  				'300': '#B0BCC3',
  				'400': '#8A97A0',
  				'500': '#5E6B72',
  				'600': '#45555C',
  				'700': '#33444B',
  				'800': '#1F2C32',
  				'900': '#0D1A1F'
  			},
  			'pullim-blue': {
  				'50': '#E5F0FB',
  				'100': '#BFD7F4',
  				'200': '#8FB7EB',
  				'300': '#4D90DF',
  				'500': '#0362DA',
  				'600': '#0250B0',
  				'700': '#033D85'
  			},
  			'pullim-danger': '#EF4444',
  			card: '#FFFFFF',
  			foreground: '#0D1A1F',
  			background: '#F0F6FB'
  		},
  		fontFamily: {
  			sans: [
  				'Pretendard Variable',
  				'Pretendard',
  				'Spoqa Han Sans Neo',
  				'sans-serif'
  			],
  			// 풀림 통합 룩 — mono (next/font CSS var). spec/08 §8.2.
  			mono: [
  				'var(--font-jetbrains-mono)',
  				'ui-monospace',
  				'SF Mono',
  				'Menlo',
  				'monospace'
  			]
  		},
  		fontSize: {
  			display: [
  				'2rem',
  				{
  					lineHeight: '1.2',
  					fontWeight: '600'
  				}
  			],
  			body: [
  				'1.125rem',
  				{
  					lineHeight: '1.5',
  					fontWeight: '500'
  				}
  			],
  			label: [
  				'0.875rem',
  				{
  					lineHeight: '1.4',
  					fontWeight: '500'
  				}
  			],
  			helper: [
  				'0.875rem',
  				{
  					lineHeight: '1.4',
  					fontWeight: '400'
  				}
  			]
  		},
  		spacing: {},
  		borderRadius: {
  			block: '4px',
  			button: '6px',
  			dropzone: '8px',
  			modal: '16px'
  		},
  		boxShadow: {
  			block: '0 1px 0 rgba(0,0,0,0.04)',
  			dragging: '0 8px 24px rgba(0,0,0,0.12)',
  			glow: '0 0 24px rgba(3,98,218,0.4)',
  			'pullim-sm': '0 1px 2px rgba(15, 23, 42, 0.08)'
  		},
  		transitionTimingFunction: {
  			'ease-glow': 'cubic-bezier(0.16, 1, 0.3, 1)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [],
};

export default config;
