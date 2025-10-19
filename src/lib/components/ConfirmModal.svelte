<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	interface Props {
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'danger' | 'warning' | 'info';
		onConfirm: () => void;
		onCancel: () => void;
	}

	let {
		title,
		message,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		variant = 'danger',
		onConfirm,
		onCancel
	}: Props = $props();

	const variantStyles = {
		danger: {
			button: 'bg-red-500 hover:bg-red-600 text-white',
			icon: '⚠️'
		},
		warning: {
			button: 'bg-amber-500 hover:bg-amber-600 text-white',
			icon: '⚡'
		},
		info: {
			button: 'bg-primary hover:bg-primary/90 text-gray-900',
			icon: 'ℹ️'
		}
	};

	function handleConfirm() {
		onConfirm();
	}

	function handleCancel() {
		onCancel();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleCancel();
		}
	}
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
	transition:fade={{ duration: 200 }}
	onclick={handleBackdropClick}
	role="presentation"
>
	<!-- Modal -->
	<div
		class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
		transition:fly={{ y: 20, duration: 300, easing: quintOut }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<!-- Header -->
		<div class="p-6 pb-4">
			<div class="flex items-start gap-4">
				<div class="text-3xl flex-shrink-0">
					{variantStyles[variant].icon}
				</div>
				<div class="flex-1 min-w-0">
					<h2 id="modal-title" class="text-xl font-serif font-semibold text-gray-900 dark:text-white">
						{title}
					</h2>
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
						{message}
					</p>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="px-6 pb-6 flex gap-3 justify-end flex-col sm:flex-row">
			<button
				onclick={handleCancel}
				class="px-5 py-3 rounded-xl font-medium text-sm transition-all duration-200 min-h-[44px]
					bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200
					hover:bg-gray-200 dark:hover:bg-gray-600
					focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-500"
			>
				{cancelLabel}
			</button>
			<button
				onclick={handleConfirm}
				class="px-5 py-3 rounded-xl font-medium text-sm transition-all duration-200 min-h-[44px]
					{variantStyles[variant].button}
					focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
			>
				{confirmLabel}
			</button>
		</div>
	</div>
</div>
