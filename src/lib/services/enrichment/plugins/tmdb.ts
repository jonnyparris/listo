import type { Category, MovieMetadata, SeriesMetadata } from '$lib/types';
import type { EnrichmentPlugin, EnrichmentResult, SearchSuggestion } from '../types';

export class TMDBPlugin implements EnrichmentPlugin {
	name = 'TMDB';
	supportedCategories: Category[] = ['movie', 'series'];

	private apiKey: string;
	private baseUrl = 'https://api.themoviedb.org/3';
	private imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
	private omdbApiKey?: string;

	constructor(apiKey: string, omdbApiKey?: string) {
		this.apiKey = apiKey;
		this.omdbApiKey = omdbApiKey;
	}

	async search(query: string, category: Category): Promise<SearchSuggestion[]> {
		if (!this.apiKey) {
			console.warn('TMDB API key not configured');
			return [];
		}

		const endpoint = category === 'movie' ? '/search/movie' : '/search/tv';

		// Check if this is a v4 JWT token or v3 API key
		const isV4Token = this.apiKey.startsWith('eyJ');

		let url: string;
		let headers: HeadersInit;

		if (isV4Token) {
			// TMDB API v4 with Bearer token
			url = `https://api.themoviedb.org/4${endpoint}?query=${encodeURIComponent(query)}`;
			headers = {
				'Authorization': `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			};
		} else {
			// TMDB API v3 with API key
			url = `${this.baseUrl}${endpoint}?api_key=${this.apiKey}&query=${encodeURIComponent(query)}`;
			headers = {};
		}

		try {
			const response = await fetch(url, { headers });
			if (!response.ok) {
				const errorText = await response.text();
				console.error(`TMDB API error (${response.status}):`, errorText);
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

		// Check if this is a v4 JWT token or v3 API key
		const isV4Token = this.apiKey.startsWith('eyJ');

		let url: string;
		let headers: HeadersInit;

		if (isV4Token) {
			// TMDB API v4 with Bearer token
			url = `https://api.themoviedb.org/4${endpoint}?append_to_response=external_ids`;
			headers = {
				'Authorization': `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			};
		} else {
			// TMDB API v3 with API key
			url = `${this.baseUrl}${endpoint}?api_key=${this.apiKey}&append_to_response=external_ids`;
			headers = {};
		}

		try {
			const response = await fetch(url, { headers });
			if (!response.ok) {
				const errorText = await response.text();
				console.error(`TMDB API error (${response.status}):`, errorText);
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
					genres: data.genres?.map((g: any) => g.name),
					overview: data.overview
				};

				// Optionally fetch Rotten Tomatoes score via OMDb
				try {
					const imdbId = data.external_ids?.imdb_id;
					if (this.omdbApiKey && imdbId) {
						const omdbResp = await fetch(`https://omdbapi.com/?apikey=${this.omdbApiKey}&i=${imdbId}`);
						if (omdbResp.ok) {
							const omdb = await omdbResp.json();
							if (Array.isArray(omdb.Ratings)) {
								const rt = omdb.Ratings.find((r: any) => r.Source === 'Rotten Tomatoes');
								if (rt?.Value) {
									const pct = parseInt(String(rt.Value).replace('%',''), 10);
									if (!isNaN(pct)) {
										metadata.rt_score = pct;
									}
								}
							}
						}
					}
				} catch {
					// ignore OMDb failures
				}

				return {
					success: true,
					metadata
				};
			} else {
				const metadata: SeriesMetadata = {
					type: 'series',
					tmdb_id: data.id,
					poster_url: data.poster_path ? `${this.imageBaseUrl}${data.poster_path}` : undefined,
					imdb_rating: data.vote_average,
					year: data.first_air_date ? new Date(data.first_air_date).getFullYear() : undefined,
					genres: data.genres?.map((g: any) => g.name),
					overview: data.overview
				};

				// Optionally fetch Rotten Tomatoes score via OMDb
				try {
					const imdbId = data.external_ids?.imdb_id;
					if (this.omdbApiKey && imdbId) {
						const omdbResp = await fetch(`https://www.omdbapi.com/?apikey=${this.omdbApiKey}&i=${imdbId}`);
						if (omdbResp.ok) {
							const omdb = await omdbResp.json();
							if (Array.isArray(omdb.Ratings)) {
								const rt = omdb.Ratings.find((r: any) => r.Source === 'Rotten Tomatoes');
								if (rt?.Value) {
									const pct = parseInt(String(rt.Value).replace('%',''), 10);
									if (!isNaN(pct)) {
										metadata.rt_score = pct;
									}
								}
							}
						}
					}
				} catch {
					// ignore OMDb failures
				}

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
