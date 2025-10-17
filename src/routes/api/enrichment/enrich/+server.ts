import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createEnrichmentService } from '$lib/services/enrichment';
import { TMDB_API_KEY } from '$env/static/private';

export const GET: RequestHandler = async ({ url, platform }) => {
	const id = url.searchParams.get('id');
	const category = url.searchParams.get('category');

	if (!id || !category) {
		return json({ error: 'Missing id or category' }, { status: 400 });
	}

	// Try platform env first (production), then fallback to SvelteKit env (dev)
	const apiKey = platform?.env?.TMDB_API_KEY || TMDB_API_KEY || '';

	if (!apiKey) {
		console.warn('TMDB_API_KEY not configured - cannot enrich');
		return json({ error: 'API key not configured' }, { status: 503 });
	}

	const enrichmentService = createEnrichmentService({ tmdb: apiKey });

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
