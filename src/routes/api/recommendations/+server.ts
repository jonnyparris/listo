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

	const since = parseInt(url.searchParams.get('since') || '0');

	try {
		const { results } = await platform.env.DB
			.prepare(
				`SELECT * FROM recommendations
				WHERE user_id = ? AND updated_at >= ?
				ORDER BY updated_at DESC`
			)
			.bind(userId, since)
			.all();

		// Parse JSON metadata
		const recommendations = results.map((rec: any) => ({
			...rec,
			metadata: rec.metadata ? JSON.parse(rec.metadata) : undefined
		}));

		return json(recommendations);
	} catch (error) {
		console.error('Failed to fetch recommendations:', error);
		return json({ error: 'Failed to fetch recommendations' }, { status: 500 });
	}
};
