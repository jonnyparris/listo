import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Proxy endpoint for external images (avoids CORS issues when sharing).
 *
 * Hardened: without restrictions this endpoint is an SSRF/open proxy — it would
 * fetch any URL (including internal services) and relay any content type with
 * `Access-Control-Allow-Origin: *`.
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_HOSTS = new Set([
	// TMDB posters/stills
	'image.tmdb.org',
	// YouTube thumbnails/avatars
	'i.ytimg.com',
	'img.youtube.com',
	'yt3.ggpht.com',
	'yt3.googleusercontent.com',
	// Spotify artwork
	'i.scdn.co',
	'mosaic.scdn.co',
	'thisis-images.scdn.co',
	// Google Books covers
	'books.google.com'
]);

function isAllowedImageUrl(value: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		return false;
	}
	return parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.hostname);
}

async function fetchValidatedImage(imageUrl: string): Promise<Response> {
	// redirect: 'manual' so a host on the allowlist can't bounce us somewhere else
	let response = await fetch(imageUrl, {
		headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Listo/1.0)' },
		redirect: 'manual'
	});

	if (response.status >= 300 && response.status < 400) {
		const location = response.headers.get('location');
		if (!location || !isAllowedImageUrl(new URL(location, imageUrl).href)) {
			throw error(502, 'Image host redirected to a non-allowlisted URL');
		}
		response = await fetch(location, {
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Listo/1.0)' },
			redirect: 'manual'
		});
	}

	if (!response.ok) {
		// Pass the upstream status through (e.g. 404 stays 404)
		throw error(response.status, `Failed to fetch image: ${response.statusText}`);
	}

	const contentType = response.headers.get('content-type') || '';
	if (!contentType.startsWith('image/')) {
		throw error(415, `URL does not point to an image (got ${contentType || 'unknown type'})`);
	}

	const contentLength = Number(response.headers.get('content-length') || '0');
	if (contentLength > MAX_BYTES) {
		throw error(413, 'Image too large');
	}

	return new Response(response.body, {
		headers: {
			'Content-Type': contentType,
			'Content-Security-Policy': "default-src 'none'; sandbox",
			'X-Content-Type-Options': 'nosniff',
			'Cache-Control': 'public, max-age=3600',
			'Access-Control-Allow-Origin': '*'
		}
	});
}

export const GET: RequestHandler = async ({ url }) => {
	const imageUrl = url.searchParams.get('url');

	if (!imageUrl) {
		throw error(400, 'Missing image URL parameter');
	}

	if (!isAllowedImageUrl(imageUrl)) {
		throw error(403, 'Image host not allowed');
	}

	try {
		return await fetchValidatedImage(imageUrl);
	} catch (err) {
		// Re-throw SvelteKit HttpErrors untouched so status codes survive
		if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
			throw err;
		}
		console.error('Image proxy error:', err);
		throw error(502, 'Failed to proxy image');
	}
};
