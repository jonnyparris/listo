import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { LocalRecommendation } from '$lib/types';

const MAX_BATCH = 500;
const CATEGORIES = new Set([
	'series', 'movie', 'youtube', 'podcast', 'artist', 'song', 'genre',
	'restaurant', 'recipe', 'activity', 'video-game', 'board-game',
	'book', 'graphic-novel', 'quote'
]);

interface ValidRecommendation {
	id: string;
	title: string;
	category: string;
	description: string | null;
	source: string | null;
	metadata: string | null;
	tags: string | null;
	created_at: number;
	updated_at: number;
	deleted_at: number | null;
	completed_at: number | null;
	review: string | null;
	rating: number | null;
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Validate and normalize a sync payload item. Anything malformed is rejected
 * for that item (reported in errors) instead of being written to D1.
 */
function validateRecommendation(input: unknown): ValidRecommendation | { error: string } {
	if (!input || typeof input !== 'object') {
		return { error: 'not an object' };
	}
	const rec = input as Record<string, unknown>;

	const id = typeof rec.id === 'string' ? rec.id : '';
	if (!/^[A-Za-z0-9._:-]{1,128}$/.test(id)) {
		return { error: 'invalid id' };
	}

	const title = typeof rec.title === 'string' ? rec.title.trim() : '';
	if (!title || title.length > 500) {
		return { error: 'invalid title' };
	}

	const category = typeof rec.category === 'string' ? rec.category : '';
	if (!CATEGORIES.has(category)) {
		return { error: `invalid category: ${category.slice(0, 40)}` };
	}

	if (!isFiniteNumber(rec.created_at) || !isFiniteNumber(rec.updated_at) || rec.updated_at < 0) {
		return { error: 'invalid timestamps' };
	}

	const optionalString = (value: unknown, max: number): string | null => {
		if (value === null || value === undefined) return null;
		if (typeof value !== 'string') return null;
		return value.slice(0, max);
	};

	let metadata: string | null = null;
	if (rec.metadata !== null && rec.metadata !== undefined) {
		if (typeof rec.metadata !== 'object') {
			return { error: 'invalid metadata' };
		}
		try {
			metadata = JSON.stringify(rec.metadata).slice(0, 100_000);
		} catch {
			return { error: 'invalid metadata' };
		}
	}

	let rating: number | null = null;
	if (rec.rating !== null && rec.rating !== undefined) {
		if (!isFiniteNumber(rec.rating) || rec.rating < 1 || rec.rating > 5) {
			return { error: 'invalid rating' };
		}
		rating = Math.round(rec.rating);
	}

	return {
		id,
		title: title.slice(0, 500),
		category,
		description: optionalString(rec.description, 10_000),
		source: optionalString(rec.source, 200),
		metadata,
		tags: optionalString(rec.tags, 1_000),
		created_at: Math.floor(rec.created_at),
		updated_at: Math.floor(rec.updated_at),
		deleted_at: isFiniteNumber(rec.deleted_at) ? Math.floor(rec.deleted_at) : null,
		completed_at: isFiniteNumber(rec.completed_at) ? Math.floor(rec.completed_at) : null,
		review: optionalString(rec.review, 10_000),
		rating
	};
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const userId = locals.user?.id;
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const recommendations = (payload as { recommendations?: unknown } | null)?.recommendations;
	if (!Array.isArray(recommendations)) {
		return json({ error: 'Expected { recommendations: [...] }' }, { status: 400 });
	}

	if (recommendations.length > MAX_BATCH) {
		return json({ error: `Batch too large (max ${MAX_BATCH})` }, { status: 413 });
	}

	const db = platform.env.DB;
	const synced: string[] = [];
	const errors: Array<{ id: string; message: string }> = [];

	for (const raw of recommendations) {
		const rec = validateRecommendation(raw);
		if ('error' in rec) {
			const id = (raw as { id?: unknown })?.id;
			errors.push({ id: typeof id === 'string' ? id : 'unknown', message: rec.error });
			continue;
		}

		try {
			// Scope existence check AND update to the authenticated user: a row
			// belonging to someone else must never be readable or updatable here.
			const existing = await db
				.prepare('SELECT updated_at FROM recommendations WHERE id = ? AND user_id = ?')
				.bind(rec.id, userId)
				.first();

			if (existing) {
				// Update if local is newer (last-write-wins)
				if (!existing.updated_at || rec.updated_at > (existing.updated_at as number)) {
					await db
						.prepare(
							`UPDATE recommendations
							SET title = ?, category = ?, description = ?, source = ?, metadata = ?, tags = ?,
							    updated_at = ?, deleted_at = ?, completed_at = ?, review = ?, rating = ?
							WHERE id = ? AND user_id = ?`
						)
						.bind(
							rec.title,
							rec.category,
							rec.description,
							rec.source,
							rec.metadata,
							rec.tags,
							rec.updated_at,
							rec.deleted_at,
							rec.completed_at,
							rec.review,
							rec.rating,
							rec.id,
							userId
						)
						.run();
				}
			} else {
				// Insert new record
				await db
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
						rec.description,
						rec.source,
						rec.metadata,
						rec.tags,
						rec.created_at,
						rec.updated_at,
						rec.deleted_at,
						rec.completed_at,
						rec.review,
						rec.rating
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
