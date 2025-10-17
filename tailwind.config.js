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
				}
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				serif: ['Cormorant Garamond', 'Georgia', 'serif']
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
				'soft': '0 10px 30px -15px rgba(0, 0, 0, 0.08)',
				'card': '0 20px 40px -20px rgba(0, 0, 0, 0.1)'
			}
		}
	},
	plugins: [require('@tailwindcss/typography')]
};
