# Core Features:
- Simple, secure passkey login
- Add a recommendation for a category (Movies, Shows, YouTube Videos, Podcasts, Artists, Songs, Genres, Restaurants, Recipes, Cuisines, Activities, Video Games, Board Games, Books, Graphic Novels, Quotes)
- Category-aware search suggestions with autocomplete using external APIs (e.g., TMDB for movies/shows, Spotify for music, YouTube API, Google Books API, etc.)
- Save recommendation entries enriched with relevant metadata:
  - Movies/Shows → Rotten Tomatoes/IMDb score, poster, streaming links
  - Music → Spotify/Apple Music links, album art
  - YouTube → video thumbnail, URL
  - Restaurants → Google Maps or Yelp link, location
  - Books → ISBN, Goodreads or Google Books link
- View and search your saved recommendations quickly
- Recommendations are private by default
- Should support local first saving via index db before syncing, with clear UI feedback in case of failure
- AI should assist in categorising and tagging free form text input
- Share or export a recommendation easily (copy link/share sheet)
- Multi-device sync via same user ID

# Platform & Stack:
- Use SvelteKit with TypeScript
- Deploy and host entirely on Cloudflare (Pages, D1 for database, KV and Durable Objects for caching/sessions if needed)
- Authentication via passkey login primarily with fallback to email magic link via Cloudflare Access
- Use Cloudlfare Workers AI integration for external data enrichment where appropriate
- Use TailwindCSS for styling, with a minimalist, mobile-first UI
- Use Shadcn/ui or custom lightweight components for polished UX
- Use iconography from Lucide