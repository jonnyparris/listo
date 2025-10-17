import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],

	build: {
		// Enable minification (esbuild is faster and doesn't require extra dependency)
		minify: 'esbuild',

		// Optimize chunk splitting
		rollupOptions: {
			output: {
				manualChunks: {
					// Split vendor code
					'svelte-vendor': ['svelte', 'svelte/transition', 'svelte/easing']
				}
			}
		},

		// Enable source maps for production debugging (optional)
		sourcemap: false,

		// Set chunk size warning limit
		chunkSizeWarningLimit: 1000
	},

	optimizeDeps: {
		// Pre-bundle these dependencies
		include: ['dexie']
	}
});
