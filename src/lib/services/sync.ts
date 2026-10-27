import { dbOperations } from '$lib/db';
import type { LocalRecommendation } from '$lib/types';
import { MAX_PUSH_BATCH, PULL_PAGE_SIZE } from '$lib/services/sync-contract';

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

			// Snapshot the exact version being uploaded so we can tell later whether
			// the record was edited while the request was in flight
			const sentVersions = new Map(unsynced.map((rec) => [rec.id, rec.updated_at]));

			// Send to server in batches no larger than the route's cap. A single
			// oversized POST is rejected with 413 and never marks records synced, so
			// the backlog would be retried forever.
			for (let start = 0; start < unsynced.length; start += MAX_PUSH_BATCH) {
				const batch = unsynced.slice(start, start + MAX_PUSH_BATCH);

				const response = await fetch('/api/recommendations/sync', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ recommendations: batch })
				});

				if (!response.ok) {
					const errorText = await response.text();
					console.error('Sync failed:', response.status, errorText);
					throw new Error(`Sync failed: ${response.statusText}`);
				}

				const result = await response.json();

				// Mark successfully synced items — only if unchanged since upload
				// (an edit made while the POST was in flight must stay unsynced)
				if (result.synced && result.synced.length > 0) {
					const versions: Array<{ id: string; updated_at: number }> = [];
					for (const id of result.synced as string[]) {
						const updated_at = sentVersions.get(id);
						if (updated_at !== undefined) versions.push({ id, updated_at });
					}
					await dbOperations.markSyncedIfUnchanged(versions);
				}

				// Mark failed items with errors
				if (result.errors && result.errors.length > 0) {
					console.warn(`Failed to sync ${result.errors.length} recommendations:`, result.errors);
					for (const error of result.errors) {
						await dbOperations.markSyncError(error.id, error.message);
					}
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

			// Drain the server page by page. The route returns at most PULL_PAGE_SIZE
			// rows in ascending updated_at order, so advancing the watermark to the
			// newest row of each page makes forward progress instead of skipping the
			// rows that did not fit in a truncated page. Stop when a short page (or a
			// page that makes no progress) confirms the backlog is drained.
			let cursor = lastSync;
			for (;;) {
				const response = await fetch(`/api/recommendations?since=${cursor}`);
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

				// Advance the pull watermark using server data, not the local clock:
				// client clocks are unreliable and the query executed earlier than "now".
				// Re-fetching rows at the watermark is harmless; missing rows is not.
				const serverMax = serverRecs.reduce((max, r) => Math.max(max, r.updated_at), cursor);
				this.setLastPulledAt(userId, serverMax);

				// A short page means the server has no more rows for this cursor; stop.
				if (serverRecs.length < PULL_PAGE_SIZE || serverMax <= cursor) {
					break;
				}
				cursor = serverMax;
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
	async fullSync(userId: string, forceFull: boolean = false): Promise<{ success: boolean; error?: string }> {
		const pullResult = await this.pullFromServer(userId, forceFull);
		if (!pullResult.success) {
			return pullResult;
		}

		return this.syncToServer(userId);
	}
}

export const syncService = new SyncService();
