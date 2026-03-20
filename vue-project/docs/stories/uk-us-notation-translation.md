# Story: UK / US Crochet Notation Translation

**Status:** Planning
**Priority:** Medium
**Depends on:** none
**Estimated Scope:** ~2 files modified, 1 new utility file, 1 new test file

---

## Problem

UK and US crochet patterns use different abbreviations for the same stitches. The entire stitch set is offset by one level: what UK calls `dc` (double crochet) is what US calls `sc` (single crochet), and so on. The parser currently assumes US notation. When a user pastes a UK pattern, every stitch is silently misidentified — `dc` is treated as US double crochet when it should be single crochet, `tr` is treated as US treble when it should be double crochet, etc. The pattern renders without error but is visually and structurally wrong.

## Stitch Conversion Table

| UK Abbr | UK Name | US Abbr | US Name | Notes |
|---------|---------|---------|---------|-------|
| `ch` | chain | `ch` | chain | Same in both |
| `sl st` | slip stitch | `sl st` | slip stitch | Same in both |
| `dc` | double crochet | `sc` | single crochet | Core offset |
| `htr` | half treble | `hdc` | half double crochet | UK-only signal |
| `tr` | treble | `dc` | double crochet | |
| `dtr` | double treble | `tr` | treble | |
| `ttr` | triple treble | `dtr` | double treble | UK-only signal |

`htr` and `ttr` are unambiguous UK-only abbreviations. `sc` and `hdc` are unambiguous US-only abbreviations.

## Goal

1. Auto-detect when a pasted pattern is likely written in UK notation and offer to convert it.
2. Let users manually select the notation system regardless of auto-detection.
3. Translate UK→US in the raw text before parsing, so all existing parser, rendering, and storage logic works unchanged.

---

## Design

### Auto-detection

During `analyzePattern()` (which runs on every keystroke in the add-pattern modal), call `detectNotation(text)` on the raw pattern text:

- **High confidence UK**: text contains `htr` or `ttr` (UK-only abbreviations)
- **High confidence US**: text contains `sc` or `hdc` (US-only abbreviations)
- **Unknown**: only `ch`, `sl st`, `dc`, `tr`, `dtr` — indeterminate; no banner shown

### Banner

When high-confidence UK is detected and the user has not already selected a notation mode, show a dismissable info banner in the detection results area:

```
┌────────────────────────────────────────────────────────────────┐
│  This looks like UK notation (e.g. dc = US sc).               │
│  [Convert to US]  [Dismiss]                                    │
└────────────────────────────────────────────────────────────────┘
```

Clicking **Convert to US** sets `notationMode = 'UK'` and triggers a re-parse. The textarea content is not modified — translation happens on an internal copy before parsing.

Clicking **Dismiss** hides the banner without changing parse behaviour. The user can still switch manually with the notation toggle.

### Manual notation toggle

A small toggle always visible in the modal input area:

```
Notation:  [● US]  [○ UK → auto-convert]
```

Switching to UK applies the translation before every parse cycle. Switching back to US removes it.

### What gets stored

The DB always receives US-notation stitches. Translation happens pre-parse and is never written back to `patternText`. No schema changes are needed.

---

## Implementation Plan

### Phase 1: New utility — `utils/notationConverter.js`

```js
/**
 * Mapping from UK stitch abbreviations to US equivalents.
 * Order matters: longer matches (ttr, dtr, htr) must precede shorter ones (tr, dc).
 */
const UK_TO_US_MAP = {
  ttr: 'dtr',
  dtr: 'tr',
  htr: 'hdc',
  tr:  'dc',
  dc:  'sc',
}

/**
 * Translate UK crochet abbreviations to US equivalents in raw pattern text.
 * Uses a single-pass word-boundary replacement so already-replaced tokens
 * are never re-matched.
 *
 * @param {string} text - Raw pattern text (may be multi-line)
 * @returns {string} Text with UK abbreviations replaced by US equivalents
 */
export function translateUKtoUS(text) {
  return text.replace(/\b(ttr|dtr|htr|tr|dc)\b/gi, (match) => {
    return UK_TO_US_MAP[match.toLowerCase()]
  })
}

/**
 * Detect whether raw pattern text is likely written in UK or US notation.
 *
 * @param {string} text - Raw pattern text
 * @returns {{ notation: 'UK' | 'US' | null, confidence: 'high' | 'low' }}
 */
export function detectNotation(text) {
  if (/\b(htr|ttr)\b/i.test(text)) return { notation: 'UK', confidence: 'high' }
  if (/\b(sc|hdc)\b/i.test(text))  return { notation: 'US', confidence: 'high' }
  return { notation: null, confidence: 'low' }
}
```

The regex alternation `ttr|dtr|htr|tr|dc` is ordered longest-first so `ttr` is consumed before `tr` can match the `tr` portion of it, and `dtr` is consumed before `tr` can match its tail. Word boundaries (`\b`) prevent partial matches inside longer tokens not in the map.

### Phase 2: State additions in `AddPatternModal.vue`

Add three reactive values near the top of the `<script setup>` block alongside existing detection state:

```js
// Notation mode: 'US' (default) or 'UK' (translate before parse)
const notationMode = ref('US')

// Result of auto-detection on the current input
const detectedNotation = ref({ notation: null, confidence: 'low' })

// True once the user has dismissed the auto-detect banner this session
const notationBannerDismissed = ref(false)
```

### Phase 3: Integration into `analyzePattern()` (~line 593)

At the top of `analyzePattern()`, before any other analysis:

```js
import { detectNotation, translateUKtoUS } from '@/utils/notationConverter'

async function analyzePattern() {
  const raw = patternText.value
  if (!raw.trim()) { /* ... existing early return ... */ }

  // Auto-detection (runs every time regardless of notationMode)
  detectedNotation.value = detectNotation(raw)

  // Translate if user has selected UK mode; otherwise parse as-is
  const textToParse = notationMode.value === 'UK' ? translateUKtoUS(raw) : raw

  // Pass textToParse (not raw) into all subsequent analysis calls:
  detectRowFormat(textToParse)
  detectColors(textToParse)
  detectStitches(textToParse)
  parseRows(textToParse)
  extractUnparsedContent(textToParse)
}
```

Also update the `notationMode` watcher so switching the toggle immediately re-runs analysis:

```js
watch(notationMode, () => analyzePattern())
```

### Phase 4: Banner UI in `AddPatternModal.vue`

Add to the detection results area (around line 196), above the existing detection cards:

```vue
<div
  v-if="detectedNotation.notation === 'UK'
        && notationMode === 'US'
        && !notationBannerDismissed"
  class="notation-banner"
>
  <span>This looks like UK notation (e.g. <code>dc</code> = US <code>sc</code>).</span>
  <div class="notation-banner-actions">
    <button class="btn-convert" @click="notationMode = 'UK'">Convert to US</button>
    <button class="btn-dismiss" @click="notationBannerDismissed = true">Dismiss</button>
  </div>
</div>
```

### Phase 5: Manual notation toggle UI in `AddPatternModal.vue`

Add near the pattern textarea (around line 79), below the textarea or in the format options row:

```vue
<div class="notation-toggle">
  <span class="notation-toggle-label">Notation:</span>
  <label>
    <input type="radio" value="US" v-model="notationMode" /> US
  </label>
  <label>
    <input type="radio" value="UK" v-model="notationMode" /> UK → auto-convert
  </label>
</div>
```

### Phase 6: CSS

Add to `stitch-colors.css` or scoped in `AddPatternModal.vue`:

```css
.notation-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: rgba(255, 193, 7, 0.12);
  border: 1px solid rgba(255, 193, 7, 0.4);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.notation-banner-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-convert {
  font-size: 0.8rem;
  padding: 2px 10px;
  border-radius: 4px;
  background: #ffc107;
  color: #333;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.btn-dismiss {
  font-size: 0.8rem;
  padding: 2px 10px;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  border: 1px solid currentColor;
  cursor: pointer;
  opacity: 0.6;
}

.notation-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.82rem;
  margin-top: 0.4rem;
}

.notation-toggle-label {
  opacity: 0.6;
  font-weight: 500;
}
```

### Phase 7: Tests — `utils/__tests__/notationConverter.spec.js`

```js
import { describe, it, expect } from 'vitest'
import { translateUKtoUS, detectNotation } from '../notationConverter'

describe('translateUKtoUS', () => {
  it('converts dc to sc', () => {
    expect(translateUKtoUS('6dc')).toBe('6sc')
  })
  it('converts htr to hdc', () => {
    expect(translateUKtoUS('2htr')).toBe('2hdc')
  })
  it('converts tr to dc', () => {
    expect(translateUKtoUS('3tr')).toBe('3dc')
  })
  it('converts dtr to tr', () => {
    expect(translateUKtoUS('1dtr')).toBe('1tr')
  })
  it('converts ttr to dtr', () => {
    expect(translateUKtoUS('1ttr')).toBe('1dtr')
  })
  it('does not double-convert: dtr should become tr, not dc', () => {
    expect(translateUKtoUS('1dtr')).toBe('1tr')
  })
  it('does not double-convert: ttr should become dtr, not tr', () => {
    expect(translateUKtoUS('1ttr')).toBe('1dtr')
  })
  it('converts a full row string', () => {
    expect(translateUKtoUS('Round 1: 6dc (6)')).toBe('Round 1: 6sc (6)')
  })
  it('converts a mixed row string', () => {
    expect(translateUKtoUS('2dc, 1htr, 3tr, 1dtr')).toBe('2sc, 1hdc, 3dc, 1tr')
  })
  it('leaves ch and sl st unchanged', () => {
    expect(translateUKtoUS('ch6, sl st')).toBe('ch6, sl st')
  })
  it('is case-insensitive', () => {
    expect(translateUKtoUS('2DC, 1TR')).toBe('2sc, 1dc')
  })
  it('does not corrupt tokens that contain the abbreviation as a substring', () => {
    // "stdc" should NOT be transformed (no word boundary)
    expect(translateUKtoUS('stdc')).toBe('stdc')
  })
})

describe('detectNotation', () => {
  it('detects UK with high confidence when htr is present', () => {
    const result = detectNotation('Round 1: 6dc, 2htr')
    expect(result).toEqual({ notation: 'UK', confidence: 'high' })
  })
  it('detects UK with high confidence when ttr is present', () => {
    const result = detectNotation('2ttr, 1dc')
    expect(result).toEqual({ notation: 'UK', confidence: 'high' })
  })
  it('detects US with high confidence when sc is present', () => {
    const result = detectNotation('6sc, 2dc')
    expect(result).toEqual({ notation: 'US', confidence: 'high' })
  })
  it('detects US with high confidence when hdc is present', () => {
    const result = detectNotation('2hdc, 3dc')
    expect(result).toEqual({ notation: 'US', confidence: 'high' })
  })
  it('returns unknown for ambiguous patterns (only dc/tr/ch)', () => {
    const result = detectNotation('ch6, 2dc, 3tr')
    expect(result).toEqual({ notation: null, confidence: 'low' })
  })
  it('returns unknown for empty text', () => {
    const result = detectNotation('')
    expect(result).toEqual({ notation: null, confidence: 'low' })
  })
  it('is case-insensitive', () => {
    const result = detectNotation('2HTR, 1DC')
    expect(result.notation).toBe('UK')
  })
})
```

---

## Edge Cases

- **Ambiguous patterns (only `dc`, `tr`, `ch`):** Detection returns `unknown` — no banner shown. The manual toggle is the escape hatch for users who know their pattern is UK.
- **Pattern contains both `sc` and `htr`:** Conflicting signals; `htr` wins (checked first). This is a malformed pattern regardless — translate and let the user verify the result.
- **User pastes a new pattern after dismissing the banner:** `notationBannerDismissed` is reset on modal open (it's a local `ref`), so the banner can appear again for a different pattern in a new session.
- **User types incrementally:** Auto-detection runs on every keystroke. The banner may appear mid-typing as soon as `htr` or `ttr` is encountered; this is intentional and matches how existing detection (row format, colors) already works.
- **Translations inside repeat syntax:** `(2dc, 1htr) x6` → `(2sc, 1hdc) x6`. The regex operates on the raw string before repeat parsing, so this works correctly.
- **Case preservation of output:** The regex replacement uses the lowercase value from the map. `2DC` → `2sc`. This is fine since the parser is already case-insensitive.

---

## Files Changed Summary

| File | Action |
|------|--------|
| `utils/notationConverter.js` | NEW — `translateUKtoUS`, `detectNotation` |
| `utils/__tests__/notationConverter.spec.js` | NEW — unit tests |
| `components/AddPatternModal.vue` | ADD — `notationMode`, `detectedNotation`, `notationBannerDismissed` state; integrate detection + translation into `analyzePattern()`; banner UI; notation toggle UI; CSS |

---

## Acceptance Criteria

- [ ] `translateUKtoUS('Round 1: 6dc, 2htr (8)')` returns `'Round 1: 6sc, 2hdc (8)'`
- [ ] `translateUKtoUS('1dtr')` returns `'1tr'` (not `'1dc'` — no double-conversion)
- [ ] `detectNotation` returns `{ notation: 'UK', confidence: 'high' }` for text containing `htr` or `ttr`
- [ ] `detectNotation` returns `{ notation: 'US', confidence: 'high' }` for text containing `sc` or `hdc`
- [ ] `detectNotation` returns `{ notation: null, confidence: 'low' }` for ambiguous text
- [ ] Pasting a UK pattern triggers the banner automatically (high-confidence detection only)
- [ ] Clicking "Convert to US" in the banner re-parses the pattern as US notation correctly
- [ ] Clicking "Dismiss" hides the banner without changing parse behaviour
- [ ] The manual notation toggle is always visible and switching it immediately re-parses
- [ ] A pattern processed with `notationMode = 'UK'` stores US-notation stitches in the DB
- [ ] Existing US patterns are unaffected (no regression)
- [ ] All converter unit tests pass
