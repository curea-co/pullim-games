import type { Config } from "tailwindcss";

// 풀림 게임즈 디자인 시스템 v0.1
// 출처: proc/spec/08-디자인-시스템.md
const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/games/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			bg: {
  				primary: '#FBFAF8',
  				block: '#FFFFFF'
  			},
  			border: {
  				hairline: '#E5E5E5'
  			},
  			type: {
  				primary: '#0F172A',
  				secondary: '#64748B'
  			},
  			accent: {
  				positive: '#0362DA',
  				negative: '#F87171'
  			},
  			'pullim-slate': {
  				'50': '#F8FAFC',
  				'100': '#F1F5F9',
  				'200': '#E2E8F0',
  				'300': '#CBD5E1',
  				'400': '#94A3B8',
  				'500': '#64748B',
  				'600': '#475569',
  				'700': '#334155',
  				'800': '#1E293B',
  				'900': '#0F172A'
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
  			foreground: '#0F172A',
  			background: '#FBFAF8'
  		},
  		fontFamily: {
  			sans: [
  				'Pretendard Variable',
  				'Pretendard',
  				'Spoqa Han Sans Neo',
  				'sans-serif'
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
