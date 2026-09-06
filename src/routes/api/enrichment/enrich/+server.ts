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

// External-ID shapes (conservative: anything else is rejected before it can be
// interpolated into an upstream API URL)
const ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;

export const GET: RequestHandler = async (event) => {
	const { url, platform } = event;
	const id = url.searchParams.get('id');
	const category = url.searchParams.get('category');

	if (!id || !category) {
		return json({ error: 'Missing id or category' }, { status: 400 });
	}

	if (!VALID_CATEGORIES.includes(category as Category)) {
		return json({ error: 'Invalid category' }, { status: 400 });
	}

	if (!ID_PATTERN.test(id)) {
		return json({ error: 'Invalid id' }, { status: 400 });
	}

	if (platform?.env?.DB) {
		const limit = await checkRateLimit(platform.env.DB, clientKey(event, 'enrich'), 60, 60);
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
		const result = await enrichmentService.enrich(id, category as Category);

		if (result.success) {
			return json(result.metadata);
		} else {
			// Upstream failure: don't relay internal error text
			return json({ error: 'Enrichment unavailable' }, { status: 502 });
		}
	} catch (error) {
		console.error('Enrichment error:', error);
		return json({ error: 'Enrichment failed' }, { status: 500 });
	}
};
