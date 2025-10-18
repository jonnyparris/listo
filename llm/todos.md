# Listo - Action Plan & Todo List

## 🔴 Phase 1: Critical Fixes (HIGH PRIORITY)

### TypeScript Errors
- [ ] Fix `db/index.ts:54` - completed_at filter type error (boolean vs number)
- [ ] Fix `db/index.ts:75` - .and() predicate return type issue
- [ ] Fix `db/index.ts:95` - compound index query syntax for unsynced items
- [ ] Fix `webauthn.ts:9` - missing @simplewebauthn/types package or fix import

### User-Reported Bugs
- [ ] Fix: Migration fails after creating account - recommendations from session don't transfer
- [ ] Fix: Sync icon still shows "not synced" even after successful sync
- [ ] Fix: Check for enhancements after category change if title input has content

## 🟡 Phase 2: UX Polish (MEDIUM PRIORITY)

### User Experience
- [ ] Add auto-enrichment trigger when changing category with existing title
- [ ] Fix touch targets - ensure all buttons meet 44px minimum
- [ ] Add loading states for enrichment API calls
- [ ] Review mobile responsiveness across all breakpoints
- [ ] Improve category scrolling indicators in form

### Accessibility
- [ ] Fix autofocus accessibility warning in Input.svelte
- [ ] Audit keyboard navigation flow
- [ ] Add missing ARIA labels to interactive elements
- [ ] Test screen reader compatibility

## 🔵 Phase 3: Code Quality & Architecture (MEDIUM PRIORITY)

### Component Refactoring (Main page is 2000+ lines)
- [ ] Extract AddEditForm component from +page.svelte
- [ ] Extract RecommendationCard component
- [ ] Extract CompletionForm component
- [ ] Extract KeyboardShortcutsModal component
- [ ] Extract MigrationPrompt component

### Code Organization
- [ ] Move keyboard shortcut handlers to separate composable
- [ ] Extract category utilities to shared module
- [ ] Split large state objects into logical groups
- [ ] Add error boundaries for graceful error handling

## 🎨 Phase 4: Design Refinement (LOW PRIORITY)

### Design System Consistency
- [ ] Update serif font to match design spec (Fraunces/Libre Baskerville vs Cormorant Garamond)
- [ ] Audit all shadow usage matches design spec
- [ ] Verify 200-300ms transitions consistently applied
- [ ] Check all colors match Lazy Days palette

### Polish
- [ ] Optimize animations and transitions
- [ ] Test and verify PWA install prompt functionality
- [ ] Add better offline support indicators
- [ ] Implement optimistic UI updates
- [ ] Add rate limiting/debouncing for API calls

## 📝 Documentation
- [ ] Add JSDoc comments to complex functions
- [ ] Document state management patterns
- [ ] Create component API documentation

---

## Completed ✅
- Initial project setup and deployment
- Core CRUD operations with local-first storage
- WebAuthn passkey authentication
- Smart autocomplete for multiple categories
- Dark mode with localStorage persistence
- Keyboard shortcuts
- Toast notifications and modals
- Import/export functionality
- AI-powered category suggestions
