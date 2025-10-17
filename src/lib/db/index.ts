import Dexie, { type EntityTable } from 'dexie';
import type { LocalRecommendation } from '$lib/types';

// Define the database schema
export class ListoDatabase extends Dexie {
	recommendations!: EntityTable<LocalRecommendation, 'id'>;

	constructor() {
		super('ListoDB');
		this.version(1).stores({
			recommendations: 'id, user_id, category, updated_at, synced, deleted_at'
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

	// Update a recommendation
	async updateRecommendation(id: string, changes: Partial<LocalRecommendation>) {
		return db.recommendations.update(id, {
			...changes,
			updated_at: Math.floor(Date.now() / 1000)
		});
	},

	// Get all recommendations (excluding soft-deleted)
	async getAllRecommendations(userId: string) {
		return db.recommendations
			.where('user_id')
			.equals(userId)
			.and((rec) => !rec.deleted_at)
			.reverse()
			.sortBy('updated_at');
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
			.and((rec) => {
				if (rec.deleted_at) return false;
				const titleMatch = rec.title.toLowerCase().includes(lowerQuery);
				const descMatch = rec.description?.toLowerCase().includes(lowerQuery);
				const tagsMatch = rec.tags?.toLowerCase().includes(lowerQuery);
				return titleMatch || descMatch || tagsMatch;
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
		return db.recommendations.where('[user_id+synced]').equals([userId, 0]).toArray();
	},

	// Mark recommendations as synced
	async markAsSynced(ids: string[]) {
		return db.recommendations.bulkUpdate(
			ids.map((id) => ({
				key: id,
				changes: { synced: true, sync_error: undefined }
			}))
		);
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
