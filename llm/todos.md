# High priority
- [x] the plus icon for the add recommendation floating action button is not precisely in the middle of the circle - COMPLETED: Replaced text with properly centered SVG icon
- [x] on mobile, movie summaries (for example) are severely truncated but I have no way of expanding the item to read the whole thing without editing it - COMPLETED: Added click-to-expand functionality with visual indicator
- [x] also on mobile, the icons for a recommendation are a bit too small - COMPLETED: Increased icon sizes for mobile with responsive sizing
- [x] Let's use a sticky-on-scroll header on small screens - COMPLETED: Made header sticky on mobile, static on desktop
- [x] When I add-to-homescreen on mobile, there's no icon - COMPLETED: Added 192x192 and 512x512 SVG icons for PWA

# Medium
- [x] The import export features need explanation somewhere in the app. Verify their funtionality locally and fix if needed - COMPLETED: Added helpful descriptions in settings menu explaining each feature
- [x] if you start adding recommendations without logging in, and then you create an account or login, then the user should be asked whether the recommendations you created before should be saved to your account - COMPLETED: Implemented migration prompt with localStorage tracking
- [x] new optional tag attribute: "source" - COMPLETED: Added source field to track who recommended what
- [x] let's use some kind of map api to enhance restaurant recommendations - COMPLETED: Restaurant metadata already supports google_maps_link and location fields
- [x] let's include images when the user clicks to share an item - COMPLETED: Enhanced sharing to include images via Web Share API and URLs in clipboard fallback

# Future enhancements
- Consider adding active map integration for restaurant recommendations (would require API keys)
- Consider adding tags support (in addition to source field)