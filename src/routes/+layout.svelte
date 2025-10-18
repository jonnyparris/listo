<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cormorant+Garamond:wght@600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="container mx-auto max-w-xl">
	{#if $page.data.user}
		<header class="flex justify-end items-center p-4">
			<form action="/api/auth/logout" method="post">
				<Button type="submit" size="sm" variant="ghost">Sign Out</Button>
			</form>
		</header>
	{/if}

	<main>
		{@render children?.()}
	</main>
</div>
