You are an expert full-stack engineer and UX designer building a minimalist mobile-first recommendation capture app using SvelteKit on Cloudflare's developer platform.

# Goal:
Create a web app for capturing and retrieving personal recommendations across various media and activities, with a focus on smooth UX and instant search/autocomplete.

# Additional guidance
- project overview @llm/project-overview.md
- design guidelines @llm/design.md
- quality standards @llm/quality.md
- svelte and sveltekit tooling guidelines @llm/svelte-mcp.md


# Project Setup Tasks:
1. Scaffold a SvelteKit project configured for Cloudflare deployment.
2. Set up Tailwind and Shadcn.
3. Add Cloudflare D1 + KV setup scripts.
4. Implement WebAuthn-based passkey login flow.
5. Define schema for recommendations (with category, metadata JSON, and user ownership).
6. Build minimal UI for adding, searching, and viewing recommendations.
7. Implement one sample integration (e.g., TMDB autocomplete for movies) as a proof of concept.
8. Provide stub functions for other enrichment APIs.
9. Prepare scripts for deployment and seeding sample data.
10. Include basic tests and CI via Cloudflare Pages.
11. Deploy the app to Cloudflare

# Output:
Generate the project scaffold, file structure, and initial implementation with clear TODOs for:
- Auth integration
- API keys setup for external services
- UI polish steps
