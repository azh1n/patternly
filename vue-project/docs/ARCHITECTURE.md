# Patternly - Architecture Document

A crochet pattern management and visualization platform built with Vue 3 and Firebase.

**Repository:** `azh1n.github.io`
**Firebase Project:** `patternly-app`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build | Vite 5 |
| Router | Vue Router 4 |
| State | Pinia |
| Backend | Firebase (Auth, Firestore, Hosting) |
| Image Processing | OpenCV.js (dynamic), Roboflow (ML stitch classification) |
| 3D Rendering | Three.js |
| PDF | pdfjs-dist, pdf-lib |
| Icons | Font Awesome 6 (70+ icons registered in main.js) |
| Testing | Vitest, @testing-library/vue, @vue/test-utils |

---

## Project Structure

```
azh1n.github.io/
├── firebase.json              # Hosting config (serves vue-project/dist, SPA rewrites)
├── firestore.rules            # Security rules
├── apphosting.yaml            # Cloud Run config (minInstances: 0)
├── .firebaserc                # Project: patternly-app
├── package.json               # Root deps (confetti, three, uuid)
│
└── vue-project/
    ├── index.html
    ├── package.json           # App deps (~24 prod, ~12 dev)
    ├── vite.config.js         # @ alias, Vue plugin, devtools
    ├── vitest.config.js
    │
    └── src/
        ├── main.js            # App entry: Pinia, Router, FontAwesome setup
        ├── App.vue            # Root: auth listener, theme/settings init, AdBanner, Footer
        ├── firebase.js        # SDK init (all config via VITE_ env vars)
        │
        ├── router/
        │   └── index.js       # 14 routes, nav guards (auth, guest, experimental)
        │
        ├── stores/
        │   └── pattern.js     # Pinia store: CRUD for patterns collection
        │
        ├── services/
        │   ├── auth.js                   # useAuth() composable (login, register, OAuth, rate limiting)
        │   ├── theme.js                  # useTheme() composable (dark/light, persisted to Firestore)
        │   ├── userSettings.js           # useUserSettings() (experimental features flag)
        │   ├── gridProcessingService.js  # OpenCV grid/line detection (~56KB)
        │   ├── chartProcessingService.js # Orchestrator: grid detect → stitch classify (~18KB)
        │   └── imageProcessingService.js # Image preprocessing utils
        │
        ├── composables/
        │   ├── useConfetti.js    # canvas-confetti celebration animation
        │   └── useAdControl.js   # Route-aware ad display logic
        │
        ├── utils/
        │   └── shapeDetection.js # Circular vs rectangular pattern detection
        │
        ├── views/               # 14 page components
        │   ├── DashboardView.vue
        │   ├── PatternListView.vue
        │   ├── PatternView.vue
        │   ├── PatternBuilderView.vue
        │   ├── MarketplaceView.vue
        │   ├── ToolsView.vue
        │   ├── AboutView.vue
        │   ├── DonateView.vue
        │   ├── PrivacyPolicyView.vue
        │   ├── TermsOfServiceView.vue
        │   ├── CopyrightPolicyView.vue
        │   ├── RefundPolicyView.vue    # Route commented out (marketplace not ready)
        │   ├── HomeView.vue
        │   └── PatternUploadDemo.vue
        │
        ├── components/          # 24 reusable components
        │   ├── SideNavigation.vue
        │   ├── AppFooter.vue
        │   ├── AdBanner.vue
        │   ├── LoginPage.vue
        │   ├── ProfilePage.vue
        │   ├── GoogleAuthCallback.vue
        │   ├── PatternGrid.vue
        │   ├── PatternCard.vue
        │   ├── SearchBar.vue
        │   ├── FileUploader.vue
        │   ├── PatternFileUploader.vue
        │   ├── FileUploadContainer.vue
        │   ├── AddPatternModal.vue
        │   ├── ImageProcessingProgress.vue
        │   ├── ContentPlaceholder.vue
        │   ├── GridOverlay.vue          # New (untracked)
        │   │
        │   ├── pattern/                 # Pattern display components
        │   │   ├── PatternPreviewSection.vue
        │   │   ├── PatternViewToggle.vue
        │   │   ├── PatternEditModal.vue
        │   │   ├── RowEditModal.vue
        │   │   ├── ChartPatternView.vue
        │   │   ├── PatternChartView.vue
        │   │   ├── ChartPreview.vue
        │   │   ├── UnparsedContentSection.vue
        │   │   ├── SwappableStitchVisualization.vue
        │   │   │
        │   │   ├── stitches/            # Stitch visualization modes
        │   │   │   ├── StitchVisualization.vue
        │   │   │   ├── StitchVisualizationToggle.vue
        │   │   │   ├── ColorBlockStitches.vue
        │   │   │   ├── TextStitches.vue
        │   │   │   ├── SymbolStitches.vue
        │   │   │   └── StitchKeyTooltip.vue
        │   │   │
        │   │   └── crochet/             # Advanced visualization
        │   │       ├── CrochetNotationView.vue
        │   │       ├── Crochet3DView.vue
        │   │       └── StitchSymbol.vue
        │   │
        │   └── icons/
        │
        └── assets/
            ├── main.css
            ├── styles/stitch-colors.css
            ├── crochet-symbols.svg
            └── images/
```

---

## Application Architecture

### Initialization Flow

```
main.js
  ├── Import global CSS (main.css, stitch-colors.css)
  ├── Register 70+ FontAwesome icons
  ├── createApp(App)
  ├── Install Pinia store
  ├── Install Vue Router
  └── mount('#app')

App.vue (onMounted)
  ├── initTheme()  → load user theme pref from Firestore
  ├── initSettings() → load experimental features flag
  └── onAuthStateChanged listener
        ├── signed in → redirect from localStorage or go to /
        └── signed out → redirect to /login if on protected route
```

### Routing & Guards

All routes are eagerly imported (no lazy loading). The navigation guard (`beforeEach`) runs `initSettings()` then checks three meta flags:

| Meta Flag | Behavior |
|-----------|----------|
| `requiresAuth: true` | Redirect to `/login` if no `auth.currentUser` |
| `requiresGuest: true` | Redirect to `/` if user is logged in |
| `requiresExperimental: true` | Redirect to `/` if experimental features disabled |

**Protected routes:** `/` (dashboard), `/patterns`, `/pattern/:id`, `/builder`, `/marketplace`, `/tools`, `/profile`
**Guest-only routes:** `/login`, `/auth/callback`
**Public routes:** `/about`, `/donate`, `/privacy-policy`, `/terms-of-service`, `/copyright-policy`

### Data Layer

**Firestore Collections:**

| Collection | Document Key | Access |
|------------|-------------|--------|
| `patterns` | auto-generated | Public read; authenticated create (own userId); owner update/delete |
| `userPreferences` | `{userId}` | Owner read/write only |

**Pinia Store (`pattern.js`):**
- `fetchPatterns()` — queries all patterns ordered by `createdAt` desc
- `getPattern(id)` — single document fetch
- `addPattern(pattern)` — create with auto-ID
- `updatePattern(id, data)` — merge update
- `deletePattern(id)` — delete document

### Authentication

Handled by `services/auth.js` via `useAuth()` composable:

- **Email/password** with validation (8+ chars, upper, lower, digit, special)
- **Google OAuth** with popup flow + callback route
- **Rate limiting:** 5 login attempts per 15 minutes per email (client-side)
- Profile update, password change, password reset, account deletion

### Theme System

`services/theme.js` provides `useTheme()`:
- CSS custom properties for light/dark mode
- Preference persisted to `userPreferences/{uid}` in Firestore
- Login page forced to light theme via `body.login-page` class

### Feature Flags

`services/userSettings.js` provides `useUserSettings()`:
- Single flag: `experimentalFeatures` (boolean)
- Persisted to Firestore alongside theme preferences
- Gates the `/tools` route via router guard

---

## Core Feature: Pattern Processing Pipeline

The most complex subsystem. Converts uploaded pattern images into structured, interactive data.

```
User uploads image/PDF
        │
        ▼
  chartProcessingService.js (orchestrator)
        │
        ├── Load OpenCV.js dynamically
        ├── Preprocess image (imageProcessingService.js)
        │
        ▼
  gridProcessingService.js
        │
        ├── Detect horizontal lines (OpenCV edge detection)
        ├── Detect vertical lines
        ├── Compute grid cell boundaries
        │
        ▼
  Roboflow API (external)
        │
        ├── Classify each cell → stitch type
        │
        ▼
  Structured pattern data
        │
        ├── Rows & columns with stitch types
        ├── Shape detection (circular vs rectangular)
        │
        ▼
  Multiple visualization modes
        ├── Text notation (TextStitches.vue)
        ├── Symbol notation (SymbolStitches.vue)
        ├── Color blocks (ColorBlockStitches.vue)
        ├── Chart grid (ChartPatternView.vue)
        ├── Crochet notation (CrochetNotationView.vue)
        └── 3D preview (Crochet3DView.vue, Three.js)
```

**Timeouts:** Grid processing has a 10-second limit.

---

## Component Hierarchy

```
App.vue
├── AdBanner                    (route-aware, hides on login/profile)
├── AppFooter                   (hidden during loading)
└── <router-view>
     │
     ├── DashboardView
     │    ├── SideNavigation
     │    └── PatternGrid → PatternCard[]
     │
     ├── PatternListView
     │    ├── SideNavigation
     │    ├── SearchBar
     │    └── PatternGrid → PatternCard[]
     │
     ├── PatternView
     │    ├── SideNavigation
     │    ├── PatternPreviewSection
     │    │    ├── PatternViewToggle
     │    │    ├── ChartPatternView → StitchVisualization
     │    │    ├── CrochetNotationView → StitchSymbol
     │    │    └── Crochet3DView (Three.js canvas)
     │    ├── PatternEditModal
     │    └── RowEditModal
     │
     ├── PatternBuilderView
     │    └── AddPatternModal
     │
     ├── LoginPage
     │    └── GoogleAuthCallback
     │
     └── ProfilePage
```

---

## Build & Deployment

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build → `vue-project/dist/` |
| `npm run test` | Vitest unit tests |
| `npm run test:coverage` | Test coverage report |
| `firebase deploy` | Deploy to Firebase Hosting |

**Vite Config:**
- `@/` alias → `./src/`
- `transformMixedEsModules: true` for CommonJS compat
- Vue DevTools plugin in dev

**Firebase Hosting:**
- Serves from `vue-project/dist`
- All routes rewrite to `index.html` (SPA)
- App Hosting (Cloud Run) configured with `minInstances: 0`

---

## External Service Dependencies

| Service | Purpose | Integration Point |
|---------|---------|------------------|
| Firebase Auth | User authentication | `services/auth.js`, `firebase.js` |
| Firestore | Pattern & preferences storage | `stores/pattern.js`, `services/theme.js` |
| Firebase Hosting | App deployment | `firebase.json` |
| Roboflow | ML stitch classification | `chartProcessingService.js` |
| OpenCV.js | Image grid detection | `gridProcessingService.js` (loaded dynamically) |
| Google AdSense | Monetization | `AdBanner.vue` |

---

## Environment Variables

All prefixed with `VITE_` for Vite client-side access:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

---

## Known Architectural Concerns

1. **Auth race condition** — Router guard checks `auth.currentUser` synchronously, but Firebase Auth initializes asynchronously. On page refresh, the guard may see `null` before auth state resolves.

2. **Auth state listener side effects** — `onAuthStateChanged` in `App.vue` redirects on every auth event, including token refreshes, which can interrupt navigation.

3. **Public pattern reads** — Firestore rules allow `read: if true` on the `patterns` collection. All user patterns are publicly readable.

4. **No lazy loading** — All 14 view components are eagerly imported in the router. Could impact initial bundle size.

5. **Client-side rate limiting** — Login rate limiting in `auth.js` is enforced client-side only and can be bypassed.

6. **Large service files** — `gridProcessingService.js` (~56KB) and `chartProcessingService.js` (~18KB) contain complex image processing logic in single files.
