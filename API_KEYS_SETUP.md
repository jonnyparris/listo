# API Keys Setup Guide

This guide explains how to configure external API integrations for Listo's enrichment features.

## Overview

Listo supports several external APIs to enrich your recommendations with metadata, images, and additional information. Some APIs require API keys, while others are free to use without authentication.

## Required vs Optional APIs

### Free (No API Key Required) ✅
- **Google Books API** - Book and graphic novel metadata
  - Used for: Books, Graphic Novels
  - No setup required!

### Optional (Requires API Key) 🔑
- **TMDB (The Movie Database)** - Movie and TV show metadata
  - Used for: Movies, TV Shows
  - Provides: Posters, descriptions, genres, ratings, release dates

- **YouTube Data API** - Video metadata
  - Used for: YouTube videos
  - Provides: Thumbnails, descriptions, view counts, durations

- **Spotify Web API** - Music metadata
  - Used for: Artists, Songs, Genres
  - Provides: Album art, artist info, Spotify links, popularity scores

- **OMDb API** - Additional movie/show ratings (optional)
  - Used for: Movies, TV Shows (Rotten Tomatoes ratings)
  - Provides: Rotten Tomatoes scores, additional metadata
  - Note: Requires TMDB API to be configured first

## Setup Instructions

### 1. TMDB API Key

**Get your API key:**
1. Visit [TMDB](https://www.themoviedb.org/)
2. Create a free account
3. Go to Settings → API
4. Request an API key (choose "Developer" option)
5. Fill out the application form (personal use is fine)
6. Copy your API key

**Add to your project:**
```bash
# Create or edit .env file in the project root
echo "TMDB_API_KEY=your_api_key_here" >> .env
```

### 2. YouTube Data API Key

**Get your API key:**
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the YouTube Data API v3
   - Go to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"
4. Create credentials
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy your API key
5. (Optional but recommended) Restrict the API key
   - Click on the key you just created
   - Under "API restrictions", select "Restrict key"
   - Select only "YouTube Data API v3"
   - Save

**Add to your project:**
```bash
# Add to .env file
echo "YOUTUBE_API_KEY=your_api_key_here" >> .env
```

### 3. Spotify Web API Credentials

**Get your credentials:**
1. Visit [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create app"
4. Fill out the application form:
   - App name: "Listo" (or your preferred name)
   - App description: "Personal recommendation tracker"
   - Redirect URI: Not needed for this integration
   - Select "Web API" as API to use
5. Accept the terms and click "Create"
6. Copy your Client ID and Client Secret

**Add to your project:**
```bash
# Add to .env file
echo "SPOTIFY_CLIENT_ID=your_client_id_here" >> .env
echo "SPOTIFY_CLIENT_SECRET=your_client_secret_here" >> .env
```

### 4. OMDb API Key (Optional - for Rotten Tomatoes Ratings)

**Get your API key:**
1. Visit [OMDb API](https://www.omdbapi.com/apikey.aspx)
2. Choose the free tier (1,000 requests per day)
3. Enter your email address
4. Verify your email
5. Copy your API key from the verification email

**Add to your project:**
```bash
# Add to .env file
echo "OMDB_API_KEY=your_api_key_here" >> .env
```

**What this enables:**
- Rotten Tomatoes scores on movie and TV show cards
- Additional metadata from IMDb/OMDb
- Works alongside TMDB (both APIs needed)

### 5. Environment File Template

Create a `.env` file in your project root with the following structure:

```env
# TMDB (The Movie Database)
# Get your key at: https://www.themoviedb.org/settings/api
TMDB_API_KEY=your_tmdb_api_key_here

# YouTube Data API
# Get your key at: https://console.cloud.google.com/
YOUTUBE_API_KEY=your_youtube_api_key_here

# Spotify Web API
# Get your credentials at: https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here

# OMDb API (Optional - for Rotten Tomatoes ratings)
# Get your key at: https://www.omdbapi.com/apikey.aspx
OMDB_API_KEY=your_omdb_api_key_here
```

## Deployment (Cloudflare Pages)

For production deployment, you'll need to add these environment variables to your Cloudflare Pages project:

1. Go to your Cloudflare dashboard
2. Navigate to Pages → Your project → Settings → Environment variables
3. Add each API key/credential:
   - Variable name: `TMDB_API_KEY`
   - Value: Your TMDB API key
   - Variable name: `YOUTUBE_API_KEY`
   - Value: Your YouTube API key
   - Variable name: `SPOTIFY_CLIENT_ID`
   - Value: Your Spotify Client ID
   - Variable name: `SPOTIFY_CLIENT_SECRET`
   - Value: Your Spotify Client Secret
   - Variable name: `OMDB_API_KEY` (optional)
   - Value: Your OMDb API key
4. Save and redeploy

## Feature Availability Without API Keys

| Feature | Without API Key | With API Key |
|---------|----------------|--------------|
| Movies/Shows autocomplete | ❌ Manual entry only | ✅ Search TMDB database |
| Rotten Tomatoes ratings | ❌ Not available | ✅ With OMDb API key |
| YouTube autocomplete | ❌ Manual entry only | ✅ Search videos |
| Music autocomplete | ❌ Manual entry only | ✅ Search Spotify |
| Books autocomplete | ✅ Works perfectly! | ✅ Works perfectly! |
| Add recommendations | ✅ All categories work | ✅ All categories work |
| Local storage | ✅ Full functionality | ✅ Full functionality |
| Sync to cloud | ✅ Full functionality | ✅ Full functionality |

## Troubleshooting

### "TMDB API error: Unauthorized"
- Check that your API key is correctly set in `.env`
- Verify the key is active in your TMDB account
- Restart your development server after adding the key

### "YouTube API quota exceeded"
- YouTube API has daily quota limits (free tier: 10,000 units/day)
- Each search costs ~100 units
- Reset at midnight Pacific Time
- Consider upgrading your Google Cloud project if needed

### API key not loading
- Ensure `.env` file is in the project root (same level as `package.json`)
- Restart your development server: `npm run dev`
- Check that `.env` is listed in `.gitignore` (do not commit API keys!)

## Security Best Practices

1. **Never commit API keys to version control**
   - `.env` file should be in `.gitignore`
   - Use environment variables for deployment

2. **Restrict API keys**
   - TMDB: Restrict by domain in production
   - YouTube: Restrict to only YouTube Data API v3

3. **Monitor usage**
   - Check your API quotas regularly
   - Set up billing alerts if using paid tiers

4. **Rotate keys if exposed**
   - If you accidentally commit a key, revoke it immediately
   - Generate a new key and update your configuration

## API Usage Costs

All the APIs used in Listo have generous free tiers:

- **TMDB**: Free (no limits for personal use)
- **OMDb**: Free up to 1,000 requests/day
- **YouTube Data API**: Free up to 10,000 units/day
- **Spotify Web API**: Free (no limits for personal use with Client Credentials flow)
- **Google Books**: Free (no API key required)

For typical personal use, you should never need to pay for these APIs.

## Need Help?

If you run into issues setting up API keys:
1. Check the troubleshooting section above
2. Review the server logs for specific error messages
3. Verify your API keys are active in the respective service dashboards
4. File an issue on the GitHub repository with details about your problem

---

**Note**: The app will work perfectly fine without API keys - you just won't get autocomplete suggestions for movies, shows, and YouTube videos. You can still manually enter all recommendation types!
