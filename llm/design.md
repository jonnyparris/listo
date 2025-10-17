# Design Guidance:
- Modern, minimalist design (inspired by Apple Notes meets Notion)
- Emphasize smooth UX, fast interactions, and intuitive search
- Mobile-first responsive layout
- Dark mode by default, with light mode toggle

# Branding & Theme: “Lazy Days”
- Visual tone: calm, airy, sunlit minimalism — pastel neutrals and low contrast.
- Palette:
  - Primary: #BFE3D0 (seafoam)
  - Secondary: #F2C6A0 (peach)
  - Background light: #FDFBF7
  - Background dark: #2C2C2B
  - Text: #2B2B2B / #6E6E6B
- Typography:
  - Primary: Inter / Satoshi (Sans)
  - Accent: Fraunces or Libre Baskerville (Serif)
  - Tagline: lowercase or small caps “intentional chill”
- Components: Rounded 2xl corners, soft shadows, pastel surfaces
- Animation: subtle, spring easing
- Motifs: bookmark, leaf, or constellation dots
- Logo: “Listo” wordmark with minimalist icon and tagline beneath
- Overall UX: mobile-first, intuitive, calm — every interaction should feel like a slow exhale.

## Layout & Composition
-	Spacing: Generous — 16–24px base grid with clear breathing room.
-	Corners: Rounded-2xl (16–20px).
-	Shadows: Soft, feathered, never harsh. Example: rgba(0,0,0,0.08) blur radius 20–30px.
-	Borders: Use 1px subtle contrast (rgba(0,0,0,0.05)).
-	Card Design: Floating effect — cards appear to rest gently above the background.
-	Input Fields: Soft edges, neutral background (#F5F3EF), placeholder text in muted grey.

## Motion
-	Easing: cubic-bezier(0.4, 0.0, 0.2, 1) (Material’s “Standard”) or spring-like ease-in-out.
-	Durations: 200–300ms — never snappy, always smooth.
-	Gestures: Slide up for add, swipe right for save/favorite, fade for transitions.