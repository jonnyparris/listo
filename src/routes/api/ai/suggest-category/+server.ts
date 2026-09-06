import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Category } from '$lib/types';
import { checkRateLimit, clientKey } from '$lib/server/ratelimit';

const VALID_CATEGORIES: Category[] = [
	'series',
	'movie',
	'youtube',
	'podcast',
	'artist',
	'song',
	'genre',
	'restaurant',
	'recipe',
	'activity',
	'video-game',
	'board-game',
	'book',
	'graphic-novel',
	'quote'
];

export const POST: RequestHandler = async (event) => {
	const { request, platform } = event;
	if (!platform?.env?.AI || !platform.env.DB) {
		return json({ error: 'AI not available' }, { status: 500 });
	}

	// Cost control: this endpoint spends Workers AI tokens per call
	const limit = await checkRateLimit(platform.env.DB, clientKey(event, 'ai-suggest'), 20, 60);
	if (!limit.allowed) {
		return json({ error: 'Too many requests' }, { status: 429 });
	}

	try {
		const { text } = await request.json();

		if (!text || typeof text !== 'string' || text.trim().length === 0) {
			return json({ error: 'Text is required' }, { status: 400 });
		}

		// Cap input size: bounds the prompt (and prompt-injection surface)
		const trimmedText = text.trim().slice(0, 1000);

		// Use Cloudflare Workers AI to classify the text
		const prompt = `You are a helpful assistant that categorizes recommendations. Given a text input, determine which category it belongs to.

Valid categories:
- series: For TV shows, series, documentaries
- movie: For films and movies
- youtube: For YouTube videos or channels
- podcast: For podcasts and audio content
- artist: For music artists and bands
- song: For individual songs or tracks
- genre: For music genres
- restaurant: For restaurants and dining places
- recipe: For cooking recipes
- activity: For activities, hobbies, things to do
- video-game: For video games
- board-game: For board games, card games, tabletop games
- book: For books, novels, non-fiction
- graphic-novel: For graphic novels, comics, manga
- quote: For quotes, sayings, phrases

Input text: "${trimmedText}"

Respond with ONLY the category name from the list above, nothing else.`;

		const response = await platform.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
			messages: [{ role: 'user', content: prompt }]
		});

		// Extract the category from the response
		let suggestedCategory = response.response?.trim().toLowerCase();

		// Validate and clean up the response
		if (suggestedCategory && VALID_CATEGORIES.includes(suggestedCategory as Category)) {
			return json({ category: suggestedCategory });
		}

		// If invalid, try to find a match in the response
		for (const cat of VALID_CATEGORIES) {
			if (suggestedCategory?.includes(cat)) {
				return json({ category: cat });
			}
		}

		// Default fallback
		return json({ category: 'activity' });
	} catch (error) {
		console.error('AI suggestion error:', error);
		return json({ error: 'Failed to suggest category' }, { status: 500 });
	}
};
