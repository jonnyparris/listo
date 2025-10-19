import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Proxy endpoint to fetch images from external URLs and return them as blobs
 * This avoids CORS issues when sharing images
 */
export const GET: RequestHandler = async ({ url }) => {
	const imageUrl = url.searchParams.get('url');

	if (!imageUrl) {
		throw error(400, 'Missing image URL parameter');
	}

	try {
		// Validate URL
		new URL(imageUrl);

		// Fetch the image
		const response = await fetch(imageUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; Listo/1.0)',
			},
		});

		if (!response.ok) {
			throw error(response.status, `Failed to fetch image: ${response.statusText}`);
		}

		// Get the blob and content type
		const blob = await response.blob();
		const contentType = response.headers.get('content-type') || 'image/jpeg';

		// Return the image with appropriate headers
		return new Response(blob, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
				'Access-Control-Allow-Origin': '*', // Allow CORS
			},
		});
	} catch (err) {
		console.error('Image proxy error:', err);
		if (err instanceof Error) {
			throw error(500, `Failed to proxy image: ${err.message}`);
		}
		throw error(500, 'Failed to proxy image');
	}
};
