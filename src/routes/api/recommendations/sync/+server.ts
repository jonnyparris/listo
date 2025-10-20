import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { LocalRecommendation } from '$lib/types';

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const { recommendations } = await request.json() as { recommendations: LocalRecommendation[] };
	const userId = locals.user?.id;

	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const synced: string[] = [];
	const errors: Array<{ id: string; message: string }> = [];

	for (const rec of recommendations) {
		try {
			// Check if record exists
			const existing = await platform.env.DB
				.prepare('SELECT updated_at FROM recommendations WHERE id = ?')
				.bind(rec.id)
				.first();

			if (existing) {
				// Update if local is newer (last-write-wins)
				if (!existing.updated_at || rec.updated_at > (existing.updated_at as number)) {
					await platform.env.DB
						.prepare(
							`UPDATE recommendations
							SET title = ?, category = ?, description = ?, source = ?, metadata = ?, tags = ?,
							    updated_at = ?, deleted_at = ?, completed_at = ?, review = ?, rating = ?
							WHERE id = ?`
						)
						.bind(
							rec.title,
							rec.category,
							rec.description || null,
							rec.source || null,
							rec.metadata ? JSON.stringify(rec.metadata) : null,
							rec.tags || null,
							rec.updated_at,
							rec.deleted_at || null,
							rec.completed_at || null,
							rec.review || null,
							rec.rating || null,
							rec.id
						)
						.run();
				}
			} else {
				// Insert new record
				await platform.env.DB
					.prepare(
						`INSERT INTO recommendations
						(id, user_id, title, category, description, source, metadata, tags, created_at, updated_at, deleted_at, completed_at, review, rating)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
					)
					.bind(
						rec.id,
						userId,
						rec.title,
						rec.category,
						rec.description || null,
						rec.source || null,
						rec.metadata ? JSON.stringify(rec.metadata) : null,
						rec.tags || null,
						rec.created_at,
						rec.updated_at,
						rec.deleted_at || null,
						rec.completed_at || null,
						rec.review || null,
						rec.rating || null
					)
					.run();
			}

			synced.push(rec.id);
		} catch (error) {
			console.error(`[SYNC] Error syncing recommendation ${rec.id}:`, error);
			errors.push({
				id: rec.id,
				message: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	return json({ synced, errors });
};
