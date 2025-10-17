<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	interface Props {
		message: string;
		type?: 'success' | 'error' | 'info';
		duration?: number;
		onClose?: () => void;
	}

	let { message, type = 'info', duration = 3000, onClose }: Props = $props();

	let visible = $state(true);

	$effect(() => {
		const timer = setTimeout(() => {
			visible = false;
			setTimeout(() => onClose?.(), 300);
		}, duration);

		return () => clearTimeout(timer);
	});

	function close() {
		visible = false;
		setTimeout(() => onClose?.(), 300);
	}

	const bgColors = {
		success: 'bg-primary/90 dark:bg-primary/80',
		error: 'bg-red-500/90 dark:bg-red-600/80',
		info: 'bg-gray-800/90 dark:bg-gray-700/80'
	};

	const icons = {
		success: '✓',
		error: '✕',
		info: 'ℹ'
	};
</script>

{#if visible}
	<div
		class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4"
		transition:fly={{ y: 20, duration: 300, easing: quintOut }}
	>
		<div
			class="{bgColors[type]} text-white px-6 py-4 rounded-2xl shadow-xl backdrop-blur-sm flex items-center justify-between gap-4"
			role="alert"
		>
			<div class="flex items-center gap-3">
				<span class="text-xl font-semibold">{icons[type]}</span>
				<p class="text-sm font-medium">{message}</p>
			</div>
			<button
				onclick={close}
				class="text-white/80 hover:text-white transition-colors p-1"
				aria-label="Close"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>
		</div>
	</div>
{/if}
