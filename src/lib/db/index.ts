import Dexie, { type EntityTable } from 'dexie';
import type { LocalRecommendation } from '$lib/types';

// Define the database schema
export class ListoDatabase extends Dexie {
	recommendations!: EntityTable<LocalRecommendation, 'id'>;

	constructor() {
		super('ListoDB');
		this.version(1).stores({
			recommendations: 'id, user_id, category, updated_at, synced, deleted_at, completed_at, [user_id+synced], [user_id+category]'
		});
	}
}

// Create a singleton instance
export const db = new ListoDatabase();

// Database operations
export const dbOperations = {
	// Add a new recommendation
	async addRecommendation(recommendation: LocalRecommendation) {
		return db.recommendations.add(recommendation);
	},

	// Get a single recommendation by ID
	async getRecommendation(id: string) {
		return db.recommendations.get(id);
	},

	// Update a recommendation
	// NOTE: callers that pass an explicit `updated_at` (server sync pull) keep it —
	// clobbering it with "now" would corrupt last-write-wins conflict resolution
	// and reorder the list after every sync. Only genuine local edits bump it.
	async updateRecommendation(id: string, changes: Partial<LocalRecommendation>) {
		return db.recommendations.update(id, {
			...changes,
			updated_at: changes.updated_at ?? Math.floor(Date.now() / 1000)
		});
	},

	// Get all recommendations (excluding soft-deleted and completed)
	async getAllRecommendations(userId: string) {
		return db.recommendations
			.where('user_id')
			.equals(userId)
			.and((rec) => !rec.deleted_at && !rec.completed_at)
			.reverse()
			.sortBy('updated_at');
	},

	// Get all recommendations including deleted and completed (for sync)
	async getAllRecommendationsForSync(userId: string) {
		return db.recommendations
			.where('user_id')
			.equals(userId)
			.toArray();
	},

	// Get completed recommendations
	async getCompletedRecommendations(userId: string) {
		return db.recommendations
			.where('user_id')
			.equals(userId)
			.and((rec) => !rec.deleted_at && !!rec.completed_at)
			.reverse()
			.sortBy('completed_at');
	},

	// Get recommendations by category
	async getRecommendationsByCategory(userId: string, category: string) {
		return db.recommendations
			.where('[user_id+category]')
			.equals([userId, category])
			.and((rec) => !rec.deleted_at)
			.reverse()
			.sortBy('updated_at');
	},

	// Search recommendations
	async searchRecommendations(userId: string, query: string) {
		const lowerQuery = query.toLowerCase();
		return db.recommendations
			.where('user_id')
			.equals(userId)
			.and((rec): boolean => {
				if (rec.deleted_at) return false;
				const titleMatch = rec.title.toLowerCase().includes(lowerQuery);
				const descMatch = rec.description?.toLowerCase().includes(lowerQuery);
				const tagsMatch = rec.tags?.toLowerCase().includes(lowerQuery);
				return !!(titleMatch || descMatch || tagsMatch);
			})
			.toArray();
	},

	// Soft delete a recommendation
	async deleteRecommendation(id: string) {
		return db.recommendations.update(id, {
			deleted_at: Math.floor(Date.now() / 1000),
			synced: false
		});
	},

	// Get unsynced recommendations
	async getUnsyncedRecommendations(userId: string) {
		return db.recommendations
			.where('user_id')
			.equals(userId)
			.and((rec) => rec.synced === false)
			.toArray();
	},

	// Mark recommendations as synced — but only if they were not edited while
	// the sync request was in flight. Records are matched on the updated_at that
	// was actually uploaded; anything changed since stays unsynced and will be
	// re-pushed on the next sync instead of being silently lost.
	async markSyncedIfUnchanged(items: Array<{ id: string; updated_at: number }>) {
		return db.transaction('rw', db.recommendations, async () => {
			for (const item of items) {
				const rec = await db.recommendations.get(item.id);
				if (rec && rec.updated_at === item.updated_at) {
					await db.recommendations.update(item.id, { synced: true, sync_error: undefined });
				}
			}
		});
	},

	// Mark sync error
	async markSyncError(id: string, error: string) {
		return db.recommendations.update(id, {
			synced: false,
			sync_error: error
		});
	},

	// Clear all data (for testing/logout)
	async clearAll() {
		return db.recommendations.clear();
	}
};
