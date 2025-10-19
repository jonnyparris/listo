import type { Category } from '$lib/types';
import type { EnrichmentPlugin, EnrichmentResult, SearchSuggestion } from '../types';

interface SpotifyAccessToken {
	access_token: string;
	token_type: string;
	expires_in: number;
}

interface SpotifySearchResponse {
	tracks?: {
		items: Array<{
			id: string;
			name: string;
			artists: Array<{ name: string }>;
			album: {
				name: string;
				images: Array<{ url: string; height: number; width: number }>;
			};
			external_urls: { spotify: string };
			preview_url: string | null;
		}>;
	};
	artists?: {
		items: Array<{
			id: string;
			name: string;
			genres: string[];
			images: Array<{ url: string; height: number; width: number }>;
			external_urls: { spotify: string };
			followers: { total: number };
		}>;
	};
	shows?: {
		items: Array<{
			id: string;
			name: string;
			publisher: string;
			description: string;
			images: Array<{ url: string; height: number; width: number }>;
			external_urls: { spotify: string };
		}>;
	};
}

interface SpotifyTrackDetails {
	id: string;
	name: string;
	artists: Array<{ name: string }>;
	album: {
		name: string;
		release_date: string;
		images: Array<{ url: string; height: number; width: number }>;
	};
	external_urls: { spotify: string };
	preview_url: string | null;
	duration_ms: number;
	popularity: number;
}

interface SpotifyArtistDetails {
	id: string;
	name: string;
	genres: string[];
	images: Array<{ url: string; height: number; width: number }>;
	external_urls: { spotify: string };
	followers: { total: number };
	popularity: number;
}

/**
 * Spotify plugin for music enrichment
 * Uses Spotify Web API with Client Credentials flow
 * https://developer.spotify.com/documentation/web-api
 */
export class SpotifyPlugin implements EnrichmentPlugin {
	name = 'Spotify';
	supportedCategories: Category[] = ['artist', 'song', 'genre', 'podcast'];
	private clientId: string;
	private clientSecret: string;
	private accessToken: string | null = null;
	private tokenExpiry: number = 0;

	constructor(clientId: string, clientSecret: string) {
		this.clientId = clientId;
		this.clientSecret = clientSecret;
	}

	/**
	 * Get an access token using Client Credentials flow
	 */
	private async getAccessToken(): Promise<string> {
		// Return cached token if still valid
		if (this.accessToken && Date.now() < this.tokenExpiry) {
			return this.accessToken;
		}

		const authString = btoa(`${this.clientId}:${this.clientSecret}`);

		const response = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Authorization': `Basic ${authString}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: 'grant_type=client_credentials'
		});

		if (!response.ok) {
			throw new Error(`Failed to get Spotify access token: ${response.statusText}`);
		}

		const data: SpotifyAccessToken = await response.json();
		this.accessToken = data.access_token;
		// Set expiry to 5 minutes before actual expiry to be safe
		this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

		return this.accessToken;
	}

	/**
	 * Search for tracks, artists, or genres on Spotify
	 */
	async search(query: string, category: Category): Promise<SearchSuggestion[]> {
		try {
			const token = await this.getAccessToken();
			let type: string;

			// Map category to Spotify search type
			if (category === 'song') {
				type = 'track';
			} else if (category === 'artist') {
				type = 'artist';
			} else if (category === 'genre') {
				// For genres, search both tracks and artists
				type = 'track,artist';
			} else if (category === 'podcast') {
				type = 'show';
			} else {
				return [];
			}

			const params = new URLSearchParams({
				q: query,
				type: type,
				limit: '10'
			});

			const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (!response.ok) {
				console.error('Spotify search failed:', response.statusText);
				return [];
			}

			const data: SpotifySearchResponse = await response.json();

		// Handle track search
		if (category === 'song' && data.tracks) {
			return data.tracks.items.slice(0, 5).map((track) => ({
				id: track.id,
				title: track.name,
				subtitle: `by ${track.artists.map((a) => a.name).join(', ')} • ${track.album.name}`,
				thumbnail: track.album.images[2]?.url || track.album.images[0]?.url
			}));
		}

		// Handle artist search
		if (category === 'artist' && data.artists) {
			return data.artists.items.slice(0, 5).map((artist) => ({
				id: artist.id,
				title: artist.name,
				subtitle: artist.genres.slice(0, 3).join(', ') || 'Artist',
				thumbnail: artist.images[2]?.url || artist.images[0]?.url
			}));
		}

		// Handle genre search (return both tracks and artists)
		if (category === 'genre') {
			const results: SearchSuggestion[] = [];

			if (data.tracks) {
				results.push(
					...data.tracks.items.slice(0, 3).map((track) => ({
						id: track.id,
						title: track.name,
						subtitle: `Track by ${track.artists.map((a) => a.name).join(', ')}`,
						thumbnail: track.album.images[2]?.url || track.album.images[0]?.url
					}))
				);
			}

			if (data.artists) {
				results.push(
					...data.artists.items.slice(0, 2).map((artist) => ({
						id: artist.id,
						title: artist.name,
						subtitle: `Artist • ${artist.genres.slice(0, 2).join(', ')}`,
						thumbnail: artist.images[2]?.url || artist.images[0]?.url
					}))
				);
			}

			return results;
		}

		// Handle podcast search
		if (category === 'podcast' && data.shows) {
			return data.shows.items.slice(0, 5).map((show) => ({
				id: show.id,
				title: show.name,
				subtitle: `by ${show.publisher}`,
				thumbnail: show.images[2]?.url || show.images[0]?.url
			}));
		}

			return [];
		} catch (error) {
			console.error('Spotify search error:', error);
			return [];
		}
	}

	/**
	 * Enrich a recommendation with Spotify metadata
	 */
	async enrich(id: string, category: Category): Promise<EnrichmentResult> {
		try {
			const token = await this.getAccessToken();

			if (category === 'song') {
				// Fetch track details
				const response = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
					headers: {
						'Authorization': `Bearer ${token}`
					}
				});

				if (!response.ok) {
					return {
						success: false,
						error: `Failed to fetch track details: ${response.statusText}`
					};
				}

				const track: SpotifyTrackDetails = await response.json();

			return {
				success: true,
				metadata: {
					type: 'music',
					artist: track.artists.map((a) => a.name).join(', '),
					year: track.album.release_date
						? new Date(track.album.release_date).getFullYear()
						: undefined,
					runtime: Math.floor(track.duration_ms / 60000),
					rating: track.popularity,
					album_art: track.album.images[1]?.url || track.album.images[0]?.url,
					spotify_url: track.external_urls.spotify
				}
			};
			}

			if (category === 'artist') {
				// Fetch artist details
				const response = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
					headers: {
						'Authorization': `Bearer ${token}`
					}
				});

				if (!response.ok) {
					return {
						success: false,
						error: `Failed to fetch artist details: ${response.statusText}`
					};
				}

				const artist: SpotifyArtistDetails = await response.json();

			return {
				success: true,
				metadata: {
					type: 'music',
					genres: artist.genres,
					rating: artist.popularity,
					album_art: artist.images[1]?.url || artist.images[0]?.url,
					spotify_url: artist.external_urls.spotify
				}
			};
			}

			if (category === 'podcast') {
				// Fetch podcast/show details
				const response = await fetch(`https://api.spotify.com/v1/shows/${id}`, {
					headers: {
						'Authorization': `Bearer ${token}`
					}
				});

				if (!response.ok) {
					return {
						success: false,
						error: `Failed to fetch podcast details: ${response.statusText}`
					};
				}

				const show: any = await response.json();

				return {
					success: true,
					metadata: {
						type: 'podcast',
						publisher: show.publisher,
						description: show.description,
						thumbnail_url: show.images[1]?.url || show.images[0]?.url,
						spotify_url: show.external_urls.spotify
					}
				};
			}

			return {
				success: false,
				error: `Enrichment not supported for category: ${category}`
			};
		} catch (error) {
			console.error('Spotify enrichment error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}
}
