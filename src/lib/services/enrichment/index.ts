import type { Category } from '$lib/types';
import { TMDBPlugin } from './plugins/tmdb';
import { BooksPlugin } from './plugins/books';
import { YouTubePlugin } from './plugins/youtube';
import { SpotifyPlugin } from './plugins/spotify';
import {
	RestaurantsPlugin,
	PodcastsPlugin
} from './plugins/stubs';
import type { EnrichmentPlugin, EnrichmentResult, SearchSuggestion } from './types';

export class EnrichmentService {
	private plugins: Map<Category, EnrichmentPlugin> = new Map();

	constructor(apiKeys: { tmdb?: string; youtube?: string; spotify_client_id?: string; spotify_client_secret?: string } = {}) {
		// Register TMDB plugin if API key is available
		if (apiKeys.tmdb) {
			const tmdbPlugin = new TMDBPlugin(apiKeys.tmdb);
			for (const category of tmdbPlugin.supportedCategories) {
				this.plugins.set(category, tmdbPlugin);
			}
		}

		// Register Books plugin (no API key required)
		const booksPlugin = new BooksPlugin();
		for (const category of booksPlugin.supportedCategories) {
			this.plugins.set(category, booksPlugin);
		}

		// Register YouTube plugin if API key is available
		if (apiKeys.youtube) {
			const youtubePlugin = new YouTubePlugin(apiKeys.youtube);
			for (const category of youtubePlugin.supportedCategories) {
				this.plugins.set(category, youtubePlugin);
			}
		}

		// Register Spotify plugin if credentials are available
		if (apiKeys.spotify_client_id && apiKeys.spotify_client_secret) {
			const spotifyPlugin = new SpotifyPlugin(apiKeys.spotify_client_id, apiKeys.spotify_client_secret);
			for (const category of spotifyPlugin.supportedCategories) {
				this.plugins.set(category, spotifyPlugin);
			}
		}

		// Register stub plugins (will be replaced with real implementations)
		const stubPlugins = [
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
export function createEnrichmentService(apiKeys: { tmdb?: string; youtube?: string; spotify_client_id?: string; spotify_client_secret?: string }): EnrichmentService {
	return new EnrichmentService(apiKeys);
}
