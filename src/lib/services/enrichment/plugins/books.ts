import type { Category, RecommendationMetadata } from '$lib/types';
import type { EnrichmentPlugin, EnrichmentResult, SearchSuggestion } from '../types';

export class BooksPlugin implements EnrichmentPlugin {
	name = 'Google Books';
	supportedCategories: Category[] = ['book', 'graphic-novel'];

	private baseUrl = 'https://www.googleapis.com/books/v1';

	async search(query: string): Promise<SearchSuggestion[]> {
		try {
			const response = await fetch(
				`${this.baseUrl}/volumes?q=${encodeURIComponent(query)}&maxResults=5&printType=books`
			);

			if (!response.ok) {
				console.error(`Google Books API error (${response.status})`);
				return [];
			}

			const data = await response.json();

			if (!data.items) {
				return [];
			}

			return data.items.map((item: any) => ({
				id: item.id,
				title: item.volumeInfo.title,
				subtitle: item.volumeInfo.authors?.join(', ') || undefined,
				thumbnail: item.volumeInfo.imageLinks?.thumbnail || undefined,
				year: item.volumeInfo.publishedDate
					? new Date(item.volumeInfo.publishedDate).getFullYear()
					: undefined
			}));
		} catch (error) {
			console.error('Google Books search error:', error);
			return [];
		}
	}

	async enrich(id: string): Promise<EnrichmentResult> {
		try {
			const response = await fetch(`${this.baseUrl}/volumes/${id}`);

			if (!response.ok) {
				console.error(`Google Books API error (${response.status})`);
				return {
					success: false,
					error: 'Failed to fetch book details'
				};
			}

			const data = await response.json();
			const info = data.volumeInfo;

			const metadata: RecommendationMetadata = {
				type: 'book',
				google_books_id: id,
				title: info.title,
				authors: info.authors,
				publisher: info.publisher,
				year: info.publishedDate ? new Date(info.publishedDate).getFullYear() : undefined,
				isbn: info.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13')?.identifier,
				page_count: info.pageCount,
				categories: info.categories,
				description: info.description,
				thumbnail_url: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail,
				preview_link: info.previewLink,
				rating: info.averageRating
			};

			return {
				success: true,
				metadata
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}
}
