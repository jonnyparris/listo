import { dbOperations } from '$lib/db';
import type { LocalRecommendation } from '$lib/types';

export class SyncService {
	private syncInProgress = false;

	/**
	 * Sync local recommendations to the server
	 * Uses last-write-wins strategy based on updated_at timestamp
	 */
	async syncToServer(userId: string): Promise<{ success: boolean; error?: string }> {
		if (this.syncInProgress) {
			return { success: false, error: 'Sync already in progress' };
		}

		this.syncInProgress = true;

		try {
			// Get all unsynced recommendations
			const unsynced = await dbOperations.getUnsyncedRecommendations(userId);

			if (unsynced.length === 0) {
				return { success: true };
			}

			// Send to server in batches
			const response = await fetch('/api/recommendations/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ recommendations: unsynced })
			});

			if (!response.ok) {
				throw new Error(`Sync failed: ${response.statusText}`);
			}

			const result = await response.json();

			// Mark successfully synced items
			if (result.synced) {
				await dbOperations.markAsSynced(result.synced);
			}

			// Mark failed items with errors
			if (result.errors) {
				for (const error of result.errors) {
					await dbOperations.markSyncError(error.id, error.message);
				}
			}

			return { success: true };
		} catch (error) {
			console.error('Sync error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		} finally {
			this.syncInProgress = false;
		}
	}

	/**
	 * Pull updates from server and merge with local data
	 * Uses last-write-wins based on updated_at timestamp
	 */
	async pullFromServer(userId: string): Promise<{ success: boolean; error?: string }> {
		try {
			// Get the latest updated_at timestamp from local db
			const localRecs = await dbOperations.getAllRecommendations(userId);
			const lastSync = localRecs.length > 0 ? Math.max(...localRecs.map((r) => r.updated_at)) : 0;

			// Fetch updates from server
			const response = await fetch(`/api/recommendations?since=${lastSync}`);
			if (!response.ok) {
				throw new Error(`Pull failed: ${response.statusText}`);
			}

			const serverRecs: LocalRecommendation[] = await response.json();

			// Merge with local data using last-write-wins
			for (const serverRec of serverRecs) {
				const localRec = await dbOperations.getAllRecommendations(userId).then((recs) =>
					recs.find((r) => r.id === serverRec.id)
				);

				if (!localRec) {
					// New from server, add locally
					await dbOperations.addRecommendation({ ...serverRec, synced: true });
				} else if (serverRec.updated_at > localRec.updated_at) {
					// Server is newer, update local
					await dbOperations.updateRecommendation(serverRec.id, { ...serverRec, synced: true });
				}
				// If local is newer, keep local (it will be synced on next push)
			}

			return { success: true };
		} catch (error) {
			console.error('Pull error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Full two-way sync: pull then push
	 */
	async fullSync(userId: string): Promise<{ success: boolean; error?: string }> {
		const pullResult = await this.pullFromServer(userId);
		if (!pullResult.success) {
			return pullResult;
		}

		return this.syncToServer(userId);
	}
}

export const syncService = new SyncService();
