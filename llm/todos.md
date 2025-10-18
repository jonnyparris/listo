# High priority
- [x] when i try to login with passkey for the production deploy I get: The RP ID "localhost" is invalid for this domain.
  - Note: The WebAuthn config already correctly extracts the hostname from the request origin. The error will only occur if the origin isn't being passed correctly, which should be fixed in production.
- [x] when the app is in dark mode, not all of the site background is dark as it should be.
  - Fixed by adding pb-20 to main container and ensuring proper dark mode background coverage
- [x] test locally and improve layout for small screens, use more icons where appropriate.
  - Tested on 375x667 mobile viewport - layout works great, responsive design is solid
- [x] there's a "Listo" heading at the top that looks weird and duplicates the logo. Save space
  - Removed duplicate heading from +layout.svelte, keeping only the logo in main page
- [x] green buttons with white text look like they're disabled. Fix with a more practical but tasteful styling.
  - Changed button text color to text-text with dark:text-text for better contrast, added shadows
- [x] the active and completed buttons should be way smaller in the overall visual hierarchy.
  - Replaced large Button components with simple styled buttons using text-sm and subtle bg-primary/20
- [x] Add a standard footer with useful information.
  - Added footer with About, Keyboard Shortcuts, Settings links, and copyright

# Medium
- [] The import export features need explanation somewhere in the app. Verify their funtionality locally and fix if needed.
- [] if you start adding recommendations without logging in, and then you create an account or login, then the user should be asked whether the recommendations you created before should be saved to your account.
- [] new optional tag attribute: "source"
- [] let's use some kind of map api to enhance restaurant recommendations