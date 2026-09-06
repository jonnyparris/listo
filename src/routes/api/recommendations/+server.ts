import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, platform, locals }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const userId = locals.user?.id;
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Guard against NaN/negative input; cap result size
	const sinceRaw = Number(url.searchParams.get('since') ?? '0');
	const since = Number.isFinite(sinceRaw) && sinceRaw >= 0 ? Math.floor(sinceRaw) : 0;

	try {
		const { results } = await platform.env.DB
			.prepare(
				`SELECT * FROM recommendations
				WHERE user_id = ? AND updated_at >= ?
				ORDER BY updated_at DESC
				LIMIT 2000`
			)
			.bind(userId, since)
			.all();

		// Parse JSON metadata defensively: one corrupt row must not 500 the whole
		// pull (the client only advances its pull cursor on success, so a throwing
		// parse would permanently break sync for the account)
		const recommendations = results.map((rec: any) => {
			let metadata: unknown;
			if (rec.metadata) {
				try {
					metadata = JSON.parse(rec.metadata);
				} catch {
					console.error(`Corrupt metadata JSON for recommendation ${rec.id}; dropping metadata`);
					metadata = undefined;
				}
			}
			return { ...rec, metadata };
		});

		return json(recommendations);
	} catch (error) {
		console.error('Failed to fetch recommendations:', error);
		return json({ error: 'Failed to fetch recommendations' }, { status: 500 });
	}
};
