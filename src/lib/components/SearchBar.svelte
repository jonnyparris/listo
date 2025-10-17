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
	}

	let {
		value = $bindable(''),
		placeholder = 'Search recommendations...',
		onSearch,
		selectedCategory = $bindable<Category | 'all'>('all'),
		onCategoryChange,
		showCategoryFilter = true
	}: Props = $props();

	const categories: (Category | 'all')[] = [
		'all',
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

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		onSearch?.(value);
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
</script>

<div class="flex gap-3">
	<div class="flex-1">
		<Input
			{value}
			{placeholder}
			oninput={handleInput}
			class="w-full"
		/>
	</div>
	{#if showCategoryFilter}
		<select
			value={selectedCategory}
			onchange={handleCategoryChange}
			class="rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-gray-800 px-4 py-3 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
		>
			{#each categories as cat}
				<option value={cat}>{formatCategory(cat)}</option>
			{/each}
		</select>
	{/if}
</div>
