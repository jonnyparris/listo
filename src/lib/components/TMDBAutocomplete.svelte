<script lang="ts">
	import { untrack } from 'svelte';
	import { Input } from './ui';
	import type { Category } from '$lib/types';
	import type { SearchSuggestion } from '$lib/services/enrichment/types';

	interface Props {
		value?: string;
		category: Category;
		onSelect?: (suggestion: SearchSuggestion) => void;
		placeholder?: string;
		autofocus?: boolean;
		onkeydown?: (event: KeyboardEvent) => void;
		isDuplicate?: (title: string, category: Category) => boolean;
	}

	let {
		value = $bindable(''),
		category,
		onSelect,
		placeholder = 'Search for a movie or series...',
		autofocus = false,
		onkeydown,
		isDuplicate
	}: Props = $props();

	let suggestions = $state<SearchSuggestion[]>([]);
	let showSuggestions = $state(false);
	let loading = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let selectedIndex = $state(-1);
	let searchSeq = 0;
	let containerEl: HTMLElement | undefined;
	let lastSelectionAt = 0;

	function inputHasFocus(): boolean {
		// activeElement-based (not :focus) — :focus can fail to match while the
		// window is unfocused or mid-tap, which would wrongly suppress the list
		const input = containerEl?.querySelector('input');
		return !!input && (document.activeElement === input || containerEl!.contains(document.activeElement));
	}

	async function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;

		clearTimeout(debounceTimer);

		// Close suggestions and clear if input is too short
		if (value.length < 2) {
			suggestions = [];
			showSuggestions = false;
			selectedIndex = -1;
			return;
		}

		// Only search for movie/series categories
		if (!['movie', 'series'].includes(category)) {
			return;
		}

		debounceTimer = setTimeout(async () => {
			await searchTMDB(value);
		}, 300);
	}

	async function searchTMDB(query: string) {
		if (!['movie', 'series'].includes(category)) {
			return;
		}

		// Sequence responses: stale results from older queries are dropped so a
		// fast typist never sees suggestions for text they already deleted
		const seq = ++searchSeq;
		loading = true;
		try {
			const response = await fetch(
				`/api/enrichment/search?query=${encodeURIComponent(query)}&category=${category}`
			);
			if (seq !== searchSeq) return;
			if (response.ok) {
				suggestions = await response.json();
				// Re-open the dropdown only when the input still has focus — a slow
				// response must not pop the list open after the user already picked
				// a suggestion or moved on
				showSuggestions = inputHasFocus();
				selectedIndex = -1;
			}
		} catch (error) {
			console.error('TMDB search error:', error);
		} finally {
			if (seq === searchSeq) loading = false;
		}
	}

	async function selectSuggestion(suggestion: SearchSuggestion) {
		// Authoritatively close: kill pending debounced searches and in-flight
		// responses so nothing can re-open the dropdown right after selection
		lastSelectionAt = Date.now();
		searchSeq++;
		clearTimeout(debounceTimer);
		value = suggestion.title;
		showSuggestions = false;
		suggestions = [];
		selectedIndex = -1;

		// Fetch full metadata for the selected item
		try {
			const response = await fetch(
				`/api/enrichment/enrich?id=${suggestion.id}&category=${category}`
			);
			if (response.ok) {
				const enrichedMetadata = await response.json();
				// Merge enriched metadata with suggestion
				const enrichedSuggestion = {
					...suggestion,
					metadata: enrichedMetadata
				};
				onSelect?.(enrichedSuggestion);
			} else {
				// Fallback to basic suggestion
				onSelect?.(suggestion);
			}
		} catch (error) {
			console.error('Failed to fetch enrichment data:', error);
			onSelect?.(suggestion);
		}
	}

	function handleBlur() {
		// Use a shorter timeout to allow mousedown to fire first
		setTimeout(() => {
			showSuggestions = false;
		}, 200);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && showSuggestions) {
			// Close only the dropdown and swallow the event — the window-level
			// handler would otherwise close the whole add form and destroy input
			e.preventDefault();
			e.stopPropagation();
			showSuggestions = false;
			selectedIndex = -1;
			return;
		}

		if (!showSuggestions || suggestions.length === 0) {
			onkeydown?.(e);
			return;
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, -1);
		} else if (e.key === 'Enter' && selectedIndex >= 0) {
			e.preventDefault();
			selectSuggestion(suggestions[selectedIndex]);
		} else {
			onkeydown?.(e);
		}
	}

	// Refresh suggestions when the CATEGORY changes (not on every keystroke —
		// that path goes through the debounced handleInput). Reading `category`
		// as the only tracked dependency keeps this effect off the typing path.
	let prevCategory: Category | null = null;
	$effect(() => {
		const cat = category;
		untrack(() => {
			if (prevCategory === null) {
				prevCategory = cat; // first run: just record the initial category
				return;
			}
			if (cat === prevCategory) return;
			prevCategory = cat;
			clearTimeout(debounceTimer);
			searchSeq++; // any in-flight search is now stale
			if (Date.now() - lastSelectionAt < 250) {
				// The category changed as a side-effect of picking a suggestion —
				// don't immediately re-search and pop the dropdown back open
				suggestions = [];
				showSuggestions = false;
				selectedIndex = -1;
				return;
			}
			if (value.length >= 2 && ['movie', 'series'].includes(cat)) {
				searchTMDB(value);
			} else {
				searchSeq++; // invalidate any in-flight search
				suggestions = [];
				showSuggestions = false;
				selectedIndex = -1;
			}
		});
	});
</script>

<div class="relative tmdb-autocomplete-container" bind:this={containerEl}>
	<Input
		{value}
		{placeholder}
		{autofocus}
		oninput={handleInput}
		onblur={handleBlur}
		onfocus={() => suggestions.length > 0 && (showSuggestions = true)}
		onkeydown={handleKeydown}
	/>

	{#if loading}
		<div class="absolute right-3 top-3 text-text-muted" title="Searching...">
			<div class="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
		</div>
	{/if}

	{#if showSuggestions && !loading && suggestions.length === 0 && value.length >= 2}
		<div class="absolute z-10 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-card p-4 text-center">
			<p class="text-sm text-text-muted">No results found for "{value}"</p>
		</div>
	{/if}

	{#if showSuggestions && suggestions.length > 0}
		<div
			class="absolute z-10 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-card max-h-64 overflow-y-auto"
		>
			{#each suggestions as suggestion, index (suggestion.id)}
				<button
					type="button"
					onmousedown={(e) => {
						e.preventDefault();
						selectSuggestion(suggestion);
					}}
					onmouseenter={() => selectedIndex = index}
					class="flex w-full items-start gap-3 p-3 text-left transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 {selectedIndex === index ? 'bg-primary/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}"
				>
					{#if suggestion.thumbnail}
						<img
							src={suggestion.thumbnail}
							alt={suggestion.title}
							class="h-16 w-12 rounded object-cover flex-shrink-0"
						/>
					{/if}
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<div class="font-medium text-text dark:text-white truncate">
								{suggestion.title}
							</div>
							{#if isDuplicate?.(suggestion.title, category)}
								<span class="flex-shrink-0 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full">
									Already saved
								</span>
							{/if}
						</div>
						{#if suggestion.subtitle || suggestion.year}
							<div class="text-sm text-text-muted">
								{#if suggestion.year}{suggestion.year}{/if}
								{#if suggestion.subtitle && suggestion.year} · {/if}
								{#if suggestion.subtitle}{suggestion.subtitle}{/if}
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>
