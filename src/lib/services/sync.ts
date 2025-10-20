import { dbOperations } from '$lib/db';
import type { LocalRecommendation } from '$lib/types';

export class SyncService {
	private syncInProgress = false;

	/**
	 * Get the last successful pull timestamp from localStorage
	 */
	private getLastPulledAt(userId: string): number {
		const stored = localStorage.getItem(`lastPulledAt_${userId}`);
		return stored ? parseInt(stored, 10) : 0;
	}

	/**
	 * Update the last successful pull timestamp in localStorage
	 */
	private setLastPulledAt(userId: string, timestamp: number): void {
		localStorage.setItem(`lastPulledAt_${userId}`, timestamp.toString());
	}

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
				const errorText = await response.text();
				console.error('Sync failed:', response.status, errorText);
				throw new Error(`Sync failed: ${response.statusText}`);
			}

			const result = await response.json();

			// Mark successfully synced items
			if (result.synced && result.synced.length > 0) {
				await dbOperations.markAsSynced(result.synced);
			}

			// Mark failed items with errors
			if (result.errors && result.errors.length > 0) {
				console.warn(`Failed to sync ${result.errors.length} recommendations:`, result.errors);
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
	async pullFromServer(userId: string, forceFull: boolean = false): Promise<{ success: boolean; error?: string }> {
		try {
			// Determine what timestamp to use for fetching updates
			// CRITICAL FIX: Use the last successful pull timestamp, not the max local timestamp
			// This ensures we don't miss recommendations created on other devices while we were offline
			let lastSync = this.getLastPulledAt(userId);

			// If forcing a full sync, reset to 0 to fetch everything
			if (forceFull) {
				lastSync = 0;
			}

			// Fetch updates from server
			const response = await fetch(`/api/recommendations?since=${lastSync}`);
			if (!response.ok) {
				const errorText = await response.text();
				console.error('Pull failed:', response.status, errorText);
				throw new Error(`Pull failed: ${response.statusText}`);
			}

			const serverRecs: LocalRecommendation[] = await response.json();

			// Get local records for merge comparison
			const localRecs = await dbOperations.getAllRecommendationsForSync(userId);

			// Merge with local data using last-write-wins
			let added = 0, updated = 0;
			for (const serverRec of serverRecs) {
				const localRec = localRecs.find((r) => r.id === serverRec.id);

				if (!localRec) {
					// New from server, add locally
					await dbOperations.addRecommendation({ ...serverRec, synced: true });
					added++;
				} else if (serverRec.updated_at > localRec.updated_at) {
					// Server is newer, update local
					await dbOperations.updateRecommendation(serverRec.id, { ...serverRec, synced: true });
					updated++;
				}
				// If local is newer, keep local (it will be synced on next push)
			}

			// Update the last pulled timestamp to now
			// This ensures the next pull will only fetch items updated after this sync completed
			this.setLastPulledAt(userId, Math.floor(Date.now() / 1000));

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
	async fullSync(userId: string, forceFull: boolean = false): Promise<{ success: boolean; error?: string }> {
		const pullResult = await this.pullFromServer(userId, forceFull);
		if (!pullResult.success) {
			return pullResult;
		}

		return this.syncToServer(userId);
	}
}

export const syncService = new SyncService();
