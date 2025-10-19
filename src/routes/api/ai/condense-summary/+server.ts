import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env?.AI) {
		return json({ error: 'AI not available' }, { status: 500 });
	}

	try {
		const { text } = await request.json();

		if (!text || typeof text !== 'string' || text.trim().length === 0) {
			return json({ error: 'Text is required' }, { status: 400 });
		}

		const cleanText = text
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
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to condense text' },
			{ status: 500 }
		);
	}
};
