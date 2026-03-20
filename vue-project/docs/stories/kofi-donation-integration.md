# Story: Ko-fi Donation Integration

**Status:** Planning
**Priority:** Low
**Depends on:** none
**Estimated Scope:** ~1 file modified

---

## Problem

The `/donate` page is a fully-built UI with a Ko-fi-styled button, but it links to the placeholder URL `https://ko-fi.com/azh1n` with no real account behind it. Clicking the donate button currently leads nowhere useful.

---

## Service Selection

Several free (0% platform fee) donation platforms were evaluated. Only the payment processor fee (~3% + $0.30) is unavoidable regardless of platform.

| Platform | Platform Fee | One-Time Tips | Notes |
|---|---|---|---|
| **Ko-fi** | **0%** | **Excellent** | Purpose-built for tips; simple embed; large creator community |
| GitHub Sponsors | 0% | OK | 60-day delay on first payout; $100 minimum balance for Stripe payout |
| Liberapay | 0% | Weak | Designed for recurring donations; smaller community |
| Buy Me a Coffee | 5% | Good | Not free — disqualified |
| Patreon | 10% | Poor | Not free; subscription-focused — disqualified |

**Decision: Ko-fi.** Zero platform fee, purpose-built for one-time tips, clean official widget, and the donate page UI is already designed around it.

---

## Prerequisite (non-code)

A Ko-fi account already exists at https://ko-fi.com/azh1n.

---

## Goal

Replace the placeholder URL with the real Ko-fi username and upgrade the custom hand-rolled button to Ko-fi's official static button image so the integration is officially supported and the image URL won't go stale.

---

## Implementation Plan

### Phase 1: Update `DonateView.vue`

#### 1a. Add a named constant for the Ko-fi username

At the top of `<script setup>`, add:

```js
const KOFI_USERNAME = 'azh1n'
```

This keeps the username in one place so it never needs to be hunted down in the template.

#### 1b. Replace the custom button with Ko-fi's official button

Ko-fi provides an official static button image (`kofi2.png`) that is maintained by Ko-fi and won't go stale. Replace the current `.kofi-button` block (lines 43–51) with:

```vue
<div class="kofi-buttons">
  <a
    :href="`https://ko-fi.com/${KOFI_USERNAME}`"
    target="_blank"
    rel="noopener noreferrer"
  >
    <img
      height="36"
      style="border: 0; height: 36px;"
      src="https://storage.ko-fi.com/cdn/kofi2.png?v=3"
      alt="Support Patternly on Ko-fi"
    />
  </a>
</div>
```

The `?v=3` query parameter is Ko-fi's versioning scheme for the official button image.

#### 1c. Remove now-unused CSS

Remove the `.custom-kofi-btn`, `.kofi-img`, and `.kofi-text` rules from `<style scoped>` (approximately lines 200–226) since the official image button no longer needs them.

---

## Edge Cases

- **Ko-fi CDN availability:** The official `kofi2.png` image is served from Ko-fi's own CDN. If Ko-fi is unreachable, the image won't load — this is acceptable for a donation button (it's not core app functionality).

---

## Files Changed Summary

| File | Action |
|------|--------|
| `views/DonateView.vue` | ADD `KOFI_USERNAME` constant; UPDATE button to official Ko-fi embed; REMOVE unused CSS rules |

---

## Acceptance Criteria

- [ ] Clicking the button on `/donate` opens `https://ko-fi.com/azh1n` in a new tab
- [ ] The Ko-fi official button image renders correctly
- [ ] No broken images or console errors on the donate page
