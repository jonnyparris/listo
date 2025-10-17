<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui';

	let { message, status } = $derived({
		message: $page.error?.message || 'An unexpected error occurred',
		status: $page.status || 500
	});

	function getErrorIcon() {
		if (status === 404) {
			return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`;
		}
		return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />`;
	}

	function getErrorTitle() {
		if (status === 404) return 'Page Not Found';
		if (status === 403) return 'Access Forbidden';
		if (status === 500) return 'Server Error';
		return 'Something Went Wrong';
	}

	function getErrorDescription() {
		if (status === 404) return "The page you're looking for doesn't exist.";
		if (status === 403) return "You don't have permission to access this page.";
		if (status === 500) return 'Our server encountered an error. Please try again later.';
		return 'An unexpected error occurred. Please try again.';
	}
</script>

<div class="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center px-4">
	<div class="max-w-md w-full text-center">
		<!-- Logo -->
		<div class="mb-8 flex justify-center">
			<img
				src="/Listo_Logo_IntentionalChill.svg"
				alt="Listo"
				class="w-full max-w-[200px] h-auto dark:brightness-90 opacity-50"
			/>
		</div>

		<!-- Error Icon -->
		<div class="mb-6">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-20 w-20 mx-auto text-text-muted opacity-50"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				{@html getErrorIcon()}
			</svg>
		</div>

		<!-- Error Message -->
		<h1 class="text-3xl font-semibold text-text dark:text-white mb-4">
			{getErrorTitle()}
		</h1>
		<p class="text-text-muted mb-2">
			{getErrorDescription()}
		</p>
		{#if message && message !== getErrorDescription()}
			<p class="text-sm text-text-muted mb-8 font-mono bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
				{message}
			</p>
		{:else}
			<div class="mb-8"></div>
		{/if}

		<!-- Actions -->
		<div class="flex flex-col sm:flex-row gap-3 justify-center">
			<Button
				onclick={() => window.history.back()}
				variant="ghost"
				class="transition-all ease-spring"
			>
				Go Back
			</Button>
			<Button
				onclick={() => window.location.href = '/'}
				variant="primary"
				class="transition-all ease-spring shadow-sm hover:shadow-md"
			>
				Go Home
			</Button>
		</div>

		<!-- Additional Help -->
		<div class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
			<p class="text-sm text-text-muted">
				If this problem persists, please{' '}
				<a
					href="https://github.com/anthropics/claude-code/issues"
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary hover:underline"
				>
					report an issue
				</a>
			</p>
		</div>
	</div>
</div>
