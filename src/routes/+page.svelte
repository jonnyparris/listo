<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Input, Card } from '$lib/components/ui';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import TMDBAutocomplete from '$lib/components/TMDBAutocomplete.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { dbOperations } from '$lib/db';
	import type { LocalRecommendation, Category } from '$lib/types';
	import type { SearchSuggestion } from '$lib/services/enrichment/types';

	let recommendations = $state<LocalRecommendation[]>([]);
	let completedRecs = $state<LocalRecommendation[]>([]);
	let filteredRecommendations = $state<LocalRecommendation[]>([]);
	let filteredCompletedRecs = $state<LocalRecommendation[]>([]);
	let showAddForm = $state(false);
	let showCompleted = $state(false);
	let editingId = $state<string | null>(null);
	let completingId = $state<string | null>(null);
	let userId = $state('');

	// Search state
	let searchQuery = $state('');
	let selectedCategory = $state<Category | 'all'>('all');

	// Form state
	let formTitle = $state('');
	let formCategory = $state<Category>('movie');
	let formDescription = $state('');
	let formMetadata = $state<any>(undefined);

	// Review form state
	let reviewText = $state('');
	let reviewRating = $state(0);

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
		userId = 'demo-user';
		await loadRecommendations();
	});

	async function loadRecommendations() {
		recommendations = await dbOperations.getAllRecommendations(userId);
		completedRecs = await dbOperations.getCompletedRecommendations(userId);
		applyFilters();
	}

	function applyFilters() {
		const query = searchQuery.toLowerCase().trim();

		// Filter active recommendations
		filteredRecommendations = recommendations.filter((rec) => {
			const matchesCategory = selectedCategory === 'all' || rec.category === selectedCategory;
			const matchesSearch =
				!query ||
				rec.title.toLowerCase().includes(query) ||
				rec.description?.toLowerCase().includes(query) ||
				rec.tags?.toLowerCase().includes(query);
			return matchesCategory && matchesSearch;
		});

		// Filter completed recommendations
		filteredCompletedRecs = completedRecs.filter((rec) => {
			const matchesCategory = selectedCategory === 'all' || rec.category === selectedCategory;
			const matchesSearch =
				!query ||
				rec.title.toLowerCase().includes(query) ||
				rec.description?.toLowerCase().includes(query) ||
				rec.review?.toLowerCase().includes(query) ||
				rec.tags?.toLowerCase().includes(query);
			return matchesCategory && matchesSearch;
		});
	}

	function handleSearch(query: string) {
		searchQuery = query;
		applyFilters();
	}

	function handleCategoryChange(category: Category | 'all') {
		selectedCategory = category;
		applyFilters();
	}

	async function saveRecommendation() {
		if (!formTitle.trim()) return;

		if (editingId) {
			// Update existing
			await dbOperations.updateRecommendation(editingId, {
				title: formTitle.trim(),
				category: formCategory,
				description: formDescription.trim() || undefined,
				metadata: formMetadata,
				synced: false
			});
		} else {
			// Create new
			const recommendation: LocalRecommendation = {
				id: crypto.randomUUID(),
				user_id: userId,
				category: formCategory,
				title: formTitle.trim(),
				description: formDescription.trim() || undefined,
				metadata: formMetadata,
				created_at: Math.floor(Date.now() / 1000),
				updated_at: Math.floor(Date.now() / 1000),
				synced: false
			};
			await dbOperations.addRecommendation(recommendation);
		}

		await loadRecommendations();
		resetForm();
	}

	function startEdit(rec: LocalRecommendation) {
		editingId = rec.id;
		formTitle = rec.title;
		formCategory = rec.category;
		formDescription = rec.description || '';
		showAddForm = true;
	}

	async function deleteRecommendation(id: string) {
		if (confirm('Are you sure you want to delete this recommendation?')) {
			await dbOperations.deleteRecommendation(id);
			await loadRecommendations();
		}
	}

	function startComplete(rec: LocalRecommendation) {
		completingId = rec.id;
		reviewText = '';
		reviewRating = 0;
	}

	async function saveComplete() {
		if (!completingId) return;

		await dbOperations.updateRecommendation(completingId, {
			completed_at: Math.floor(Date.now() / 1000),
			review: reviewText.trim() || undefined,
			rating: reviewRating || undefined,
			synced: false
		});

		await loadRecommendations();
		completingId = null;
		reviewText = '';
		reviewRating = 0;
	}

	async function uncompleteRecommendation(id: string) {
		await dbOperations.updateRecommendation(id, {
			completed_at: undefined,
			review: undefined,
			rating: undefined,
			synced: false
		});
		await loadRecommendations();
	}

	function resetForm() {
		formTitle = '';
		formDescription = '';
		formCategory = 'movie';
		formMetadata = undefined;
		showAddForm = false;
		editingId = null;
	}

	function formatCategory(cat: string): string {
		return cat
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function handleTMDBSelect(suggestion: any) {
		formTitle = suggestion.title;
		formMetadata = suggestion.metadata;

		// If we have overview, auto-fill description
		if (suggestion.metadata?.overview && !formDescription) {
			formDescription = suggestion.metadata.overview;
		}
	}
</script>

<div class="min-h-screen bg-background-light dark:bg-background-dark">
	<div class="mx-auto max-w-4xl px-4 py-8">
		<!-- Theme Toggle (top right) -->
		<div class="flex justify-end mb-4">
			<ThemeToggle />
		</div>

		<!-- Header -->
		<header class="mb-12 text-center">
			<h1 class="font-serif text-5xl font-semibold tracking-wordmark text-text dark:text-white mb-2">
				Listo
			</h1>
			<p class="text-text-muted lowercase" style="font-size: 0.9rem">intentional chill</p>
		</header>

		<!-- View Toggle -->
		<div class="mb-8 flex justify-center gap-2">
			<Button
				onclick={() => (showCompleted = false)}
				variant={!showCompleted ? 'primary' : 'ghost'}
				size="md"
			>
				Active ({filteredRecommendations.length})
			</Button>
			<Button
				onclick={() => (showCompleted = true)}
				variant={showCompleted ? 'primary' : 'ghost'}
				size="md"
			>
				Completed ({filteredCompletedRecs.length})
			</Button>
		</div>

		<!-- Search and Filter -->
		<div class="mb-8">
			<SearchBar
				bind:value={searchQuery}
				bind:selectedCategory={selectedCategory}
				onSearch={handleSearch}
				onCategoryChange={handleCategoryChange}
				placeholder={showCompleted ? 'Search completed items...' : 'Search recommendations...'}
			/>
		</div>

		<!-- Add Button (only show on active view) -->
		{#if !showCompleted}
			<div class="mb-8 flex justify-center">
				<Button onclick={() => (showAddForm = !showAddForm)} variant="secondary" size="lg">
					{showAddForm ? 'Cancel' : editingId ? 'Edit Recommendation' : '+ Add Recommendation'}
				</Button>
			</div>
		{/if}

		<!-- Add/Edit Form -->
		{#if showAddForm && !showCompleted}
			<Card class="mb-8">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						saveRecommendation();
					}}
				>
					<div class="space-y-4">
						<div>
							<label for="category" class="mb-2 block text-sm font-medium text-text dark:text-white">
								Category
							</label>
							<select
								id="category"
								bind:value={formCategory}
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
							{#if formCategory === 'movie' || formCategory === 'show'}
								<TMDBAutocomplete
									bind:value={formTitle}
									category={formCategory}
									onSelect={handleTMDBSelect}
									placeholder={`Search for a ${formCategory}...`}
								/>
							{:else}
								<Input id="title" bind:value={formTitle} placeholder="Enter title..." />
							{/if}
						</div>

						<div>
							<label
								for="description"
								class="mb-2 block text-sm font-medium text-text dark:text-white"
							>
								Notes (optional)
							</label>
							<textarea
								id="description"
								bind:value={formDescription}
								placeholder="Add some notes..."
								class="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-gray-800 px-4 py-3 text-text dark:text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
								rows="3"
							></textarea>
						</div>

						<div class="flex gap-3">
							<Button type="submit" variant="primary" class="flex-1">
								{editingId ? 'Update' : 'Save'}
							</Button>
							<Button type="button" variant="ghost" onclick={() => resetForm()}>Cancel</Button>
						</div>
					</div>
				</form>
			</Card>
		{/if}

		<!-- Active Recommendations -->
		{#if !showCompleted}
			<div class="space-y-4">
				{#if filteredRecommendations.length === 0}
					<div class="py-12 text-center">
						<p class="text-text-muted">
							{recommendations.length === 0
								? 'No recommendations yet. Add your first one!'
								: 'No recommendations match your search.'}
						</p>
					</div>
				{:else}
					{#each filteredRecommendations as rec (rec.id)}
						<Card class="hover:scale-[1.01] transition-transform">
							{#if completingId === rec.id}
								<!-- Complete Form -->
								<div class="space-y-4">
									<div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
										<h3 class="text-lg font-semibold text-text dark:text-white">
											Mark as Completed
										</h3>
										<button onclick={() => (completingId = null)} class="text-text-muted hover:text-text">
											✕
										</button>
									</div>

									<div>
										<p class="mb-2 text-sm font-medium text-text dark:text-white">
											{rec.title}
										</p>
										<p class="mb-4 text-xs text-text-muted">{formatCategory(rec.category)}</p>

										<div class="mb-2 text-sm font-medium text-text dark:text-white">
											Rating (optional)
										</div>
										<div class="mb-4 flex gap-2">
											{#each [1, 2, 3, 4, 5] as star}
												<button
													type="button"
													onclick={() => (reviewRating = star)}
													class="text-2xl transition-all hover:scale-110"
													class:text-secondary={reviewRating >= star}
													class:text-gray-300={reviewRating < star}
												>
													★
												</button>
											{/each}
										</div>

										<label for="review" class="mb-2 block text-sm font-medium text-text dark:text-white">
											Review (optional)
										</label>
										<textarea
											id="review"
											bind:value={reviewText}
											placeholder="What did you think?"
											class="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-gray-800 px-4 py-3 text-text dark:text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
											rows="3"
										></textarea>
									</div>

									<div class="flex gap-3">
										<Button onclick={saveComplete} variant="primary" class="flex-1">
											Complete
										</Button>
										<Button variant="ghost" onclick={() => (completingId = null)}>Cancel</Button>
									</div>
								</div>
							{:else}
								<!-- Normal View -->
								<div class="flex items-start gap-4">
									{#if rec.metadata?.poster_url}
										<img
											src={rec.metadata.poster_url}
											alt={rec.title}
											class="h-32 w-24 rounded object-cover flex-shrink-0"
										/>
									{/if}
									<div class="flex-1 min-w-0">
										<div class="mb-1 flex items-center gap-2 flex-wrap">
											<span class="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-text">
												{formatCategory(rec.category)}
											</span>
											{#if rec.metadata?.year}
												<span class="text-xs text-text-muted">
													{rec.metadata.year}
												</span>
											{/if}
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
										{#if rec.metadata?.genres && rec.metadata.genres.length > 0}
											<div class="mb-2 flex gap-1 flex-wrap">
												{#each rec.metadata.genres.slice(0, 3) as genre}
													<span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
														{genre}
													</span>
												{/each}
											</div>
										{/if}
										{#if rec.description}
											<p class="text-sm text-text-muted line-clamp-3">{rec.description}</p>
										{/if}
									</div>

									<div class="flex gap-2 flex-shrink-0">
										<button
											onclick={() => startComplete(rec)}
											class="rounded-lg px-3 py-1 text-sm text-primary hover:bg-primary/10 transition-colors"
											title="Mark as completed"
										>
											✓
										</button>
										<button
											onclick={() => startEdit(rec)}
											class="rounded-lg px-3 py-1 text-sm text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
											title="Edit"
										>
											✎
										</button>
										<button
											onclick={() => deleteRecommendation(rec.id)}
											class="rounded-lg px-3 py-1 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
											title="Delete"
										>
											🗑
										</button>
									</div>
								</div>
							{/if}
						</Card>
					{/each}
				{/if}
			</div>
		{:else}
			<!-- Completed Recommendations -->
			<div class="space-y-4">
				{#if filteredCompletedRecs.length === 0}
					<div class="py-12 text-center">
						<p class="text-text-muted">
							{completedRecs.length === 0
								? 'No completed recommendations yet.'
								: 'No completed recommendations match your search.'}
						</p>
					</div>
				{:else}
					{#each filteredCompletedRecs as rec (rec.id)}
						<Card>
							<div class="flex items-start gap-4">
								{#if rec.metadata?.poster_url}
									<img
										src={rec.metadata.poster_url}
										alt={rec.title}
										class="h-32 w-24 rounded object-cover flex-shrink-0"
									/>
								{/if}
								<div class="flex-1 min-w-0">
									<div class="mb-1 flex items-center gap-2 flex-wrap">
										<span class="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-text">
											{formatCategory(rec.category)}
										</span>
										{#if rec.metadata?.year}
											<span class="text-xs text-text-muted">
												{rec.metadata.year}
											</span>
										{/if}
										{#if rec.completed_at}
											<span class="text-xs text-text-muted">
												· Completed {formatDate(rec.completed_at)}
											</span>
										{/if}
									</div>
									<h3 class="mb-1 text-lg font-semibold text-text dark:text-white">
										{rec.title}
									</h3>
									{#if rec.rating}
										<div class="mb-2 flex gap-1 text-secondary">
											{#each Array(rec.rating) as _}
												<span>★</span>
											{/each}
										</div>
									{/if}
									{#if rec.metadata?.genres && rec.metadata.genres.length > 0}
										<div class="mb-2 flex gap-1 flex-wrap">
											{#each rec.metadata.genres.slice(0, 3) as genre}
												<span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
													{genre}
												</span>
											{/each}
										</div>
									{/if}
									{#if rec.review}
										<p class="text-sm italic text-text-muted mb-2">"{rec.review}"</p>
									{/if}
									{#if rec.description}
										<p class="text-sm text-text-muted line-clamp-3">{rec.description}</p>
									{/if}
								</div>

								<div class="flex gap-2 flex-shrink-0">
									<button
										onclick={() => uncompleteRecommendation(rec.id)}
										class="rounded-lg px-3 py-1 text-sm text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
										title="Move back to active"
									>
										↶
									</button>
									<button
										onclick={() => deleteRecommendation(rec.id)}
										class="rounded-lg px-3 py-1 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
										title="Delete"
									>
										🗑
									</button>
								</div>
							</div>
						</Card>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>
