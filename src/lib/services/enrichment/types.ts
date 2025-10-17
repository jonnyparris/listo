import type { Category, RecommendationMetadata } from '$lib/types';

export interface EnrichmentResult {
	success: boolean;
	metadata?: RecommendationMetadata;
	error?: string;
}

export interface SearchSuggestion {
	id: string;
	title: string;
	subtitle?: string;
	thumbnail?: string;
	year?: number;
}

export interface EnrichmentPlugin {
	name: string;
	supportedCategories: Category[];

	/**
	 * Search for suggestions based on user input
	 */
	search(query: string, category: Category): Promise<SearchSuggestion[]>;

	/**
	 * Enrich a recommendation with metadata
	 */
	enrich(id: string, category: Category): Promise<EnrichmentResult>;
}
