# Listo - Intentional Chill

**A minimalist, mobile-first recommendation tracker built with SvelteKit and deployed on Cloudflare's developer platform.**

> *intentional chill*

## Features

### Core Functionality ✅
- 📝 **Quick Capture** - Add recommendations across 16 categories
- 🔍 **Smart Search** - Filter by category, keyword, or genre
- ✅ **Completion Tracking** - Mark items as completed with ratings and reviews
- 🎨 **Dark Mode** - Beautiful light and dark themes
- 📱 **Mobile First** - Optimized for phones with full desktop support
- ⌨️ **Keyboard Shortcuts** - Navigate without touching the mouse

### Smart Enrichment ✨
Automatic metadata enrichment with:
- **TMDB** for movies and TV shows (posters, descriptions, genres, ratings)
- **YouTube API** for video information (thumbnails, durations, view counts)
- **Spotify** for music (album art, artist info, Spotify links)
- **Google Books** for book metadata (no API key required!)
- **AI Category Suggestion** - Cloudflare Workers AI automatically suggests categories from freeform text

### Local-First Architecture 💾
- **IndexedDB Storage** - Works offline, syncs when online
- **Session-Only Mode** - Use without an account, data stays local
- **Optional Authentication** - Sign in with passkeys to sync across devices
- **Cloud Sync** - Optional backup to Cloudflare D1 (requires authentication)
- **Instant Updates** - No waiting for server responses

### UX Polish ✨
- 🎯 **Toast Notifications** - Clear feedback on all actions
- 🎭 **Custom Modals** - Smooth confirmation dialogs
- 📤 **Native Sharing** - Share recommendations via Web Share API
- ✏️ **Input Validation** - Prevents empty or invalid entries
- 🎬 **Smooth Animations** - Polished transitions throughout
- 🗑️ **Data Control** - Purge all data with double-confirmation safety
- 📥 **Import/Export** - Backup and restore your recommendations as JSON
- ℹ️ **About Page** - Learn about intentional chill philosophy
- 🤖 **AI-Powered** - Smart category suggestions using Cloudflare Workers AI

## Tech Stack

- **Frontend**: SvelteKit 2 + TypeScript + Tailwind CSS
- **Backend**: Cloudflare Pages + D1 + Workers AI
- **Storage**: IndexedDB (Dexie.js) + D1 (SQLite)
- **Authentication**: WebAuthn (Passkeys) via SimpleWebAuthn
- **APIs**: TMDB (movies/shows), YouTube, Spotify, Google Books
- **AI**: Cloudflare Workers AI (Llama 3.1 8B for category classification)

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account (for deployment)

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Authenticate with Cloudflare**:
   ```bash
   npx wrangler login
   ```

3. **Run setup script** (automated setup):
   ```bash
   ./setup.sh
   ```

   Or do it manually:

   ```bash
   # Create D1 database
   npx wrangler d1 create listo-db

   # Copy database_id from output and update wrangler.toml
   # Then initialize schema:
   npx wrangler d1 execute listo-db --local --file=./schema.sql
   npx wrangler d1 execute listo-db --remote --file=./schema.sql
   ```

4. **Set up API keys** (optional - app works great without them!):

   See [API_KEYS_SETUP.md](./API_KEYS_SETUP.md) for detailed instructions on:
   - Getting TMDB API key (movies/shows autocomplete)
   - Getting YouTube API key (video autocomplete)
   - Setting up environment variables
   - Deployment configuration

5. **Start development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deployment

### Deploy to Cloudflare Pages

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy via Wrangler**:
   ```bash
   npx wrangler pages deploy .svelte-kit/cloudflare
   ```

   Or connect to GitHub and let Cloudflare Pages auto-deploy:

   - Push your code to GitHub
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to **Workers & Pages** → **Create application** → **Pages**
   - Connect your GitHub repository
   - Build settings:
     - **Build command**: `npm run build`
     - **Build output directory**: `.svelte-kit/cloudflare`
   - Add environment variables:
     - `TMDB_API_KEY` (if using TMDB integration)
   - Deploy!

### Set up D1 Binding in Production

In Cloudflare Dashboard, add the D1 database binding to your Pages project:
- Go to **Settings** → **Functions** → **D1 database bindings**
- Add binding:
  - **Variable name**: `DB`
  - **D1 database**: Select `listo-db`

## Project Structure

```
listo/
├── src/
│   ├── lib/
│   │   ├── components/ui/    # Reusable UI components
│   │   ├── db/               # Dexie.js local database
│   │   ├── services/
│   │   │   ├── enrichment/   # API integration plugins
│   │   │   └── sync.ts       # Sync service
│   │   ├── server/
│   │   │   └── auth.ts       # Authentication (stubbed)
│   │   └── types/            # TypeScript types
│   ├── routes/
│   │   └── +page.svelte      # Homepage
│   ├── app.css               # Global styles
│   └── hooks.server.ts       # Server hooks
├── schema.sql                # D1 database schema
├── wrangler.toml             # Cloudflare configuration
└── tailwind.config.js        # Tailwind configuration
```

## Categories Supported

Movies • TV Shows • YouTube Videos • Podcasts • Artists • Songs • Music Genres • Restaurants • Recipes • Cuisines • Activities • Video Games • Board Games • Books • Graphic Novels • Quotes

## Keyboard Shortcuts

Press `?` anywhere in the app to see all available shortcuts:

**General**
- `?` - Show keyboard shortcuts help
- `Esc` - Close dialogs/forms
- `/` - Focus search
- `T` - Toggle between active and completed

**Recommendations**
- `N` - New recommendation
- `↑/↓` - Navigate cards
- `Enter` - Complete/uncomplete selected
- `E` - Edit selected
- `D` - Delete selected

**Forms**
- `⌘/Ctrl + S` - Save form
- `⌘/Ctrl + Enter` - Save from textarea

## Roadmap

See [llm/todos.md](./llm/todos.md) for detailed progress tracking.

**Completed** ✅
- Core CRUD operations with local-first storage
- Search and filtering by category/keyword/genre
- Smart autocomplete for movies, shows, books, YouTube, and music (Spotify)
- Cloud sync with Cloudflare D1 (optional)
- WebAuthn passkey authentication (optional)
- Session-only mode for use without account
- Dark mode with localStorage persistence
- Keyboard shortcuts for power users
- Share functionality with Web Share API
- Toast notifications and custom modals
- Input validation and error handling
- Purge all data feature with double-confirmation
- Import/export functionality (JSON)
- AI-powered category suggestions using Cloudflare Workers AI
- About page explaining intentional chill philosophy
- Safari compatibility improvements
- Performance optimizations

**Future Ideas** 💭
- Unit and E2E tests
- Additional enrichment plugins (Google Places for restaurants)
- Collaborative lists and social features
- CSV export option
- Browser extension for quick captures
- Bulk editing and batch operations

## Design System

### Colors (Lazy Days Palette)
- **Primary**: `#BFE3D0` (seafoam)
- **Secondary**: `#F2C6A0` (peach)
- **Background Light**: `#FDFBF7`
- **Background Dark**: `#2C2C2B`

### Fonts
- **Primary**: Inter (Sans)
- **Accent**: Fraunces (Serif)

### Principles
- Mobile-first responsive design
- Generous spacing (16-24px grid)
- Rounded corners (2xl = 16-20px)
- Soft shadows, never harsh
- Smooth transitions (200-300ms)

## Contributing

This is a personal project, but feel free to fork and adapt it for your own use!

## License

MIT
