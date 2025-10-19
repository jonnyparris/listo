All tasks completed! ✅

- [x] When I create a recommendation without an account and then sign in and accept the prompt to save it to my account I get a message that the migration failed. Please fix.
  - Fixed: Migration now shows success with warning if sync fails, distinguishing between migration success and sync failure
- [x] Rename Show to Series, and make sure it's the first in the list of categories
  - Completed: Renamed throughout codebase, updated TypeScript types, API endpoints, and UI components
- [x] Wrap the list of categories so that all are visible at the same time. When one is selected, shrink the others so they're much smaller.
  - Completed: Categories now use flexbox wrapping, all visible simultaneously
  - Selected categories are larger (text-sm, px-4 py-2) with detail counts
  - Unselected categories are smaller (text-xs, px-3 py-1.5) and semi-transparent
- [x] Make the categories different colours
  - Completed: Each category has unique vibrant color (purple, blue, red, indigo, pink, etc.)
  - Colors work in both light and dark modes

Deployed to: https://8e0d694e.listo-a46.pages.dev
Screenshots saved to: test-screenshots/


## Questions
- when I created an account using my mobile browser, Bitwarden saved the passkey. How do I then sign in with that same account on my macbook browser?