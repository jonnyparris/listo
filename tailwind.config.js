/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				// Lazy Days palette - darkened by 20%
				primary: {
					DEFAULT: '#99B6A8',
					light: '#AABFB3',
					dark: '#85AA97'
				},
				secondary: {
					DEFAULT: '#C29E80',
					light: '#C5AD96',
					dark: '#BC916A'
				},
				background: {
					light: '#CAC9C6',
					dark: '#232322'
				},
				text: {
					DEFAULT: '#222222',
					muted: '#585856'
				},
				surface: {
					light: '#C4C3BF',
					dark: '#2E2E2D'
				}
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				serif: ['Fraunces', 'Libre Baskerville', 'Georgia', 'serif']
			},
			letterSpacing: {
				'wordmark': '0.02em'
			},
			lineHeight: {
				'body': '1.6'
			},
			borderRadius: {
				'2xl': '1.25rem',
				'3xl': '1.5rem'
			},
			boxShadow: {
				'soft': '0 8px 24px -8px rgba(0, 0, 0, 0.06), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
				'card': '0 16px 40px -12px rgba(0, 0, 0, 0.08), 0 4px 16px -4px rgba(0, 0, 0, 0.06)',
				'float': '0 24px 48px -16px rgba(0, 0, 0, 0.10)'
			},
			transitionTimingFunction: {
				'spring': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
				'spring-in': 'cubic-bezier(0.4, 0.0, 1, 1)',
				'spring-out': 'cubic-bezier(0.0, 0.0, 0.2, 1)'
			}
		}
	},
	plugins: [require('@tailwindcss/typography')]
};
