/**
 * Minimal fixed-window rate limiter backed by D1.
 *
 * Used to protect costly endpoints (Workers AI, third-party enrichment APIs)
 * that were previously callable unauthenticated at unlimited volume.
 */
import type { RequestEvent } from '@sveltejs/kit';

/** Structural subset of the D1 binding we need (avoids importing workers-types
 *  globally, which would change `Response.json()` typing across the app). */
interface D1PreparedStatementLike {
	bind(...values: unknown[]): {
		first<T = unknown>(): Promise<T | null>;
		run(): Promise<unknown>;
	};
}
interface D1DatabaseLike {
	prepare(query: string): D1PreparedStatementLike;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
}

export async function checkRateLimit(
	db: D1DatabaseLike,
	key: string,
	max: number,
	windowSeconds: number
): Promise<RateLimitResult> {
	const result = await db
		.prepare(
			`INSERT INTO rate_limits (key, window_start, count) VALUES (?, unixepoch(), 1)
			ON CONFLICT(key) DO UPDATE SET
				count = CASE WHEN rate_limits.window_start <= unixepoch() - ${windowSeconds}
					THEN 1 ELSE rate_limits.count + 1 END,
				window_start = CASE WHEN rate_limits.window_start <= unixepoch() - ${windowSeconds}
					THEN unixepoch() ELSE rate_limits.window_start END
			RETURNING count`
		)
		.bind(key)
		.first<{ count: number }>();

	const count = result?.count ?? 1;
	return { allowed: count <= max, remaining: Math.max(0, max - count) };
}

/**
 * Best-effort client identity for rate limiting (Cloudflare provides
 * CF-Connecting-IP; fall back to the socket address).
 */
export function clientKey(event: RequestEvent, scope: string): string {
	const ip =
		event.request.headers.get('cf-connecting-ip') ||
		event.request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
		'unknown';
	return `${scope}:${ip}`;
}
