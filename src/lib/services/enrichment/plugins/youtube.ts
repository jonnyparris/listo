import type { Category, RecommendationMetadata } from '$lib/types';
import type { EnrichmentPlugin, EnrichmentResult, SearchSuggestion } from '../types';

export class YouTubePlugin implements EnrichmentPlugin {
	name = 'YouTube';
	supportedCategories: Category[] = ['youtube'];

	private apiKey: string;
	private baseUrl = 'https://www.googleapis.com/youtube/v3';

	constructor(apiKey?: string) {
		this.apiKey = apiKey || '';
	}

	async search(query: string): Promise<SearchSuggestion[]> {
		if (!this.apiKey) {
			console.warn('YouTube API key not configured');
			return [];
		}

		try {
			const response = await fetch(
				`${this.baseUrl}/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${this.apiKey}`
			);

			if (!response.ok) {
				console.error(`YouTube API error (${response.status})`);
				return [];
			}

			const data = await response.json();

			if (!data.items) {
				return [];
			}

			return data.items.map((item: any) => ({
				id: item.id.videoId,
				title: item.snippet.title,
				subtitle: item.snippet.channelTitle,
				thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
				year: item.snippet.publishedAt
					? new Date(item.snippet.publishedAt).getFullYear()
					: undefined
			}));
		} catch (error) {
			console.error('YouTube search error:', error);
			return [];
		}
	}

	async enrich(id: string): Promise<EnrichmentResult> {
		if (!this.apiKey) {
			return {
				success: false,
				error: 'YouTube API key not configured'
			};
		}

		try {
			const response = await fetch(
				`${this.baseUrl}/videos?part=snippet,statistics,contentDetails&id=${id}&key=${this.apiKey}`
			);

			if (!response.ok) {
				console.error(`YouTube API error (${response.status})`);
				return {
					success: false,
					error: 'Failed to fetch video details'
				};
			}

			const data = await response.json();

			if (!data.items || data.items.length === 0) {
				return {
					success: false,
					error: 'Video not found'
				};
			}

			const video = data.items[0];
			const snippet = video.snippet;
			const statistics = video.statistics;

		const metadata: RecommendationMetadata = {
			type: 'youtube',
			video_id: id,
			channel: snippet.channelTitle,
			description: snippet.description,
			thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url,
			url: `https://www.youtube.com/watch?v=${id}`
		};

			return {
				success: true,
				metadata
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}
}
