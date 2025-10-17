import type { Category } from '$lib/types';
import type { EnrichmentPlugin, EnrichmentResult, SearchSuggestion } from '../types';

/**
 * Stub plugin for YouTube
 * TODO: Implement with YouTube Data API
 */
export class YouTubePlugin implements EnrichmentPlugin {
	name = 'YouTube';
	supportedCategories: Category[] = ['youtube'];

	async search(query: string): Promise<SearchSuggestion[]> {
		// TODO: Implement YouTube Data API integration
		return [];
	}

	async enrich(id: string): Promise<EnrichmentResult> {
		// TODO: Implement YouTube video metadata enrichment
		return { success: false, error: 'Not implemented' };
	}
}

/**
 * Stub plugin for Music (Spotify/Apple Music)
 * TODO: Implement with Spotify API
 */
export class MusicPlugin implements EnrichmentPlugin {
	name = 'Music';
	supportedCategories: Category[] = ['artist', 'song', 'genre'];

	async search(query: string): Promise<SearchSuggestion[]> {
		// TODO: Implement Spotify/Apple Music API integration
		return [];
	}

	async enrich(id: string): Promise<EnrichmentResult> {
		// TODO: Implement music metadata enrichment
		return { success: false, error: 'Not implemented' };
	}
}

/**
 * Stub plugin for Books
 * TODO: Implement with Google Books API
 */
export class BooksPlugin implements EnrichmentPlugin {
	name = 'Books';
	supportedCategories: Category[] = ['book', 'graphic-novel'];

	async search(query: string): Promise<SearchSuggestion[]> {
		// TODO: Implement Google Books API integration
		return [];
	}

	async enrich(id: string): Promise<EnrichmentResult> {
		// TODO: Implement book metadata enrichment
		return { success: false, error: 'Not implemented' };
	}
}

/**
 * Stub plugin for Restaurants
 * TODO: Implement with Google Places API
 */
export class RestaurantsPlugin implements EnrichmentPlugin {
	name = 'Restaurants';
	supportedCategories: Category[] = ['restaurant'];

	async search(query: string): Promise<SearchSuggestion[]> {
		// TODO: Implement Google Places API integration
		return [];
	}

	async enrich(id: string): Promise<EnrichmentResult> {
		// TODO: Implement restaurant metadata enrichment
		return { success: false, error: 'Not implemented' };
	}
}

/**
 * Stub plugin for Podcasts
 * TODO: Implement with Podcast Index API or iTunes
 */
export class PodcastsPlugin implements EnrichmentPlugin {
	name = 'Podcasts';
	supportedCategories: Category[] = ['podcast'];

	async search(query: string): Promise<SearchSuggestion[]> {
		// TODO: Implement Podcast API integration
		return [];
	}

	async enrich(id: string): Promise<EnrichmentResult> {
		// TODO: Implement podcast metadata enrichment
		return { success: false, error: 'Not implemented' };
	}
}
