import { json, type RequestHandler } from '@sveltejs/kit';
import { checkRateLimit, clientKey } from '$lib/server/ratelimit';

export const POST: RequestHandler = async (event) => {
	const { request, platform } = event;
	if (!platform?.env?.AI || !platform.env.DB) {
		return json({ error: 'AI not available' }, { status: 500 });
	}

	// Cost control: this endpoint spends Workers AI tokens per call
	const limit = await checkRateLimit(platform.env.DB, clientKey(event, 'ai-condense'), 10, 60);
	if (!limit.allowed) {
		return json({ error: 'Too many requests' }, { status: 429 });
	}

	try {
		const { text } = await request.json();

		if (!text || typeof text !== 'string' || text.trim().length === 0) {
			return json({ error: 'Text is required' }, { status: 400 });
		}

		const cleanText = text
			.slice(0, 5000) // bound prompt size and abuse surface
			.replace(/<[^>]*>/g, '')
			.replace(/&[a-z]+;/gi, ' ')
			.trim();

		if (cleanText.length <= 156) {
			return json({ condensed: cleanText });
		}

		const prompt = `Condense the following text to 156 characters or less while preserving the key information. Return ONLY the condensed text, no explanations or extra text:

${cleanText}`;

		const response = await platform.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
			messages: [{ role: 'user', content: prompt }]
		});

		let condensed = response.response?.trim() || '';
		
		condensed = condensed
			.replace(/<[^>]*>/g, '')
			.replace(/&[a-z]+;/gi, ' ')
			.replace(/^["']|["']$/g, '')
			.trim();

		if (condensed.length > 156) {
			condensed = condensed.substring(0, 153) + '...';
		}

		return json({ condensed });
	} catch (error) {
		console.error('AI condensation error:', error);
		return json({ error: 'Failed to condense text' }, { status: 500 });
	}
};
