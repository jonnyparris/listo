import type { Category } from '$lib/types';
import { TMDBPlugin } from './plugins/tmdb';
import {
	YouTubePlugin,
	MusicPlugin,
	BooksPlugin,
	RestaurantsPlugin,
	PodcastsPlugin
} from './plugins/stubs';
import type { EnrichmentPlugin, EnrichmentResult, SearchSuggestion } from './types';

export class EnrichmentService {
	private plugins: Map<Category, EnrichmentPlugin> = new Map();

	constructor(apiKeys: { tmdb?: string } = {}) {
		// Register TMDB plugin if API key is available
		if (apiKeys.tmdb) {
			const tmdbPlugin = new TMDBPlugin(apiKeys.tmdb);
			for (const category of tmdbPlugin.supportedCategories) {
				this.plugins.set(category, tmdbPlugin);
			}
		}

		// Register stub plugins (will be replaced with real implementations)
		const stubPlugins = [
			new YouTubePlugin(),
			new MusicPlugin(),
			new BooksPlugin(),
			new RestaurantsPlugin(),
			new PodcastsPlugin()
		];

		for (const plugin of stubPlugins) {
			for (const category of plugin.supportedCategories) {
				this.plugins.set(category, plugin);
			}
		}
	}

	/**
	 * Search for suggestions in a specific category
	 */
	async search(query: string, category: Category): Promise<SearchSuggestion[]> {
		const plugin = this.plugins.get(category);
		if (!plugin) {
			return [];
		}

		return plugin.search(query, category);
	}

	/**
	 * Enrich a recommendation with metadata
	 */
	async enrich(id: string, category: Category): Promise<EnrichmentResult> {
		const plugin = this.plugins.get(category);
		if (!plugin) {
			return {
				success: false,
				error: `No enrichment plugin available for category: ${category}`
			};
		}

		return plugin.enrich(id, category);
	}

	/**
	 * Check if a category supports enrichment
	 */
	hasEnrichment(category: Category): boolean {
		return this.plugins.has(category);
	}
}

// Export for use in API routes (server-side)
export function createEnrichmentService(apiKeys: { tmdb?: string }): EnrichmentService {
	return new EnrichmentService(apiKeys);
}
