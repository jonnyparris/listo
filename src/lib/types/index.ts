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
	source?: string; // Where the recommendation came from (e.g., "friend", "podcast", "article")
	created_at: number;
	updated_at: number;
	deleted_at?: number;
	completed_at?: number;
	review?: string;
	rating?: number; // 1-5 stars
}

// Base metadata interface with common fields
interface BaseMetadata {
	year?: number;
	genres?: string[];
	overview?: string;
	description?: string;
	runtime?: number;
	rating?: number;
	poster_url?: string;
	thumbnail_url?: string;
	cover_url?: string;
	album_art?: string;
	spotify_url?: string;
	youtube_url?: string;
	google_maps_link?: string;
}

// Metadata types for different categories
export interface MovieMetadata extends BaseMetadata {
	type: 'movie';
	tmdb_id?: number;
	imdb_rating?: number;
	rt_score?: number;
	streaming_links?: string[];
}

export interface ShowMetadata extends BaseMetadata {
	type: 'show';
	tmdb_id?: number;
	imdb_rating?: number;
	rt_score?: number;
	streaming_links?: string[];
}

export interface YouTubeMetadata extends BaseMetadata {
	type: 'youtube';
	video_id?: string;
	channel?: string;
	url?: string;
}

export interface BookMetadata extends BaseMetadata {
	type: 'book';
	isbn?: string;
	author?: string;
	goodreads_link?: string;
	google_books_link?: string;
}

export interface MusicMetadata extends BaseMetadata {
	type: 'music';
	spotify_link?: string;
	apple_music_link?: string;
	artist?: string;
}

export interface RestaurantMetadata extends BaseMetadata {
	type: 'restaurant';
	location?: string;
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
