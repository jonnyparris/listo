import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createEnrichmentService } from '$lib/services/enrichment';
import { TMDB_API_KEY } from '$env/static/private';

export const GET: RequestHandler = async ({ url, platform }) => {
	const query = url.searchParams.get('query');
	const category = url.searchParams.get('category');

	if (!query || !category) {
		return json({ error: 'Missing query or category' }, { status: 400 });
	}

	// Try platform env first (production), then fallback to SvelteKit env (dev)
	const apiKey = platform?.env?.TMDB_API_KEY || TMDB_API_KEY || '';

	if (!apiKey) {
		console.warn('TMDB_API_KEY not configured - returning empty results');
		return json([]);
	}

	const enrichmentService = createEnrichmentService({ tmdb: apiKey });

	try {
		const suggestions = await enrichmentService.search(query, category as any);
		return json(suggestions);
	} catch (error) {
		console.error('Search error:', error);
		return json({ error: 'Search failed' }, { status: 500 });
	}
};
