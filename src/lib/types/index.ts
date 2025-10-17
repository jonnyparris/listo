export type Category =
	| 'movie'
	| 'show'
	| 'youtube'
	| 'podcast'
	| 'artist'
	| 'song'
	| 'genre'
	| 'restaurant'
	| 'recipe'
	| 'cuisine'
	| 'activity'
	| 'video-game'
	| 'board-game'
	| 'book'
	| 'graphic-novel'
	| 'quote';

export interface User {
	id: string;
	created_at: number;
	updated_at: number;
}

export interface Recommendation {
	id: string;
	user_id: string;
	category: Category;
	title: string;
	description?: string;
	metadata?: RecommendationMetadata;
	tags?: string;
	created_at: number;
	updated_at: number;
	deleted_at?: number;
	completed_at?: number;
	review?: string;
	rating?: number; // 1-5 stars
}

// Metadata types for different categories
export interface MovieMetadata {
	type: 'movie';
	tmdb_id?: number;
	poster_url?: string;
	imdb_rating?: number;
	rt_score?: number;
	streaming_links?: string[];
	year?: number;
	genres?: string[];
}

export interface ShowMetadata {
	type: 'show';
	tmdb_id?: number;
	poster_url?: string;
	imdb_rating?: number;
	rt_score?: number;
	streaming_links?: string[];
	year?: number;
	genres?: string[];
}

export interface YouTubeMetadata {
	type: 'youtube';
	video_id?: string;
	thumbnail_url?: string;
	channel?: string;
	url?: string;
}

export interface BookMetadata {
	type: 'book';
	isbn?: string;
	cover_url?: string;
	author?: string;
	goodreads_link?: string;
	google_books_link?: string;
}

export interface MusicMetadata {
	type: 'music';
	spotify_link?: string;
	apple_music_link?: string;
	album_art?: string;
	artist?: string;
}

export interface RestaurantMetadata {
	type: 'restaurant';
	location?: string;
	google_maps_link?: string;
	yelp_link?: string;
	cuisine?: string;
}

export type RecommendationMetadata =
	| MovieMetadata
	| ShowMetadata
	| YouTubeMetadata
	| BookMetadata
	| MusicMetadata
	| RestaurantMetadata;

// Local storage types (IndexedDB via Dexie)
export interface LocalRecommendation extends Recommendation {
	synced: boolean; // Whether synced to D1
	sync_error?: string; // Error message if sync failed
}
