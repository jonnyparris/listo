import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createEnrichmentService } from '$lib/services/enrichment';
import { TMDB_API_KEY, YOUTUBE_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '$env/static/private';

export const GET: RequestHandler = async ({ url, platform }) => {
	const query = url.searchParams.get('query');
	const category = url.searchParams.get('category');

	if (!query || !category) {
		return json({ error: 'Missing query or category' }, { status: 400 });
	}

	// Try platform env first (production), then fallback to SvelteKit env (dev)
	const tmdbKey = platform?.env?.TMDB_API_KEY || TMDB_API_KEY || '';
	const youtubeKey = platform?.env?.YOUTUBE_API_KEY || YOUTUBE_API_KEY || '';
	const spotifyClientId = platform?.env?.SPOTIFY_CLIENT_ID || SPOTIFY_CLIENT_ID || '';
	const spotifyClientSecret = platform?.env?.SPOTIFY_CLIENT_SECRET || SPOTIFY_CLIENT_SECRET || '';
	const omdbKey = ((platform?.env as any)?.OMDB_API_KEY as string) || '';

	const enrichmentService = createEnrichmentService({
		tmdb: tmdbKey,
		youtube: youtubeKey,
		spotify_client_id: spotifyClientId,
		spotify_client_secret: spotifyClientSecret,
		omdb: omdbKey
	});

	try {
		const suggestions = await enrichmentService.search(query, category as any);
		return json(suggestions);
	} catch (error) {
		console.error('Search error:', error);
		return json({ error: 'Search failed' }, { status: 500 });
	}
};
