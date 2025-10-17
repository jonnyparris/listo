# Completed ✓

- [x] edit and delete recommendations
- [x] update recommendations as completed, with an option to add a review. Reviewed recommendations should be accessible somewhere else
- [x] Wordmark ("Listo") → Cormorant Garamond SemiBold, letter-spacing 0.02em.
- [x] Tagline ("intentional chill") → Inter Regular, font-size: 0.9rem, color #6E6E6B.
- [x] UI Body Text → Inter 400/500, line-height 1.6.
- [x] Headings → Cormorant Garamond 600–700

# Next Up

Priority features for future development:

## High Priority
- [x] uncomplete a recommendation
- [x] Search and filter functionality
- [x] TMDB autocomplete for movies/shows
- [x] API endpoints for D1 sync
- [x] Sync UI with manual sync button
- [x] WebAuthn passkey authentication

## Medium Priority
- [x] Additional enrichment plugins (YouTube, Books via Google Books API - no key needed!)
- [x] Dark mode toggle UI
- [x] Share/export functionality
- [x] Mobile responsiveness improvements
- [x] Keyboard shortcuts
- [x] Full-screen modal for add/edit form
- [x] Logo and favicon
- [x] Autofocus title input when opening add form

## Polish & UX Improvements
- [x] Replace alert() with toast notifications
- [x] Replace confirm() with custom modal dialogs
- [x] Add input validation (don't allow empty titles)
- [ ] Better loading states for autocomplete
- [ ] Improve empty state messaging
- [ ] Add smooth transitions/animations (spring easing)
- [ ] Error boundary for top-level errors

## Low Priority
- [ ] Unit tests
- [ ] E2E tests
- [x] Performance optimization
- [x] Deployment to production
- [x] Documentation for API keys setup

# More considerations (Completed!)
- [x] Users should be able to optionally signup / login in order to save their recommendations for retrieving later or on other devices. That's going to need a whole new flow. You should still be able to use the site without creating an account, you just won't be able to persist your recommendations beyond your session.
- [x] The category dropdown looks ugly on Safari. Fix.
- [x] You should be able to, with caution, purge all your saved recommendations
- [x] Also add an about page describing the purpose of the site and explaining the increasing importance of human-led personal creation instead of soulless algorithms driving our consumption habits.
- [x] Add Spotify integration for music autocomplete (artists, songs, genres)
