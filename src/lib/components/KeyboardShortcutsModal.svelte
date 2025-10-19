<script lang="ts">
	interface Props {
		show: boolean;
		onClose: () => void;
	}

	let { show, onClose }: Props = $props();
</script>

{#if show}
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="keyboard-shortcuts-title"
		tabindex="-1"
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
		onclick={onClose}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				onClose();
			}
		}}
	>
		<div
			role="document"
			class="bg-white dark:bg-surface-dark rounded-2xl shadow-xl max-w-2xl w-full p-4 sm:p-8 max-h-[80vh] overflow-y-auto"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between mb-6 pb-4 border-b border-black/5 dark:border-white/5">
				<h2 id="keyboard-shortcuts-title" class="text-2xl font-semibold text-text dark:text-white">Keyboard Shortcuts</h2>
				<button
					onclick={onClose}
					class="text-text-muted hover:text-text dark:hover:text-white transition-colors"
					aria-label="Close"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>

			<div class="space-y-6">
				<div>
					<h3 class="text-lg font-semibold text-text dark:text-white mb-3">General</h3>
					<div class="space-y-2">
						<div class="flex justify-between items-center">
							<span class="text-text-muted">Show this help</span>
							<kbd class="px-2 py-1 bg-surface-light dark:bg-surface-dark rounded text-sm font-mono">?</kbd>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-text-muted">Close dialog/form</span>
							<kbd class="px-2 py-1 bg-surface-light dark:bg-surface-dark rounded text-sm font-mono">Esc</kbd>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-text-muted">Focus search</span>
							<kbd class="px-2 py-1 bg-surface-light dark:bg-surface-dark rounded text-sm font-mono">/</kbd>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-text-muted">Toggle active/completed</span>
							<kbd class="px-2 py-1 bg-surface-light dark:bg-surface-dark rounded text-sm font-mono">T</kbd>
						</div>
					</div>
				</div>

				<div>
					<h3 class="text-lg font-semibold text-text dark:text-white mb-3">Recommendations</h3>
					<div class="space-y-2">
						<div class="flex justify-between items-center">
							<span class="text-text-muted">New recommendation</span>
							<kbd class="px-2 py-1 bg-surface-light dark:bg-surface-dark rounded text-sm font-mono">N</kbd>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-text-muted">Navigate down</span>
							<kbd class="px-2 py-1 bg-surface-light dark:bg-surface-dark rounded text-sm font-mono">↓</kbd>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-text-muted">Navigate up</span>
							<kbd class="px-2 py-1 bg-surface-light dark:bg-surface-dark rounded text-sm font-mono">↑</kbd>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-text-muted">Complete/uncomplete selected</span>
							<kbd class="px-2 py-1 bg-surface-light dark:bg-surface-dark rounded text-sm font-mono">Enter</kbd>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-text-muted">Edit selected</span>
							<kbd class="px-2 py-1 bg-surface-light dark:bg-surface-dark rounded text-sm font-mono">E</kbd>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-text-muted">Delete selected</span>
							<kbd class="px-2 py-1 bg-surface-light dark:bg-surface-dark rounded text-sm font-mono">D</kbd>
						</div>
					</div>
				</div>

				<div>
					<h3 class="text-lg font-semibold text-text dark:text-white mb-3">Forms</h3>
					<div class="space-y-2">
						<div class="flex justify-between items-center">
							<span class="text-text-muted">Save form</span>
							<kbd class="px-2 py-1 bg-surface-light dark:bg-surface-dark rounded text-sm font-mono">⌘S / Ctrl+S</kbd>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-text-muted">Save from textarea</span>
							<kbd class="px-2 py-1 bg-surface-light dark:bg-surface-dark rounded text-sm font-mono">⌘Enter / Ctrl+Enter</kbd>
						</div>
					</div>
				</div>
			</div>

			<div class="mt-6 pt-4 border-t border-black/5 dark:border-white/5 text-center">
				<p class="text-sm text-text-muted">
					Press <kbd class="px-2 py-1 bg-surface-light dark:bg-surface-dark rounded text-sm font-mono">?</kbd> anytime to toggle this help
				</p>
			</div>
		</div>
	</div>
{/if}
