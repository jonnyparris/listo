<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from './ui';

	let showPrompt = $state(false);
	let deferredPrompt: any = null;

	onMount(() => {
		// Check if already installed or prompt was dismissed
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
		const promptDismissed = localStorage.getItem('pwa-install-prompt-dismissed');

		// Check if user is on mobile
		const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

		// Only show prompt on mobile, first visit, not installed, and not dismissed
		if (isMobile && !isStandalone && !promptDismissed) {
			// Listen for beforeinstallprompt event
			window.addEventListener('beforeinstallprompt', (e) => {
				e.preventDefault();
				deferredPrompt = e;
				showPrompt = true;
			});

			// For iOS, show manual instructions since it doesn't support beforeinstallprompt
			if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && !isStandalone) {
				showPrompt = true;
			}
		}
	});

	async function handleInstall() {
		if (deferredPrompt) {
			// For Android and browsers that support beforeinstallprompt
			deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;

			if (outcome === 'accepted') {
				showPrompt = false;
			}
			deferredPrompt = null;
		}
		// For iOS, the prompt will show instructions
	}

	function handleDismiss() {
		showPrompt = false;
		localStorage.setItem('pwa-install-prompt-dismissed', 'true');
	}

	// Check if user is on iOS
	const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
</script>

{#if showPrompt}
	<div
		class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 safe-area-inset-bottom"
	>
		<div class="max-w-4xl mx-auto px-4 py-4">
			<div class="flex items-start gap-3">
				<div class="flex-shrink-0">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
						<polyline points="7 10 12 15 17 10"></polyline>
						<line x1="12" y1="15" x2="12" y2="3"></line>
					</svg>
				</div>
				<div class="flex-1 min-w-0">
					<h3 class="text-sm font-semibold text-text dark:text-white mb-1">
						Install Listo
					</h3>
					{#if isIOS}
						<p class="text-xs text-text-muted mb-2">
							Tap the share button <svg class="inline w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor"><path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"/><path d="M24 7h2v21h-2z"/><path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"/></svg> and then "Add to Home Screen" to install.
						</p>
					{:else}
						<p class="text-xs text-text-muted mb-2">
							Add Listo to your home screen for quick access and a better experience.
						</p>
					{/if}
					<div class="flex gap-2">
						{#if !isIOS}
							<Button onclick={handleInstall} variant="primary" size="sm">
								Install
							</Button>
						{/if}
						<Button onclick={handleDismiss} variant="ghost" size="sm">
							{isIOS ? 'Got it' : 'Not now'}
						</Button>
					</div>
				</div>
				<button
					onclick={handleDismiss}
					class="flex-shrink-0 text-text-muted hover:text-text dark:hover:text-white transition-colors"
					aria-label="Close"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.safe-area-inset-bottom {
		padding-bottom: max(1rem, env(safe-area-inset-bottom));
	}
</style>
