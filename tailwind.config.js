/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				// Lazy Days palette
				primary: {
					DEFAULT: '#BFE3D0',
					light: '#D4EDE0',
					dark: '#A6D4BD'
				},
				secondary: {
					DEFAULT: '#F2C6A0',
					light: '#F7D8BC',
					dark: '#EAB584'
				},
				background: {
					light: '#FDFBF7',
					dark: '#2C2C2B'
				},
				text: {
					DEFAULT: '#2B2B2B',
					muted: '#6E6E6B'
				},
				surface: {
					light: '#F5F3EF',
					dark: '#3A3A38'
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
