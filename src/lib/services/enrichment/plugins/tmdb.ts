import type { Category, MovieMetadata, ShowMetadata } from '$lib/types';
import type { EnrichmentPlugin, EnrichmentResult, SearchSuggestion } from '../types';

export class TMDBPlugin implements EnrichmentPlugin {
	name = 'TMDB';
	supportedCategories: Category[] = ['movie', 'show'];

	private apiKey: string;
	private baseUrl = 'https://api.themoviedb.org/3';
	private imageBaseUrl = 'https://image.tmdb.org/t/p/w500';

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async search(query: string, category: Category): Promise<SearchSuggestion[]> {
		if (!this.apiKey) {
			console.warn('TMDB API key not configured');
			return [];
		}

		const endpoint = category === 'movie' ? '/search/movie' : '/search/tv';
		const url = `${this.baseUrl}${endpoint}?api_key=${this.apiKey}&query=${encodeURIComponent(query)}`;

		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`TMDB API error: ${response.statusText}`);
			}

			const data = await response.json();

			return data.results.slice(0, 5).map((item: any) => ({
				id: String(item.id),
				title: item.title || item.name,
				subtitle: item.release_date || item.first_air_date,
				thumbnail: item.poster_path ? `${this.imageBaseUrl}${item.poster_path}` : undefined,
				year: item.release_date
					? new Date(item.release_date).getFullYear()
					: item.first_air_date
						? new Date(item.first_air_date).getFullYear()
						: undefined
			}));
		} catch (error) {
			console.error('TMDB search error:', error);
			return [];
		}
	}

	async enrich(id: string, category: Category): Promise<EnrichmentResult> {
		if (!this.apiKey) {
			return {
				success: false,
				error: 'TMDB API key not configured'
			};
		}

		const endpoint = category === 'movie' ? `/movie/${id}` : `/tv/${id}`;
		const url = `${this.baseUrl}${endpoint}?api_key=${this.apiKey}&append_to_response=external_ids`;

		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`TMDB API error: ${response.statusText}`);
			}

			const data = await response.json();

			if (category === 'movie') {
				const metadata: MovieMetadata = {
					type: 'movie',
					tmdb_id: data.id,
					poster_url: data.poster_path ? `${this.imageBaseUrl}${data.poster_path}` : undefined,
					imdb_rating: data.vote_average,
					year: data.release_date ? new Date(data.release_date).getFullYear() : undefined,
					genres: data.genres?.map((g: any) => g.name)
				};

				return {
					success: true,
					metadata
				};
			} else {
				const metadata: ShowMetadata = {
					type: 'show',
					tmdb_id: data.id,
					poster_url: data.poster_path ? `${this.imageBaseUrl}${data.poster_path}` : undefined,
					imdb_rating: data.vote_average,
					year: data.first_air_date ? new Date(data.first_air_date).getFullYear() : undefined,
					genres: data.genres?.map((g: any) => g.name)
				};

				return {
					success: true,
					metadata
				};
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}
}
