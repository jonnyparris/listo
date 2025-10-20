import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Admin endpoint to merge duplicate user accounts that share the same passkey credential.
 * This happens when someone clicked "Sign Up" multiple times in different browsers
 * before the fix was deployed.
 *
 * For each duplicate credential:
 * 1. Keep the oldest user account (earliest created_at)
 * 2. Migrate all recommendations from duplicate users to the primary user
 * 3. Delete duplicate credential records
 * 4. Delete duplicate user records
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const { adminKey } = await request.json();

		// Simple admin key check (you should set this in your environment)
		if (!adminKey || adminKey !== platform.env.ADMIN_KEY) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Find all duplicate credentials (same credential_id with different user_ids)
		const duplicates = await platform.env.DB.prepare(`
			SELECT
				c.id as credential_id,
				GROUP_CONCAT(c.user_id) as user_ids
			FROM credentials c
			GROUP BY c.id
			HAVING COUNT(DISTINCT c.user_id) > 1
		`).all();

		const mergedUsers: string[] = [];
		const errors: Array<{ credential: string; error: string }> = [];

		for (const dup of duplicates.results) {
			try {
				const credentialId = dup.credential_id as string;
				const userIds = (dup.user_ids as string).split(',');

				// Find the primary user (oldest created_at)
				const primaryUserResult = await platform.env.DB.prepare(`
					SELECT id, created_at
					FROM users
					WHERE id IN (${userIds.map(() => '?').join(',')})
					ORDER BY created_at ASC
					LIMIT 1
				`).bind(...userIds).first();

				if (!primaryUserResult) {
					throw new Error('Could not find primary user');
				}

				const primaryUserId = primaryUserResult.id as string;
				const duplicateUserIds = userIds.filter(id => id !== primaryUserId);

				// Migrate recommendations from each duplicate to primary
				for (const dupUserId of duplicateUserIds) {
					await platform.env.DB.prepare(`
						UPDATE recommendations
						SET user_id = ?
						WHERE user_id = ?
					`).bind(primaryUserId, dupUserId).run();
				}

				// Delete duplicate credentials (keep only one for primary user)
				for (const dupUserId of duplicateUserIds) {
					await platform.env.DB.prepare(`
						DELETE FROM credentials
						WHERE id = ? AND user_id = ?
					`).bind(credentialId, dupUserId).run();
				}

				// Delete duplicate user records
				for (const dupUserId of duplicateUserIds) {
					await platform.env.DB.prepare(`
						DELETE FROM users WHERE id = ?
					`).bind(dupUserId).run();
					
					mergedUsers.push(dupUserId);
				}

			} catch (error) {
				console.error(`Error processing credential ${dup.credential_id}:`, error);
				errors.push({
					credential: dup.credential_id as string,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		}

		return json({
			success: true,
			mergedCount: mergedUsers.length,
			mergedUsers,
			errors,
			message: `Successfully merged ${mergedUsers.length} duplicate user accounts`
		});

	} catch (error) {
		console.error('Migration error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Migration failed' },
			{ status: 500 }
		);
	}
};
