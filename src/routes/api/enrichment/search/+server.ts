import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createEnrichmentService } from '$lib/services/enrichment';
import { env } from '$env/dynamic/private';
import { checkRateLimit, clientKey } from '$lib/server/ratelimit';
import type { Category } from '$lib/types';

const VALID_CATEGORIES: Category[] = [
	'series', 'movie', 'youtube', 'podcast', 'artist', 'song', 'genre',
	'restaurant', 'recipe', 'activity', 'video-game', 'board-game',
	'book', 'graphic-novel', 'quote'
];

export const GET: RequestHandler = async (event) => {
	const { url, platform } = event;
	const query = url.searchParams.get('query');
	const category = url.searchParams.get('category');

	if (!query || !category) {
		return json({ error: 'Missing query or category' }, { status: 400 });
	}

	if (!VALID_CATEGORIES.includes(category as Category)) {
		return json({ error: 'Invalid category' }, { status: 400 });
	}

	if (platform?.env?.DB) {
		const limit = await checkRateLimit(platform.env.DB, clientKey(event, 'enrich-search'), 60, 60);
		if (!limit.allowed) {
			return json({ error: 'Too many requests' }, { status: 429 });
		}
	}

	// Try platform env first (production), then fallback to SvelteKit env (dev)
	const tmdbKey = platform?.env?.TMDB_API_KEY || env.TMDB_API_KEY || '';
	const youtubeKey = platform?.env?.YOUTUBE_API_KEY || env.YOUTUBE_API_KEY || '';
	const spotifyClientId = platform?.env?.SPOTIFY_CLIENT_ID || env.SPOTIFY_CLIENT_ID || '';
	const spotifyClientSecret = platform?.env?.SPOTIFY_CLIENT_SECRET || env.SPOTIFY_CLIENT_SECRET || '';
	const omdbKey = platform?.env?.OMDB_API_KEY || env.OMDB_API_KEY || '';

	const enrichmentService = createEnrichmentService({
		tmdb: tmdbKey,
		youtube: youtubeKey,
		spotify_client_id: spotifyClientId,
		spotify_client_secret: spotifyClientSecret,
		omdb: omdbKey
	});

	try {
		// Cap query length before it reaches third-party APIs
		const suggestions = await enrichmentService.search(query.slice(0, 200), category as Category);
		return json(suggestions);
	} catch (error) {
		console.error('Search error:', error);
		return json({ error: 'Search failed' }, { status: 500 });
	}
};
