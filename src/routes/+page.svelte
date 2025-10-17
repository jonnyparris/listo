<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Input, Card } from '$lib/components/ui';
	import { dbOperations } from '$lib/db';
	import type { LocalRecommendation, Category } from '$lib/types';

	let recommendations = $state<LocalRecommendation[]>([]);
	let showAddForm = $state(false);
	let userId = $state(''); // Will be set from session

	// Form state
	let newTitle = $state('');
	let newCategory = $state<Category>('movie');
	let newDescription = $state('');

	const categories: Category[] = [
		'movie',
		'show',
		'youtube',
		'podcast',
		'artist',
		'song',
		'genre',
		'restaurant',
		'recipe',
		'cuisine',
		'activity',
		'video-game',
		'board-game',
		'book',
		'graphic-novel',
		'quote'
	];

	onMount(async () => {
		// Get user ID from cookie (set by server)
		userId = 'demo-user'; // TODO: Get from actual session
		await loadRecommendations();
	});

	async function loadRecommendations() {
		recommendations = await dbOperations.getAllRecommendations(userId);
	}

	async function addRecommendation() {
		if (!newTitle.trim()) return;

		const recommendation: LocalRecommendation = {
			id: crypto.randomUUID(),
			user_id: userId,
			category: newCategory,
			title: newTitle.trim(),
			description: newDescription.trim() || undefined,
			created_at: Math.floor(Date.now() / 1000),
			updated_at: Math.floor(Date.now() / 1000),
			synced: false
		};

		await dbOperations.addRecommendation(recommendation);
		await loadRecommendations();

		// Reset form
		newTitle = '';
		newDescription = '';
		showAddForm = false;
	}

	function formatCategory(cat: string): string {
		return cat
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}
</script>

<div class="min-h-screen bg-background-light dark:bg-background-dark">
	<div class="mx-auto max-w-4xl px-4 py-8">
		<!-- Header -->
		<header class="mb-12 text-center">
			<h1 class="font-serif text-5xl font-light text-text dark:text-white mb-2">Listo</h1>
			<p class="text-text-muted text-sm lowercase tracking-wide">intentional chill</p>
		</header>

		<!-- Add Button -->
		<div class="mb-8 flex justify-center">
			<Button onclick={() => (showAddForm = !showAddForm)} variant="primary" size="lg">
				{showAddForm ? 'Cancel' : '+ Add Recommendation'}
			</Button>
		</div>

		<!-- Add Form -->
		{#if showAddForm}
			<Card class="mb-8">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						addRecommendation();
					}}
				>
					<div class="space-y-4">
						<div>
							<label for="category" class="mb-2 block text-sm font-medium text-text dark:text-white">
								Category
							</label>
							<select
								id="category"
								bind:value={newCategory}
								class="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-gray-800 px-4 py-3 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
							>
								{#each categories as cat}
									<option value={cat}>{formatCategory(cat)}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="title" class="mb-2 block text-sm font-medium text-text dark:text-white">
								Title
							</label>
							<Input id="title" bind:value={newTitle} placeholder="Enter title..." />
						</div>

						<div>
							<label for="description" class="mb-2 block text-sm font-medium text-text dark:text-white">
								Notes (optional)
							</label>
							<textarea
								id="description"
								bind:value={newDescription}
								placeholder="Add some notes..."
								class="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-gray-800 px-4 py-3 text-text dark:text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
								rows="3"
							></textarea>
						</div>

						<div class="flex gap-3">
							<Button type="submit" variant="primary" class="flex-1">Save</Button>
							<Button type="button" variant="ghost" onclick={() => (showAddForm = false)}>
								Cancel
							</Button>
						</div>
					</div>
				</form>
			</Card>
		{/if}

		<!-- Recommendations List -->
		<div class="space-y-4">
			{#if recommendations.length === 0}
				<div class="text-center py-12">
					<p class="text-text-muted">No recommendations yet. Add your first one!</p>
				</div>
			{:else}
				{#each recommendations as rec (rec.id)}
					<Card class="hover:scale-[1.01] cursor-pointer">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<div class="mb-1 flex items-center gap-2">
									<span
										class="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-text"
									>
										{formatCategory(rec.category)}
									</span>
									{#if !rec.synced}
										<span
											class="rounded-full bg-secondary/20 px-2 py-1 text-xs text-text-muted"
											title="Not synced"
										>
											⏱
										</span>
									{/if}
								</div>
								<h3 class="mb-1 text-lg font-semibold text-text dark:text-white">
									{rec.title}
								</h3>
								{#if rec.description}
									<p class="text-sm text-text-muted">{rec.description}</p>
								{/if}
							</div>
						</div>
					</Card>
				{/each}
			{/if}
		</div>
	</div>
</div>
