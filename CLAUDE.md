# Patternly

A web application for crocheters to manage, create, and share crochet patterns.

## Tech Stack

- **Frontend**: Vue 3 (Composition API only), Vite, Vue Router 4, Pinia, Tailwind CSS
- **Backend/Data**: Firebase Auth, Firestore, Firebase Storage, Firebase Hosting
- **Testing**: Vitest, Vue Test Utils, @testing-library/vue, JSDOM
- **Other**: pdf-lib, pdfjs-dist, three.js, FontAwesome

See @vue-project/package.json for full dependencies and @vue-project/README.md for additional docs.

## Project Structure

All application code lives in `vue-project/`. The root only contains Firebase config and a few top-level dependencies (three.js, canvas-confetti, uuid).

```
vue-project/src/
├── components/     # Reusable UI components (PascalCase)
│   ├── pattern/    # Pattern-specific components
│   └── __tests__/  # Component unit tests
├── views/          # Full-page route components
├── router/         # Vue Router config with auth guards
├── stores/         # Pinia stores
├── services/       # Business logic and Firebase interactions
├── composables/    # Reusable stateful logic (use* prefix)
├── utils/          # Utility functions
└── assets/         # Styles, images, crochet symbols
```

## Commands

All commands must be run from `vue-project/`, not the repo root.

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run preview       # Preview production build

npm test              # Run tests in watch mode
npm run test:coverage # Coverage report
npm run test:ui       # Tests with UI dashboard

firebase deploy       # Deploy to Firebase (run from repo root)
```

## Code Conventions

- **Components**: PascalCase filenames (`PatternCard.vue`)
- **Stores**: `use` prefix, defined with Pinia (`usePatternStore()`)
- **Composables**: `use` prefix (`useAdControl.js`)
- **Services**: lowercase with descriptive names (`gridProcessingService.js`)
- **Data flow**: Components → Services → Firebase
- **Async**: Always wrap in try-catch with error handling
- **State**: Use Pinia for cross-component state, local `ref()`/`reactive()` otherwise

## What NOT to Do

- Don't use the Options API — this project uses Composition API exclusively
- Don't use Vuex — state management is Pinia only
- Don't import from the root `package.json` deps in app code — use `vue-project/` deps
- Don't bypass Firestore security rules in application code — rules are the source of truth
- Don't initialize real Firebase in test files — Firebase is always mocked via `vitest.setup.js`

## Testing

- Firebase auth and Firestore are mocked in `vue-project/vitest.setup.js`
- Tests run in a JSDOM environment
- Test files live in `__tests__/` directories colocated with source

## Environment

Create `vue-project/.env` with:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=   # optional
```

## Security

Always maintain these — do not remove or weaken:

- Input validation on all user-facing forms
- Display name sanitization (XSS prevention) in `src/services/auth.js`
- Rate limiting on auth operations (5 attempts per 15 minutes)
- Firestore rules enforce that only pattern owners can modify their own data

## Firebase Architecture

- **Auth**: Email/password + Google OAuth
- **Firestore**: Users can read all patterns; only owners can write their own
- **Storage**: Pattern documents and images
- **Hosting**: SPA rewrite — all routes redirect to `/index.html`
- **App Hosting**: Backend on Cloud Run (`minInstances: 0`)

## After Making Changes

Before considering a task done:

1. Run `npm test` and ensure no tests are broken
2. Verify the dev server starts without errors (`npm run dev`)
