# Story: Subscription Tiers (Free & Pro)

**Status:** Planning
**Priority:** High
**Depends on:** none
**Estimated Scope:** Multiple new files, several existing files modified

---

## Problem

Patternly currently has no monetization beyond Ko-fi donations and ads. All features are equally available to every user. To sustain the product long-term — cover Firebase costs, Roboflow API usage, and fund development — we need a subscription model that balances a genuinely useful free experience with enough value in the paid tier to drive upgrades.

---

## Market Context

Research across fiber craft platforms (Ribblr, Stitch Fiddle, knitCompanion, My Row Counter, Crochet Genius) and creative SaaS tools (Canva, Notion, Cricut) shows:

- **Freemium with a generous free tier** is the dominant model in this space
- **$3–7/month** is the sweet spot for hobby tools; craft audiences are price-sensitive
- **Most common gates:** storage limits, export quality, advanced tools, ad removal
- **Annual discounts of 20–30%** are standard and improve retention

---

## Tier Design

### Free

The free tier is the product's marketing engine. It should feel complete enough that users love the app, but naturally lead to friction points that Pro resolves.

| Feature | Free |
|---------|------|
| **Pattern storage** | 5 patterns |
| **Pattern input** | Text only (paste/type pattern instructions) |
| **Chart processing (OpenCV/Roboflow)** | No |
| **File upload (image/PDF/DOCX)** | No |
| **All visualizations** (text, symbols, color blocks, chart, crochet notation, 3D) | Yes |
| **Row tracking & progress** | Yes |
| **Row notes** | Yes |
| **Dark mode** | Yes |
| **Pattern analytics** | Yes |
| **PDF/image export** | Watermarked ("Made with Patternly") |
| **Pattern export (multi-format)** | No |
| **Bulk actions** | No |
| **Pattern editing (post-creation)** | No |
| **Pattern Builder** (when built) | No |
| **Marketplace — browse & buy** (when built) | Yes |
| **Marketplace — sell** (when built) | No |
| **Ads** | Yes |

### Pro — $5/month ($48/year)

Pro removes all limits and unlocks every feature. One paid tier keeps the decision simple: free or everything.

| Feature | Pro |
|---------|-----|
| **Pattern storage** | Unlimited |
| **Pattern input** | Text + file upload (image, PDF, DOCX) |
| **Chart processing (OpenCV/Roboflow)** | Unlimited |
| **File upload (image/PDF/DOCX)** | Yes |
| **All visualizations** | Yes |
| **Row tracking & progress** | Yes |
| **Row notes** | Yes |
| **Dark mode** | Yes |
| **Pattern analytics** | Yes |
| **PDF/image export** | Clean (no watermark) |
| **Pattern export (multi-format)** | Yes |
| **Bulk actions** | Yes |
| **Pattern editing (post-creation)** | Yes |
| **Pattern Builder** (when built) | Yes |
| **Marketplace — browse & buy** (when built) | Yes |
| **Marketplace — sell** (when built) | Yes |
| **Ads** | No |
| **Priority support** | Yes |

### Pricing

| Plan | Price | Effective Monthly |
|------|-------|-------------------|
| Monthly | $5/month | $5.00 |
| Annual | $48/year | $4.00 (20% off) |

---

## What Drives Upgrades

The free tier has three natural friction points that should convert users to Pro:

1. **Storage cap (5 patterns)** — The strongest gate. Users who use the app regularly will hit this quickly. The cap creates urgency without degrading the experience of what they already have.

2. **No file upload / chart processing** — Free users must type or paste pattern text manually. Anyone who wants to upload a pattern chart image or PDF and have it auto-processed needs Pro. This also protects our most expensive backend operation (Roboflow API calls).

3. **Watermarked exports** — Users who want to print or share a clean PDF hit the upgrade prompt. The watermark is visible but not obstructive — it says "Made with Patternly" in the footer or margin.

---

## Implementation Plan

### Phase 1: Subscription Data Model

#### 1a. New Firestore collection — `subscriptions/{userId}`

Subscription state lives in its own collection, separate from `userPreferences`. This gives a clean security boundary: `userPreferences` remains fully client-writable for theme/settings, while `subscriptions` is exclusively server-controlled.

```js
// subscriptions/{userId}
{
  tier: 'free',                    // 'free' | 'pro'
  status: 'active',                // 'active' | 'cancelled' | 'past_due' | 'expired'
  currentPeriodStart: null,        // Timestamp
  currentPeriodEnd: null,          // Timestamp
  cancelAtPeriodEnd: false,        // true if user cancelled but period hasn't ended
  paymentProvider: null,           // 'stripe'
  providerSubscriptionId: null,    // Stripe subscription ID
  providerCustomerId: null,        // Stripe customer ID
  patternCount: 0,                 // Server-maintained count for rule enforcement
}
```

The existing `userPreferences/{userId}` document is unchanged:

```js
// userPreferences/{userId} (no changes)
{
  isDarkMode: false,
  experimentalFeatures: false,
}
```

**Why a separate collection?**

- `userPreferences` currently uses `setDoc` with `merge: true` everywhere (theme.js, userSettings.js). If subscription fields lived in the same document, every client-side `setDoc` call would need careful auditing to avoid accidentally touching billing data.
- With a separate collection, it's structurally impossible for client code to overwrite subscription state — the rules simply deny all client writes.
- Stripe webhook Cloud Functions write to `subscriptions/{userId}` and never need to touch `userPreferences`.

#### 1b. Firestore security rules

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Patterns — public read, owner write, free tier limited to 5
    match /patterns/{patternId} {
      allow read: if true;

      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid
        // Enforce free-tier pattern limit at the rule level.
        // The subscriptions doc tracks patternCount (maintained by Cloud Function
        // trigger on pattern create/delete). If no subscription doc exists,
        // the user is on free tier — allow up to 5 patterns.
        && (
          get(/databases/$(database)/documents/subscriptions/$(request.auth.uid)).data.tier == 'pro'
          || !exists(/databases/$(database)/documents/subscriptions/$(request.auth.uid))
             && getCountFromSubcollection(request.auth.uid) <= 5
          || exists(/databases/$(database)/documents/subscriptions/$(request.auth.uid))
             && get(/databases/$(database)/documents/subscriptions/$(request.auth.uid)).data.tier == 'free'
             && get(/databases/$(database)/documents/subscriptions/$(request.auth.uid)).data.patternCount < 5
        );

      allow update, delete: if request.auth != null
        && resource.data.userId == request.auth.uid;
    }

    // User preferences — client read/write (theme, experimental features)
    match /userPreferences/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Subscriptions — client can read own, only Admin SDK can write
    match /subscriptions/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }

    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Pattern count enforcement strategy:**

The `patternCount` field on the subscription document is the source of truth for Firestore rules. It's maintained server-side by a Cloud Function trigger:

- `onCreate` on `patterns/{patternId}` → increment `subscriptions/{userId}.patternCount`
- `onDelete` on `patterns/{patternId}` → decrement `subscriptions/{userId}.patternCount`

This avoids expensive collection queries in security rules (Firestore rules can't do `count()` on a collection). The rule simply reads one document (`subscriptions/{userId}`) and checks `patternCount < 5` for free-tier users.

**Bootstrapping for existing users:** A one-time migration script creates `subscriptions/{userId}` documents for all existing users with `tier: 'free'`, `status: 'active'`, and `patternCount` set to their current pattern count. New users get a subscription doc created by a Cloud Function trigger on `auth.user().onCreate`.

**Fallback for missing subscription doc:** If a user has no `subscriptions` document (e.g., account created before migration, migration missed them), the rule should treat them as free tier. The Cloud Function on pattern create should also create the subscription doc if it doesn't exist.

### Phase 2: Subscription Service

#### 2a. New file — `services/subscription.js`

A `useSubscription()` composable that reads from the `subscriptions/{userId}` collection and provides reactive subscription state to the entire app:

```js
// Reactive state (loaded from subscriptions/{userId})
const tier = ref('free')           // 'free' | 'pro'
const status = ref('active')
const isLoading = ref(true)
const currentPeriodEnd = ref(null)
const cancelAtPeriodEnd = ref(false)
const patternCount = ref(0)

// Computed
const isPro = computed(() => tier.value === 'pro' && status.value === 'active')
const isFree = computed(() => !isPro.value)

// Methods
function initSubscription(userId)  // Load from Firestore subscriptions/{userId}
function onSubscriptionChange(callback) // onSnapshot listener for real-time updates

// Feature gate helpers
const canUploadFiles = computed(() => isPro.value)
const canProcessCharts = computed(() => isPro.value)
const canEditPatterns = computed(() => isPro.value)
const canExportClean = computed(() => isPro.value)
const canExportFormats = computed(() => isPro.value)
const canBulkAction = computed(() => isPro.value)
const canUseBuilder = computed(() => isPro.value)
const canSellOnMarketplace = computed(() => isPro.value)
const showAds = computed(() => isFree.value)
const patternLimit = computed(() => isFree.value ? 5 : Infinity)
const canAddPattern = computed(() => isPro.value || patternCount.value < 5)
```

The composable uses `onSnapshot` (not just `getDoc`) so that subscription state updates in real-time — e.g., when a Stripe webhook fires and the Cloud Function updates the doc, the UI reflects the change immediately without a page refresh.

### Phase 3: Feature Gating in Existing Components

Apply subscription checks to existing functionality:

| File | Gate | Behavior When Free |
|------|------|--------------------|
| `AddPatternModal.vue` | `canUploadFiles` | Hide file upload section; show "Pro" badge with upgrade prompt |
| `stores/pattern.js` → `addPattern()` | `patternLimit` | Check count before save; show upgrade modal if at limit |
| `PatternView.vue` | `canEditPatterns` | Hide edit button or show "Pro" lock icon |
| `AdBanner.vue` | `showAds` | Skip ad rendering for Pro users |
| `ToolsView.vue` — export tool | `canExportFormats` | Show lock icon on export tool card |
| `ToolsView.vue` — bulk actions | `canBulkAction` | Show lock icon on bulk actions card |
| `PatternBuilderView.vue` | `canUseBuilder` | Show upgrade prompt instead of coming soon |
| `MarketplaceView.vue` | `canSellOnMarketplace` | Hide "Sell" tab/section for free users; browse and buy remain accessible |
| Export (when built) | `canExportClean` | Add watermark text to PDF/image exports for free users |

### Phase 4: Upgrade Prompt UI

#### 4a. New component — `UpgradeModal.vue`

A reusable modal shown when a free user hits a gated feature. Accepts a `feature` prop to customize the message:

- Header: "Upgrade to Pro"
- Body: Dynamic message based on which feature triggered it (e.g., "Upload pattern images and PDFs with Pro" or "You've reached the 5-pattern limit")
- Pro feature list (brief)
- CTA: "Upgrade — $5/month" / "Upgrade — $48/year (save 20%)"
- Dismiss: "Maybe later"

#### 4b. New component — `ProBadge.vue`

A small inline badge ("PRO") that appears next to gated features in navigation and UI, signaling what's included with Pro without being obstructive.

### Phase 5: Subscription Management UI

#### 5a. Add subscription section to `ProfilePage.vue`

- Current plan display (Free / Pro)
- If Free: upgrade CTA
- If Pro: billing period, next renewal date, cancel option
- Cancel flow: confirm dialog → sets `cancelAtPeriodEnd: true` → access continues until period ends

#### 5b. New route — `/pricing` (public)

A simple pricing page showing both tiers side-by-side with feature comparison. Accessible from nav, footer, and upgrade prompts. Does not require auth — serves as a marketing page for logged-out visitors too.

### Phase 6: Cloud Functions

Required Cloud Functions for server-side subscription and pattern count management:

#### 6a. Pattern count triggers

```
functions/
├── onPatternCreate  — Triggered on patterns/{patternId} create
│   └── Increment subscriptions/{userId}.patternCount
│       If no subscriptions doc exists, create one (tier: 'free', patternCount: 1)
│
├── onPatternDelete  — Triggered on patterns/{patternId} delete
│   └── Decrement subscriptions/{userId}.patternCount (min 0)
│
└── onUserCreate     — Triggered on auth user creation
    └── Create subscriptions/{userId} with tier: 'free', status: 'active', patternCount: 0
```

These run via Admin SDK, which bypasses Firestore rules (`allow write: if false` doesn't apply to Admin SDK).

#### 6b. Migration script

A one-time script (can be a Cloud Function or standalone Node script using Admin SDK):

1. Query all distinct `userId` values from the `patterns` collection
2. For each user, count their patterns
3. Create `subscriptions/{userId}` with `tier: 'free'`, `status: 'active'`, `patternCount: <count>`
4. Also create docs for any authenticated users who have zero patterns (query Auth users list)

#### 6c. Payment integration (Stripe) — separate story

This phase is the most complex and depends on decisions about Firebase Cloud Functions vs. a separate backend. High-level:

- **Stripe Checkout** for initial subscription
- **Stripe Customer Portal** for managing billing, updating payment method, cancelling
- **Stripe Webhooks** (via Cloud Function) to sync subscription state to Firestore:
  - `checkout.session.completed` → create/update `subscriptions/{userId}` with tier: 'pro'
  - `invoice.paid` → extend `currentPeriodEnd`
  - `invoice.payment_failed` → set status to `past_due`
  - `customer.subscription.deleted` → set status to `expired`, tier back to `free`

Detailed Stripe implementation will be a separate story once the data model, gating, and UI are in place.

---

## Edge Cases

- **Existing users when subscriptions launch:** All existing users default to `tier: 'free'`. Their existing patterns (even if >5) are preserved and accessible, but they cannot add new patterns until they upgrade or delete down to 5.
- **User cancels Pro mid-period:** Access continues until `currentPeriodEnd`. The `cancelAtPeriodEnd` flag shows a "Your Pro access ends on [date]" notice. After expiry, they revert to free-tier limits.
- **User has >5 patterns when downgrading:** All patterns remain viewable and usable. They just can't add new ones until they're at or below 5. No data is deleted.
- **Payment fails:** Status moves to `past_due`. Grace period (configurable, suggest 7 days) before downgrading to free. Show a banner: "Payment failed — update your payment method to keep Pro access."
- **Client-side tier spoofing:** The `subscriptions` collection has `allow write: if false` — the client SDK cannot modify it at all. Even if someone modifies the local reactive state in the browser, Firestore rules on `patterns` create will independently check `subscriptions/{userId}.tier` and `patternCount`, so server-side enforcement holds regardless. Export watermarking should also be enforced server-side if exports are generated on the backend.
- **Offline/cached state:** The composable uses `onSnapshot` for real-time sync. If offline, Firestore's local cache returns the last-known tier. This is acceptable — worst case, a lapsed Pro user gets a few extra local actions before the state syncs. Pattern creates still go through Firestore rules on reconnect.
- **patternCount drift:** If a Cloud Function trigger fails (rare but possible), `patternCount` could drift from reality. A periodic reconciliation Cloud Function (e.g., scheduled daily) can recount patterns per user and fix any drift. The count is a performance optimization for rules, not a billing record.
- **Missing subscriptions doc:** If a user somehow has no `subscriptions` document, the Firestore rules treat them as free tier. The `onPatternCreate` Cloud Function creates the doc if missing, so it self-heals on the next pattern action.

---

## Files Changed Summary

| File | Action |
|------|--------|
| `services/subscription.js` | NEW — `useSubscription()` composable (reads from `subscriptions` collection) |
| `components/UpgradeModal.vue` | NEW — upgrade prompt modal |
| `components/ProBadge.vue` | NEW — inline "PRO" badge |
| `views/PricingView.vue` | NEW — public pricing page |
| `functions/onPatternCreate.js` | NEW — Cloud Function: increment patternCount, create subscription doc if missing |
| `functions/onPatternDelete.js` | NEW — Cloud Function: decrement patternCount |
| `functions/onUserCreate.js` | NEW — Cloud Function: create default subscription doc for new users |
| `functions/migrateSubscriptions.js` | NEW — One-time migration script for existing users |
| `router/index.js` | ADD — `/pricing` route (public) |
| `firestore.rules` | UPDATE — add `subscriptions` collection rules, add pattern count check on `patterns` create |
| `components/AddPatternModal.vue` | UPDATE — gate file upload behind `canUploadFiles` |
| `components/SideNavigation.vue` | UPDATE — add ProBadge next to gated nav items |
| `stores/pattern.js` | UPDATE — client-side pattern limit check on `addPattern()` (backstop is in Firestore rules) |
| `views/PatternView.vue` | UPDATE — gate edit button behind `canEditPatterns` |
| `views/ToolsView.vue` | UPDATE — gate export and bulk actions |
| `views/PatternBuilderView.vue` | UPDATE — gate behind `canUseBuilder` |
| `views/MarketplaceView.vue` | UPDATE — gate sell functionality behind `canSellOnMarketplace` |
| `components/AdBanner.vue` | UPDATE — skip rendering when `showAds` is false |
| `components/ProfilePage.vue` | UPDATE — add subscription management section |

---

## Acceptance Criteria

- [ ] New users default to `free` tier
- [ ] Free users can store up to 5 patterns; attempting to add a 6th shows the upgrade modal
- [ ] Free users can only input patterns via text (paste/type); file upload UI is hidden with a Pro badge
- [ ] Free users see all visualization modes (text, symbols, color blocks, chart, crochet notation, 3D)
- [ ] Free users can track row progress and add row notes
- [ ] Free users see ads; Pro users do not
- [ ] Free users can access pattern analytics
- [ ] Free users cannot access pattern export (multi-format), bulk actions, or pattern editing
- [ ] Free users can browse and buy on the marketplace (when built); selling is Pro-only
- [ ] Pattern Builder is Pro-only (when built)
- [ ] PDF/image exports include a "Made with Patternly" watermark for free users; Pro exports are clean
- [ ] `/pricing` page is publicly accessible and shows both tiers with feature comparison
- [ ] Profile page shows current plan and upgrade/manage options
- [ ] Upgrade modal appears contextually when a free user hits a gated feature
- [ ] ProBadge appears inline next to gated features in navigation
- [ ] `subscriptions` collection cannot be written by client SDK (`allow write: if false`)
- [ ] `userPreferences` collection remains fully client-writable (no changes to existing behavior)
- [ ] Firestore rules on `patterns` create enforce the 5-pattern limit for free-tier users by reading `subscriptions/{userId}`
- [ ] Free user attempting a 6th pattern create is rejected by Firestore rules even if client-side check is bypassed
- [ ] Cloud Function increments `patternCount` on pattern create and decrements on delete
- [ ] Cloud Function creates `subscriptions/{userId}` doc on new user auth signup
- [ ] Missing subscription doc is treated as free tier (graceful fallback)
- [ ] Migration script correctly sets `patternCount` for all existing users
- [ ] Cancelling Pro sets `cancelAtPeriodEnd` and shows expiry date; access continues until period ends
- [ ] Users who downgrade keep all existing patterns but cannot add new ones above the limit
- [ ] Stripe integration is deferred to a separate story
