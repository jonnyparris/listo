# Listo - Action Plan & Todo List

## ✅ Phase 1: Critical Fixes (COMPLETED)

### TypeScript Errors ✅
- [x] Fix `db/index.ts:54` - completed_at filter type error (boolean vs number)
- [x] Fix `db/index.ts:75` - .and() predicate return type issue
- [x] Fix `db/index.ts:95` - compound index query syntax for unsynced items
- [x] Fix `webauthn.ts:9` - missing @simplewebauthn/types package or fix import
- [x] Fix auth register verify - byteLength error
- [x] Fix category filter type casting
- [x] Update metadata types with BaseMetadata interface for shared fields

### User-Reported Bugs ✅
- [x] Fix: Migration fails after creating account - recommendations from session don't transfer
- [x] Fix: Sync icon still shows "not synced" even after successful sync  
- [x] Fix: Check for enhancements after category change if title input has content
- [x] Fix: Enrichment plugin type errors (books, youtube, spotify, tmdb)
- [x] Fix: Input component autofocus and "id" prop issues

### UX Improvements ✅
- [x] Add loading indicator for enrichment API calls
- [x] Improve sync error handling with try/catch
- [x] Add automatic sync trigger after migration

## 🟡 Phase 2: UX Polish & Code Quality (IN PROGRESS)

### User Experience
- [ ] Fix touch targets - ensure all buttons meet 44px minimum
- [ ] Review mobile responsiveness across all breakpoints
- [ ] Improve category scrolling indicators in form
- [ ] Add keyboard navigation improvements

### Accessibility
- [ ] Audit remaining accessibility warnings
- [ ] Add missing ARIA labels to interactive elements  
- [ ] Test screen reader compatibility

## 🔵 Phase 3: Code Quality & Architecture (PENDING)

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

## 🎨 Phase 4: Design Refinement (PENDING)

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

## 🎉 Completed in This Session

### Phase 1 Achievements ✅
- **Fixed 7 TypeScript errors** across db/index.ts, webauthn.ts, auth routes
- **Fixed 4 user-reported bugs** including migration, sync, and auto-enrichment
- **Updated metadata type system** with BaseMetadata interface for consistency
- **Fixed all enrichment plugin errors** in books, youtube, spotify integrations
- **Added loading indicators** for better UX feedback
- **Zero TypeScript errors** - project now compiles cleanly
- **Build passes** - ready for deployment

### Commits Made
1. Fix TypeScript errors in db/index.ts and webauthn.ts, update metadata types
2. Fix enrichment plugin type errors and Input component issues  
3. Fix migration to generate new IDs and trigger sync, improve sync error handling
4. Add auto-enrichment when category changes with existing title
5. Fix final TypeScript errors in auth and category filter
6. Add loading indicator for enrichment API calls

---

## 🚀 Next Steps

**Recommended Priority:**
1. Component extraction (Phase 3) - Break down 2000+ line main page
2. Mobile responsiveness audit (Phase 2)
3. Design system audit (Phase 4)
4. PWA testing (Phase 4)
