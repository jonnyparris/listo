import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createEnrichmentService } from '$lib/services/enrichment';
import { TMDB_API_KEY, YOUTUBE_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '$env/static/private';

export const GET: RequestHandler = async ({ url, platform }) => {
	const id = url.searchParams.get('id');
	const category = url.searchParams.get('category');

	if (!id || !category) {
		return json({ error: 'Missing id or category' }, { status: 400 });
	}

	// Try platform env first (production), then fallback to SvelteKit env (dev)
	const tmdbKey = platform?.env?.TMDB_API_KEY || TMDB_API_KEY || '';
	const youtubeKey = platform?.env?.YOUTUBE_API_KEY || YOUTUBE_API_KEY || '';
	const spotifyClientId = platform?.env?.SPOTIFY_CLIENT_ID || SPOTIFY_CLIENT_ID || '';
	const spotifyClientSecret = platform?.env?.SPOTIFY_CLIENT_SECRET || SPOTIFY_CLIENT_SECRET || '';

	const enrichmentService = createEnrichmentService({
		tmdb: tmdbKey,
		youtube: youtubeKey,
		spotify_client_id: spotifyClientId,
		spotify_client_secret: spotifyClientSecret
	});

	try {
		const result = await enrichmentService.enrich(id, category as any);

		if (result.success) {
			return json(result.metadata);
		} else {
			return json({ error: result.error }, { status: 500 });
		}
	} catch (error) {
		console.error('Enrichment error:', error);
		return json({ error: 'Enrichment failed' }, { status: 500 });
	}
};
