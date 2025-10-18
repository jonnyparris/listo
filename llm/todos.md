# Design & UX Improvements

## Critical Issues (Accessibility & Brand)

### 1. Fix Dark Mode Text Contrast �
**Priority:** CRITICAL - Accessibility violation
**File:** `src/app.css:12`
**Issue:** Dark mode uses dark text (#2B2B2B) on dark background, failing WCAG AA
**Fix:** Verify dark mode text uses `text-background-light` (#FDFBF7)

### 2. Fix Primary Button Text Contrast �
**Priority:** CRITICAL - Accessibility violation
**File:** `src/lib/components/ui/Button.svelte:26`
**Issue:** White text on seafoam (#BFE3D0) fails WCAG AA (contrast 1.8:1, needs 4.5:1)
**Fix:** Change to `text-text dark:text-text` (#2B2B2B)

### 3. Add Serif Font to Tagline
**Priority:** HIGH - Brand consistency
**File:** Logo component or SVG
**Issue:** Tagline uses Inter instead of Fraunces/Libre Baskerville
**Fix:**
```css
.tagline {
  font-family: 'Fraunces', 'Libre Baskerville', Georgia, serif;
  font-size: 0.875rem;
  letter-spacing: 0.1em;
  text-transform: lowercase;
  color: #F2C6A0;
}
```

### 4. Load Serif Fonts Properly
**Priority:** HIGH - Brand consistency
**Issue:** Cormorant Garamond not loading, falls back to Georgia
**Fix:** Add to `app.html` or install `@fontsource/cormorant-garamond` and `@fontsource/inter`
```bash
npm install @fontsource/cormorant-garamond @fontsource/inter
```

## Color Palette Consistency

### 5. Replace Generic Grays with Brand Colors
**Priority:** HIGH - Brand consistency
**Files:** All component files using `gray-*` classes
**Issue:** Using `gray-100`, `gray-700`, `gray-800` instead of brand palette
**Fix:** Add to `tailwind.config.js`:
```js
surface: {
  light: '#F5F3EF',
  dark: '#3A3A38',
},
overlay: {
  light: 'rgba(0, 0, 0, 0.03)',
  dark: 'rgba(255, 255, 255, 0.05)',
}
```
Then replace:
- Cards: `bg-surface-light dark:bg-surface-dark`
- Hover: `hover:bg-overlay-light dark:hover:bg-overlay-dark`

### 6. Update Input Background Colors
**Priority:** MEDIUM - Brand consistency
**File:** `src/app.css:47`
**Issue:** Using `bg-background-light` (#FDFBF7) instead of neutral #F5F3EF
**Fix:** Change to `bg-[#F5F3EF] dark:bg-surface-dark`

### 7. Standardize Border Colors
**Priority:** MEDIUM - Brand consistency
**Issue:** Using `border-gray-200` instead of subtle rgba overlays
**Fix:** Define utility class:
```css
.border-subtle {
  border: 1px solid rgba(0, 0, 0, 0.05);
}
.dark .border-subtle {
  border-color: rgba(255, 255, 255, 0.05);
}
```

## Accessibility Improvements

### 8. Improve Focus Indicator Contrast
**Priority:** HIGH - Accessibility
**Files:** All interactive components
**Issue:** Seafoam focus ring barely visible on light backgrounds
**Fix:** Change `focus:ring-primary` to `focus:ring-primary-dark dark:focus:ring-primary`

### 9. Fix A11y Warnings from Build
**Priority:** HIGH - Accessibility
**Files:**
- `src/routes/+page.svelte:1810` - Add tabindex to dialog
- `src/routes/+page.svelte:1822` - Make div button or add proper role

### 10. Ensure 44px Touch Targets
**Priority:** HIGH - Mobile accessibility (WCAG)
**Files:** All buttons, especially icon-only buttons
**Fix:**
```css
button[aria-label] {
  min-height: 44px;
  min-width: 44px;
}
.category-pill {
  min-height: 44px;
  padding: 12px 16px;
}
```

### 11. Add Proper Form Labels
**Priority:** MEDIUM - Accessibility
**File:** `src/routes/+page.svelte` - Add form modal
**Issue:** Inputs rely on placeholders instead of proper labels
**Fix:** Add `aria-labelledby` or wrap in `<label>` elements

## Motion & Animation

### 12. Apply Spring Easing Throughout
**Priority:** MEDIUM - Brand consistency
**Files:** `Button.svelte`, `Input.svelte`, Card components
**Issue:** Using generic `transition-all` instead of defined `ease-spring`
**Fix:** Replace with `transition-all duration-200 ease-spring`

### 13. Add Slide-Up Transition to Add Modal
**Priority:** MEDIUM - UX per brand guidelines
**File:** `src/routes/+page.svelte` - Add form modal
**Issue:** Modal fades instead of sliding up as per guidelines
**Fix:**
```svelte
<div transition:fly={{ y: 100, duration: 300, easing: cubicOut }}>
```

### 14. Enhance Theme Toggle Animation
**Priority:** LOW - Polish
**File:** `src/lib/components/ThemeToggle.svelte`
**Enhancement:** Add rotation/scale animation:
```svelte
class="transition-transform duration-300 ease-spring hover:scale-110 active:scale-95"
```

## Shadow Refinements

### 15. Soften Shadow Implementation
**Priority:** MEDIUM - Brand consistency (Design calls for feathered shadows)
**File:** `tailwind.config.js`
**Issue:** Shadows too directional, not soft enough
**Fix:**
```js
boxShadow: {
  'soft': '0 8px 24px -8px rgba(0, 0, 0, 0.06), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
  'card': '0 16px 40px -12px rgba(0, 0, 0, 0.08), 0 4px 16px -4px rgba(0, 0, 0, 0.06)',
  'float': '0 24px 48px -16px rgba(0, 0, 0, 0.10)'
}
```

### 16. Add Card Lift on Hover
**Priority:** LOW - Polish
**File:** `src/app.css:40-42`
**Enhancement:** Add to `.card` hover state:
```css
.card:hover {
  transform: translateY(-2px);
}
```

## Mobile UX Improvements

### 17. Fix FAB Position for iOS Safe Areas
**Priority:** MEDIUM - Mobile UX
**File:** Floating Action Button component
**Issue:** May be obscured by iOS gesture indicators
**Fix:**
```css
.fab {
  bottom: calc(24px + env(safe-area-inset-bottom));
  right: calc(24px + env(safe-area-inset-right));
}
```

### 18. Add Visual Affordance for Category Scroll
**Priority:** LOW - UX clarity
**File:** Category selection component
**Issue:** Horizontal scroll not obvious to users
**Enhancement:** Add gradient fade on right edge

### 19. Enhance Empty State
**Priority:** LOW - UX engagement
**File:** `src/routes/+page.svelte` - Empty state section
**Enhancement:** Add quick-start category suggestions with click-to-add

## Component Polish

### 20. Refine Button Hierarchy
**Priority:** MEDIUM - UX clarity
**File:** `src/lib/components/ui/Button.svelte:26`
**Issue:** Primary and secondary buttons have similar visual weight
**Enhancement:**
```typescript
const variants = {
  primary: 'bg-primary hover:bg-primary-dark text-text shadow-md hover:shadow-lg scale-100 hover:scale-[1.02]',
  secondary: 'bg-secondary/20 hover:bg-secondary/30 text-text shadow-sm',
  outline: 'border-2 border-primary/30 bg-transparent hover:bg-primary/10',
  ghost: 'bg-transparent hover:bg-primary/5'
}
```

---

## Implementation Priority

### Phase 1 - Critical Fixes (Do First)
- [ ] #1 - Fix dark mode text contrast
- [ ] #2 - Fix button text contrast
- [ ] #8 - Improve focus indicators
- [ ] #9 - Fix A11y warnings
- [ ] #10 - Ensure touch targets

### Phase 2 - Brand Consistency
- [ ] #3 - Serif font on tagline
- [ ] #4 - Load fonts properly
- [ ] #5 - Replace grays with brand colors
- [ ] #6 - Update input backgrounds
- [ ] #7 - Standardize borders
- [ ] #12 - Apply spring easing

### Phase 3 - Polish & Enhancement
- [ ] #13 - Slide-up modal transition
- [ ] #15 - Soften shadows
- [ ] #16 - Card lift on hover
- [ ] #17 - FAB safe areas
- [ ] #20 - Button hierarchy
- [ ] remove the "By category" header, and make that whole card collapsible

### Phase 4 - Nice-to-Haves
- [ ] #11 - Proper form labels
- [ ] #14 - Theme toggle animation
- [ ] #18 - Category scroll affordance
- [ ] #19 - Enhanced empty state

---

**Design Adherence Score: 6.5/10 � Target: 9/10**

Key areas for improvement:
- Color palette consistency (4/10 � 9/10)
- Typography implementation (5/10 � 9/10)
- Accessibility (6/10 � 9/10)
