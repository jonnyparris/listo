<script lang="ts">
	import { Input } from './ui';
	import type { Category } from '$lib/types';

	interface Props {
		value?: string;
		placeholder?: string;
		onSearch?: (query: string) => void;
		selectedCategory?: Category | 'all';
		onCategoryChange?: (category: Category | 'all') => void;
		showCategoryFilter?: boolean;
		autofocus?: boolean;
		onBlur?: () => void;
	}

	let {
		value = $bindable(''),
		placeholder = 'Search recommendations...',
		onSearch,
		selectedCategory = $bindable<Category | 'all'>('all'),
		onCategoryChange,
		showCategoryFilter = true,
		autofocus = false,
		onBlur
	}: Props = $props();

	const categories: (Category | 'all')[] = [
		'all',
		'series',
		'movie',
		'youtube',
		'podcast',
		'artist',
		'song',
		'genre',
		'restaurant',
		'recipe',
		'activity',
		'video-game',
		'board-game',
		'book',
		'graphic-novel',
		'quote'
	];

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		onSearch?.(value);
	}

	function handleBlur(e: FocusEvent) {
		onBlur?.();
	}

	function handleCategoryChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedCategory = target.value as Category | 'all';
		onCategoryChange?.(selectedCategory);
	}

	function formatCategory(cat: string): string {
		if (cat === 'all') return 'All Categories';
		return cat
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}

	function clearFilters() {
		value = '';
		selectedCategory = 'all';
		onSearch?.('');
		onCategoryChange?.('all');
	}

	const hasActiveFilters = $derived(value.trim() !== '' || selectedCategory !== 'all');
</script>

<div class="flex gap-3">
	<div class="flex-1">
		<Input
			{value}
			{placeholder}
			{autofocus}
			oninput={handleInput}
			onblur={handleBlur}
			class="w-full"
		/>
	</div>
	{#if hasActiveFilters}
		<button
			type="button"
			onclick={clearFilters}
			class="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-gray-800 text-text dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
			title="Clear filters"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
			<span class="hidden sm:inline">Clear</span>
		</button>
	{/if}
	{#if showCategoryFilter}
		<div class="relative">
			<select
				value={selectedCategory}
				onchange={handleCategoryChange}
				class="appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-gray-800 px-4 py-3 pr-10 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[180px]"
				style="-webkit-appearance: none; -moz-appearance: none;"
			>
				{#each categories as cat (cat)}
					<option value={cat}>{formatCategory(cat)}</option>
				{/each}
			</select>
			<!-- Custom dropdown arrow -->
			<div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="6 9 12 15 18 9"></polyline>
				</svg>
			</div>
		</div>
	{/if}
</div>
