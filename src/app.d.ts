// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			user?: {
				id: string;
			};
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				AI: any; // Cloudflare Workers AI
				TMDB_API_KEY?: string;
				YOUTUBE_API_KEY?: string;
				SPOTIFY_CLIENT_ID?: string;
				SPOTIFY_CLIENT_SECRET?: string;
			};
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
