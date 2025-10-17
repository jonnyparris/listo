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

	// Card navigation state
	let selectedCardIndex = $state(-1);

	// Keyboard shortcuts help
	let showKeyboardHelp = $state(false);

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

		// Global keyboard shortcuts
		const handleKeydown = (e: KeyboardEvent) => {
			// Don't trigger shortcuts when typing in input fields or textareas
			const target = e.target as HTMLElement;
			const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

			// Escape - close forms/modals
			if (e.key === 'Escape') {
				if (showKeyboardHelp) {
					showKeyboardHelp = false;
				} else if (showAddForm) {
					resetForm();
				} else if (completingId) {
					completingId = null;
				}
				return;
			}

			// ? - Show keyboard shortcuts help
			if (e.key === '?' && !isTyping) {
				e.preventDefault();
				showKeyboardHelp = !showKeyboardHelp;
			}

			// Don't trigger other shortcuts when typing
			if (isTyping && e.key !== 'Escape') return;

			// N - New recommendation (when not in completed view)
			if (e.key === 'n' && !showCompleted && !showAddForm) {
				e.preventDefault();
				showAddForm = true;
			}

			// / - Focus search
			if (e.key === '/') {
				e.preventDefault();
				const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
				if (searchInput) searchInput.focus();
			}

			// T - Toggle between active/completed
			if (e.key === 't') {
				e.preventDefault();
				showCompleted = !showCompleted;
			}

			// Cmd/Ctrl + S - Save form (when form is open)
			if ((e.metaKey || e.ctrlKey) && e.key === 's' && showAddForm) {
				e.preventDefault();
				saveRecommendation();
			}

			// Arrow keys - Navigate cards
			const currentList = showCompleted ? filteredCompletedRecs : filteredRecommendations;
			if (e.key === 'ArrowDown' && !showAddForm && !completingId) {
				e.preventDefault();
				selectedCardIndex = Math.min(selectedCardIndex + 1, currentList.length - 1);
				scrollToSelectedCard();
			}
			if (e.key === 'ArrowUp' && !showAddForm && !completingId) {
				e.preventDefault();
				selectedCardIndex = Math.max(selectedCardIndex - 1, -1);
				scrollToSelectedCard();
			}

			// Enter - Perform action on selected card
			if (e.key === 'Enter' && selectedCardIndex >= 0 && !showAddForm && !completingId) {
				e.preventDefault();
				const selectedRec = currentList[selectedCardIndex];
				if (selectedRec) {
					if (showCompleted) {
						uncompleteRecommendation(selectedRec.id);
					} else {
						startComplete(selectedRec);
					}
				}
			}

			// E - Edit selected card
			if (e.key === 'e' && selectedCardIndex >= 0 && !showAddForm && !completingId && !showCompleted) {
				e.preventDefault();
				const selectedRec = filteredRecommendations[selectedCardIndex];
				if (selectedRec) startEdit(selectedRec);
			}

			// D - Delete selected card
			if (e.key === 'd' && selectedCardIndex >= 0 && !showAddForm && !completingId) {
				e.preventDefault();
				const selectedRec = currentList[selectedCardIndex];
				if (selectedRec) deleteRecommendation(selectedRec.id);
			}
		};

		function scrollToSelectedCard() {
			setTimeout(() => {
				const selectedCard = document.querySelector('.card-selected');
				if (selectedCard) {
					selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}, 50);
		}

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
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
			const genresText = rec.metadata?.genres?.join(' ').toLowerCase() || '';
			const matchesSearch =
				!query ||
				rec.title.toLowerCase().includes(query) ||
				rec.description?.toLowerCase().includes(query) ||
				rec.tags?.toLowerCase().includes(query) ||
				genresText.includes(query);
			return matchesCategory && matchesSearch;
		});

		// Filter completed recommendations
		filteredCompletedRecs = completedRecs.filter((rec) => {
			const matchesCategory = selectedCategory === 'all' || rec.category === selectedCategory;
			const genresText = rec.metadata?.genres?.join(' ').toLowerCase() || '';
			const matchesSearch =
				!query ||
				rec.title.toLowerCase().includes(query) ||
				rec.description?.toLowerCase().includes(query) ||
				rec.review?.toLowerCase().includes(query) ||
				rec.tags?.toLowerCase().includes(query) ||
				genresText.includes(query);
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

		// Convert metadata to plain object to avoid Proxy serialization issues
		const plainMetadata = formMetadata ? JSON.parse(JSON.stringify(formMetadata)) : undefined;

		if (editingId) {
			// Update existing
			await dbOperations.updateRecommendation(editingId, {
				title: formTitle.trim(),
				category: formCategory,
				description: formDescription.trim() || undefined,
				metadata: plainMetadata,
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
				metadata: plainMetadata,
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
		<!-- Theme Toggle and Help (top right) -->
		<div class="flex justify-end gap-2 mb-4">
			<button
				onclick={() => (showKeyboardHelp = true)}
				class="p-2 rounded-lg text-text-muted hover:text-text dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				title="Keyboard shortcuts (?)"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
					<line x1="12" y1="17" x2="12.01" y2="17"></line>
				</svg>
			</button>
			<ThemeToggle />
		</div>

		<!-- Header -->
		<header class="mb-12 text-center flex justify-center">
			<img
				src="/Listo_Logo_IntentionalChill.svg"
				alt="Listo - intentional chill"
				class="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[400px] h-auto dark:brightness-90"
			/>
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

		<!-- Floating Action Button -->
		{#if !showCompleted && !showAddForm}
			<button
				onclick={() => (showAddForm = true)}
				class="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-secondary shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center text-white text-2xl z-50"
				aria-label="Add recommendation"
			>
				+
			</button>
		{/if}

		<!-- Add/Edit Form Modal -->
		{#if showAddForm && !showCompleted}
			<div
				class="fixed inset-0 bg-background-light dark:bg-background-dark z-50 overflow-y-auto"
			>
				<div class="min-h-screen flex flex-col">
					<!-- Header -->
					<div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6">
						<div class="flex items-center justify-between max-w-2xl mx-auto">
							<h2 class="text-xl sm:text-2xl font-semibold text-text dark:text-white">
								{editingId ? 'Edit Recommendation' : 'Add Recommendation'}
							</h2>
							<button
								onclick={() => resetForm()}
								class="p-2 text-text-muted hover:text-text dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
								aria-label="Close"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</button>
						</div>
					</div>

					<!-- Form Content -->
					<div class="flex-1 px-4 py-6 sm:px-6">
						<div class="max-w-2xl mx-auto">
							<form
								onsubmit={(e) => {
									e.preventDefault();
									saveRecommendation();
								}}
							>
								<div class="space-y-6">
									<div>
										<label for="category" class="mb-2 block text-sm font-medium text-text dark:text-white">
											Category
										</label>
										<select
											id="category"
											bind:value={formCategory}
											class="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-gray-800 px-4 py-3 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-base"
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
											class="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-gray-800 px-4 py-3 text-text dark:text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none text-base"
											rows="6"
											onkeydown={(e) => {
												if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
													e.preventDefault();
													saveRecommendation();
												}
											}}
										></textarea>
									</div>
								</div>
							</form>
						</div>
					</div>

					<!-- Footer with Save Button -->
					<div class="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6 safe-area-inset-bottom">
						<div class="max-w-2xl mx-auto">
							<Button
								onclick={() => saveRecommendation()}
								variant="primary"
								class="w-full text-base py-3"
							>
								{editingId ? 'Update' : 'Save'} Recommendation
							</Button>
						</div>
					</div>
				</div>
			</div>
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
					{#each filteredRecommendations as rec, index (rec.id)}
						<Card class="hover:scale-[1.01] transition-transform {selectedCardIndex === index ? 'card-selected ring-2 ring-primary' : ''}">
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
											onkeydown={(e) => {
												if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
													e.preventDefault();
													saveComplete();
												}
											}}
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
					{#each filteredCompletedRecs as rec, index (rec.id)}
						<Card class="{selectedCardIndex === index ? 'card-selected ring-2 ring-primary' : ''}">
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

		<!-- Keyboard Shortcuts Help -->
		{#if showKeyboardHelp}
			<div
				class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
				onclick={() => (showKeyboardHelp = false)}
			>
				<div
					class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full p-8 max-h-[80vh] overflow-y-auto"
					onclick={(e) => e.stopPropagation()}
				>
					<div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
						<h2 class="text-2xl font-semibold text-text dark:text-white">Keyboard Shortcuts</h2>
						<button
							onclick={() => (showKeyboardHelp = false)}
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
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">?</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Close dialog/form</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">Esc</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Focus search</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">/</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Toggle active/completed</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">T</kbd>
								</div>
							</div>
						</div>

						<div>
							<h3 class="text-lg font-semibold text-text dark:text-white mb-3">Recommendations</h3>
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-text-muted">New recommendation</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">N</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Navigate down</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">↓</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Navigate up</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">↑</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Complete/uncomplete selected</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">Enter</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Edit selected</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">E</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Delete selected</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">D</kbd>
								</div>
							</div>
						</div>

						<div>
							<h3 class="text-lg font-semibold text-text dark:text-white mb-3">Forms</h3>
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Save form</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">⌘S / Ctrl+S</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Save from textarea</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">⌘Enter / Ctrl+Enter</kbd>
								</div>
							</div>
						</div>
					</div>

					<div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
						<p class="text-sm text-text-muted">
							Press <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">?</kbd> anytime to toggle this help
						</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
