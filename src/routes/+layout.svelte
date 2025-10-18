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

<div class="container mx-auto max-w-xl p-4">
	<header class="flex justify-between items-center mb-8">
		<a href="/">
			<h1 class="text-2xl font-bold">Listo</h1>
		</a>
		{#if $page.data.user}
			<form action="/api/auth/logout" method="post">
				<Button type="submit">Sign Out</Button>
			</form>
		{/if}
	</header>

	<main>
		{@render children?.()}
	</main>
</div>
