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

// Category descriptions reused as Jev choice criteria — the same guidance the
// old llama prompt carried, now structured so untrusted text stays in `state`
// instead of being interpolated into a prompt.
const CATEGORY_CRITERIA: Record<Category, string> = {
	series: 'TV shows, series, documentaries',
	movie: 'Films and movies',
	youtube: 'YouTube videos or channels',
	podcast: 'Podcasts and audio content',
	artist: 'Music artists and bands',
	song: 'Individual songs or tracks',
	genre: 'Music genres',
	restaurant: 'Restaurants and dining places',
	recipe: 'Cooking recipes',
	activity: 'Activities, hobbies, things to do',
	'video-game': 'Video games',
	'board-game': 'Board games, card games, tabletop games',
	book: 'Books, novels, non-fiction',
	'graphic-novel': 'Graphic novels, comics, manga',
	quote: 'Quotes, sayings, phrases'
};

interface JevCategoryAnswer {
	choice?: string;
	probabilities?: Record<string, number>;
}

// The AI binding returns a `{ state, result }` envelope whose `result` holds
// `{ answers }`; older deployments returned the flat `{ answers }` shape.
function extractCategoryAnswer(response: unknown): JevCategoryAnswer | null {
	if (!response || typeof response !== 'object') return null;
	const envelope = response as Record<string, unknown>;
	const inner =
		envelope.answers ??
		(envelope.result && typeof envelope.result === 'object'
			? (envelope.result as Record<string, unknown>).answers
			: undefined);
	if (!inner || typeof inner !== 'object') return null;
	const answer = (inner as Record<string, unknown>).category;
	if (!answer || typeof answer !== 'object') return null;
	return answer as JevCategoryAnswer;
}

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

		// Cap input size: bounds the request payload
		const trimmedText = text.trim().slice(0, 1000);

		// Calibrated classification: Jev scores every category and returns
		// probabilities, so the UI knows when to trust the pick.
		const response = await platform.env.AI.run('typesafe/jev', {
			state: { text: trimmedText },
			questions: {
				category: {
					type: 'choice',
					instructions:
						'Which category best describes the recommendation in `text`? Judge by what kind of thing it names, not by titles of existing items.',
					criteria: CATEGORY_CRITERIA
				}
			}
		});

		const answer = extractCategoryAnswer(response);
		const choice = answer?.choice;
		if (!choice || !VALID_CATEGORIES.includes(choice as Category)) {
			return json({ error: 'Failed to suggest category' }, { status: 500 });
		}

		const probabilities = answer?.probabilities ?? {};
		const alternatives = Object.entries(probabilities)
			.map(([category, probability]) => ({ category, probability }))
			.filter((a) => a.category !== choice && VALID_CATEGORIES.includes(a.category as Category))
			.sort((a, b) => b.probability - a.probability)
			.slice(0, 3);

		return json({
			category: choice,
			confidence: answer?.probabilities?.[choice] ?? 0,
			alternatives
		});
	} catch (error) {
		console.error('AI suggestion error:', error);
		return json({ error: 'Failed to suggest category' }, { status: 500 });
	}
};
