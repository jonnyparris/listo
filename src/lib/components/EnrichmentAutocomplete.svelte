<script lang="ts">
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
	}

	let {
		value = $bindable(''),
		category,
		onSelect,
		placeholder = 'Search...',
		autofocus = false,
		onkeydown
	}: Props = $props();

	let suggestions = $state<SearchSuggestion[]>([]);
	let showSuggestions = $state(false);
	let loading = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let selectedIndex = $state(-1);

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

		debounceTimer = setTimeout(async () => {
			await searchEnrichment(value);
		}, 300);
	}

	async function searchEnrichment(query: string) {
		loading = true;
		try {
			const response = await fetch(
				`/api/enrichment/search?query=${encodeURIComponent(query)}&category=${category}`
			);
			if (response.ok) {
				suggestions = await response.json();
				showSuggestions = true;
				selectedIndex = -1;
			}
		} catch (error) {
			console.error('Search error:', error);
		} finally {
			loading = false;
		}
	}

	async function selectSuggestion(suggestion: SearchSuggestion) {
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
		setTimeout(() => {
			showSuggestions = false;
		}, 150);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
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

	// Refresh suggestions when category changes
	$effect(() => {
		if (value.length >= 2) {
			searchEnrichment(value);
			showSuggestions = true;
		} else {
			suggestions = [];
			showSuggestions = false;
		}
	});
</script>

<div class="relative enrichment-autocomplete-container">
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
						<div class="font-medium text-text dark:text-white truncate">
							{suggestion.title}
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
