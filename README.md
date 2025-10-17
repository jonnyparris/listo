# Listo

**A minimalist, mobile-first recommendation capture app built with SvelteKit and Cloudflare.**

> *intentional chill*

## Features

- **Simple & Secure**: Passkey login (stubbed for now, ready for WebAuthn)
- **Category-Aware**: Movies, Shows, YouTube, Podcasts, Music, Books, Restaurants, and more
- **Smart Autocomplete**: External API integration (TMDB proof-of-concept included)
- **Local-First**: IndexedDB storage with offline support via Dexie.js
- **Auto-Sync**: Last-write-wins conflict resolution with D1
- **Beautiful Design**: Lazy Days aesthetic with calm pastels and thoughtful spacing

## Tech Stack

- **Frontend**: SvelteKit 2 + TypeScript + Tailwind CSS
- **Backend**: Cloudflare Pages + D1 + KV
- **Storage**: IndexedDB (Dexie.js) + D1 (SQLite)
- **APIs**: TMDB (movies/shows), with plugin architecture for others

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

4. **Set up API keys** (optional):

   For TMDB integration (movies/shows autocomplete):
   - Get an API key from [TMDB](https://www.themoviedb.org/settings/api)
   - Update `wrangler.toml`:
     ```toml
     [vars]
     TMDB_API_KEY = "your_tmdb_api_key_here"
     ```

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

## TODOs

### High Priority
- [ ] Implement WebAuthn passkey authentication
- [ ] Add API endpoints for D1 sync (`/api/recommendations/sync`)
- [ ] Implement search/filter UI
- [ ] Add autocomplete with TMDB integration
- [ ] Build detail view for recommendations
- [ ] Add delete/edit functionality

### Medium Priority
- [ ] Implement additional enrichment plugins:
  - [ ] YouTube Data API
  - [ ] Spotify API
  - [ ] Google Books API
  - [ ] Google Places API (restaurants)
- [ ] Add dark mode toggle
- [ ] Implement sharing functionality
- [ ] Add export feature (JSON, CSV)

### Low Priority
- [ ] Unit tests (Vitest)
- [ ] E2E tests
- [ ] CI/CD pipeline
- [ ] Performance monitoring
- [ ] Analytics (privacy-focused)

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
