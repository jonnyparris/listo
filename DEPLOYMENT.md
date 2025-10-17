# Deployment Guide

This guide covers deploying Listo to Cloudflare Pages.

## Current Deployment

**Production URL**: https://listo-a46.pages.dev
**Platform**: Cloudflare Pages
**Account ID**: 4b430e167a301330d13a9bb42f3986a2

## Initial Setup (Already Completed)

The project has been deployed! Here's what was done:

1. ✅ Built production version: `npm run build`
2. ✅ Created Pages project: `wrangler pages project create listo`
3. ✅ Deployed to Cloudflare: `wrangler pages deploy`

## Deploying Updates

To deploy new changes:

```bash
# 1. Build the production version
npm run build

# 2. Deploy to Cloudflare Pages
CLOUDFLARE_ACCOUNT_ID=4b430e167a301330d13a9bb42f3986a2 npx wrangler pages deploy .svelte-kit/cloudflare --project-name=listo
```

Or use the shortcut:

```bash
npm run deploy
```

## Environment Variables Configuration

### Via Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **listo** → **Settings** → **Environment variables**
3. Add the following variables:

**For Production**:
- `TMDB_API_KEY` - Your TMDB API key (optional, for movies/shows autocomplete)
- `YOUTUBE_API_KEY` - Your YouTube API key (optional, for video autocomplete)

### Via Wrangler CLI

```bash
# Set production environment variables
npx wrangler pages secret put TMDB_API_KEY --project-name=listo
npx wrangler pages secret put YOUTUBE_API_KEY --project-name=listo
```

## D1 Database Configuration

The D1 database binding is already configured in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "listo-db"
database_id = "413953c7-19b7-4b63-9e97-ab2973bb08d6"
```

### Initialize D1 Database in Production

If the production database needs to be initialized:

```bash
# Execute schema on production D1
npx wrangler d1 execute listo-db --remote --file=./schema.sql
```

## Verifying Deployment

1. **Check deployment status**:
   ```bash
   npx wrangler pages deployment list --project-name=listo
   ```

2. **View deployment logs**:
   - Go to Cloudflare Dashboard → listo → Deployment logs

3. **Test the live site**:
   - Visit: https://listo-a46.pages.dev
   - Test all features:
     - [ ] Add a recommendation
     - [ ] Search and filter
     - [ ] Complete a recommendation
     - [ ] Dark mode toggle
     - [ ] Share functionality
     - [ ] Keyboard shortcuts
     - [ ] TMDB autocomplete (if API key configured)

## Custom Domain Setup

To add a custom domain:

1. Go to Cloudflare Dashboard → listo → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain name (e.g., `listo.yourdomain.com`)
4. Follow the DNS configuration instructions
5. Wait for SSL certificate provisioning (~24 hours)

## Continuous Deployment

### Option 1: Git Integration (Recommended)

1. Go to Cloudflare Dashboard → listo → **Settings** → **Builds & deployments**
2. Click **Connect to Git**
3. Select your GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `.svelte-kit/cloudflare`
   - **Environment variables**: Add TMDB_API_KEY and YOUTUBE_API_KEY

Now every push to `main` will automatically deploy!

### Option 2: Manual CLI Deployment

Keep using `npm run deploy` whenever you want to push changes.

## Rollback to Previous Deployment

If something goes wrong:

```bash
# List recent deployments
npx wrangler pages deployment list --project-name=listo

# Rollback to a specific deployment
npx wrangler pages deployment tail <deployment-id>
```

Or use the Cloudflare Dashboard:
1. Go to listo → **Deployments**
2. Find the working deployment
3. Click **Promote to production**

## Troubleshooting

### Build Fails

```bash
# Clear build cache and rebuild
rm -rf .svelte-kit node_modules
npm install
npm run build
```

### D1 Database Issues

```bash
# Check D1 database status
npx wrangler d1 info listo-db

# Re-run migrations
npx wrangler d1 execute listo-db --remote --file=./schema.sql
```

### Environment Variables Not Working

1. Verify variables are set: Dashboard → Settings → Environment variables
2. Redeploy after adding variables
3. Check spelling and case sensitivity

### Node.js Compatibility Errors

The `nodejs_compat` flag is already enabled in `wrangler.toml`. If you see Node.js errors:

1. Verify `compatibility_flags = ["nodejs_compat"]` is in wrangler.toml
2. Rebuild and redeploy

## Performance Monitoring

Monitor your deployment:

1. **Analytics**: Dashboard → listo → Analytics
2. **Logs**: Dashboard → listo → Logs
3. **Web Analytics**: Enable in Dashboard → listo → Web Analytics

## Cost Estimation

Listo runs on Cloudflare's free tier:

- ✅ **Pages**: Unlimited requests, 500 builds/month
- ✅ **D1**: 5GB storage, 5 million reads/day (free tier)
- ✅ **Functions**: 100,000 invocations/day (free tier)
- ✅ **Bandwidth**: Unlimited

For typical personal use, Listo should stay well within free tier limits.

## Security Checklist

Before going fully public:

- [ ] Configure proper CORS headers (if needed)
- [ ] Set up rate limiting (if needed)
- [ ] Review and rotate API keys regularly
- [ ] Enable Cloudflare WAF rules (optional)
- [ ] Set up monitoring and alerts

## Support

- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages/
- **SvelteKit Cloudflare Adapter**: https://kit.svelte.dev/docs/adapter-cloudflare
- **Wrangler CLI Docs**: https://developers.cloudflare.com/workers/wrangler/

---

**Deployed**: October 17, 2025
**Status**: ✅ Live and running
