# Story: Per-Stitch Yarn Color Support

**Status:** Done
**Priority:** Medium
**Estimated Scope:** ~15 files modified, ~2 new test files

**Split-out stories:**
- [Color-Only Stitch Parsing](./color-only-stitch-parsing.md) — freeform color labels, implicit single crochet, hex color support
- [RS/WS Side Indicator](../rs-ws-side-indicator.md) — right side / wrong side row parsing and display

---

## Problem

Pattern content currently supports colors only at the **row level**. A row like `"Row 1: with Color A, 22sc"` assigns `"A"` to the entire row. There is no way to express that individual stitches within a row use different yarn colors — e.g., `"2bs green, 3sl blue, 1sc red"`.

## Goal

Allow users to specify yarn color per stitch in the pattern content string. The system should parse, store, and render per-stitch colors while remaining backward-compatible with existing patterns that have no per-stitch color.

---

## Content Format Design

### Current format
```
Round 1: 6sc in magic ring
Round 2: 1inc in each st (12)
Round 3: (1sc, 1inc) x6 (18)
Row 1: with Color A, 22sc
```

Stitches are stored as plain strings: `["6sc", "1inc", "1sc", "2dc"]`

### New format (user-facing)
```
Row 1: 2bs green, 3sl blue, 1sc
Row 2: (1sc red, 1inc blue) x6 (18)
Row 3: with Color A, 4dc green, 2sc blue
```

Color is an optional word after the stitch code, separated by a space.

### Internal stitch string encoding
```
Current:  "2bs"
New:      "2bs:green"    (colon-delimited color suffix)
No color: "1sc"          (no colon = no per-stitch color, backward compatible)
```

The colon delimiter avoids ambiguity with stitch names and is never present in existing data. All downstream helpers strip the `:color` suffix before doing type/count logic.

---

## Database Impact

**No schema migration required.**

- The `content` field on pattern documents is a free-form text string. The new notation (`2bs green`) is just richer text.
- The `stitches` arrays inside parsed row objects are arrays of strings. The new strings (`"2bs:green"`) are still strings.
- Existing patterns with `"2bs"` strings continue to parse identically — `getStitchColor()` returns `null`.

### Existing database issues to fix alongside this work

These are pre-existing problems (from CODE_REVIEW.md) that touch the same code paths and should be fixed in the same PR:

1. **Field name mismatch (issue #10):** `firestore.indexes.json` indexes `timestamp`, but `stores/pattern.js:27` orders by `createdAt`. Fix: update the index to `createdAt`, or update the store to use `timestamp`. Recommend aligning on `createdAt` everywhere since that's what the store writes.

2. **PatternListView saves without userId (issue #15):** `views/PatternListView.vue:328` calls `addDoc` without setting `userId`. Fix: add `userId: auth.currentUser.uid` to the saved object.

3. **Local state drift (issue #25):** `stores/pattern.js:71-74` pushes the caller's object locally but the Firestore write includes `createdAt`/`updatedAt`. Fix: push the full object with timestamps to local state.

---

## Implementation Plan

### Phase 1: Core helpers (new shared module)

**Create `vue-project/src/composables/useStitchHelpers.js`**

Extract the duplicated stitch logic from 6+ components into one composable. This is a prerequisite — without it, we'd have to make the same color-parsing change in 6 places.

```js
// vue-project/src/composables/useStitchHelpers.js

/**
 * Strip the `:color` suffix from an internal stitch string.
 * "2bs:green" → "2bs"
 * "1sc"       → "1sc"
 */
export function getStitchBase(stitch) {
  if (!stitch) return ''
  return stitch.split(':')[0]
}

/**
 * Extract the yarn color from an internal stitch string.
 * "2bs:green" → "green"
 * "1sc"       → null
 */
export function getStitchColor(stitch) {
  if (!stitch || !stitch.includes(':')) return null
  return stitch.split(':')[1] || null
}

/**
 * Extract the numeric count prefix.
 * "2bs:green" → 2
 * "sc"        → 1
 */
export function getStitchCount(stitch) {
  const base = getStitchBase(stitch)
  const match = base.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : 1
}

/**
 * Extract the stitch type abbreviation.
 * "2bs:green" → "bs"
 * "1sc"       → "sc"
 */
export function getStitchType(stitch) {
  const base = getStitchBase(stitch)
  return base.replace(/^\d+/, '').toLowerCase()
}

/**
 * Map stitch type to CSS class name.
 * "2bs:green" → "stitch-bs"
 */
export function getStitchClass(stitch) {
  const type = getStitchType(stitch)
  const classMap = {
    sc: 'stitch-sc', dc: 'stitch-dc', hdc: 'stitch-hdc',
    tr: 'stitch-tr', dtr: 'stitch-dtr', ch: 'stitch-ch',
    sl: 'stitch-sl', inc: 'stitch-inc', dec: 'stitch-dec',
    bs: 'stitch-bs', ns: 'stitch-ns',
  }
  return classMap[type] || ''
}

/**
 * Expand a stitch string into individual stitch entries.
 * "3sc:green" → ["sc:green", "sc:green", "sc:green"]
 * "2dc"       → ["dc", "dc"]
 */
export function expandStitch(stitch) {
  const count = getStitchCount(stitch)
  const type = getStitchType(stitch)
  const color = getStitchColor(stitch)
  const single = color ? `${type}:${color}` : type
  return Array(count).fill(single)
}

/**
 * Expand an entire row's stitches array into individual entries.
 * Handles both array and repeat-object formats.
 */
export function processRowStitches(stitches) {
  if (!stitches) return []
  if (stitches.repeated) {
    // Handle repeat structure
    const before = (stitches.beforeRepeat || []).flatMap(expandStitch)
    const repeated = (stitches.repeatedStitches || []).flatMap(expandStitch)
    const after = (stitches.afterRepeat || []).flatMap(expandStitch)
    const repeatCount = parseInt(stitches.repeatCount, 10) || 1
    const repeatedExpanded = Array(repeatCount).fill(repeated).flat()
    return [...before, ...repeatedExpanded, ...after]
  }
  if (Array.isArray(stitches)) {
    return stitches.flatMap(expandStitch)
  }
  return []
}

/**
 * Resolve a yarn color name/code to a hex value.
 * "green" → "#4caf50"
 * "A"     → "#ff5252"
 * null    → null
 */
export function getColorHex(color) {
  if (!color) return null
  const colorMap = {
    'red': '#ff5252', 'green': '#4caf50', 'blue': '#2196f3',
    'yellow': '#ffc107', 'purple': '#9c27b0', 'orange': '#ff9800',
    'pink': '#e91e63', 'turquoise': '#00bcd4', 'black': '#333333',
    'white': '#ffffff', 'brown': '#795548', 'gray': '#607d8b',
    'a': '#ff5252', 'b': '#4caf50', 'c': '#2196f3',
    'd': '#ffc107', 'e': '#9c27b0', 'f': '#ff9800',
    'mc': '#333333', 'cc': '#e91e63', 'cc1': '#e91e63', 'cc2': '#00bcd4',
  }
  return colorMap[color.toLowerCase()] || '#888888'
}
```

### Phase 2: Update the parser in AddPatternModal.vue

All changes are in `vue-project/src/components/AddPatternModal.vue`.

#### Step 2a: Update `normalizeStitchCode()` (line 1175)

Current logic parses `"2bs"` → `"2bs"`. Update to also capture a trailing color word.

```js
// AddPatternModal.vue:1175
// BEFORE:
const normalizeStitchCode = (code) => {
  if (!code) return null
  const cleanCode = code.replace(/[.,;:!?]+$/, '').trim()
  for (const pattern of stitchPatterns) {
    const match = cleanCode.match(pattern.pattern)
    if (match) {
      const count = match[1] || '1'
      return `${count}${pattern.name}`
    }
  }
  const generalMatch = cleanCode.match(/(\d+)([a-zA-Z]+)/)
  if (generalMatch) {
    return `${generalMatch[1]}${generalMatch[2].toLowerCase()}`
  }
  return null
}

// AFTER:
const normalizeStitchCode = (code) => {
  if (!code) return null
  const cleanCode = code.replace(/[.,;:!?]+$/, '').trim()

  // Check for trailing color word: "2bs green" → stitch="2bs", color="green"
  const colorSuffixMatch = cleanCode.match(
    /^(.+?)\s+(red|green|blue|yellow|purple|orange|pink|turquoise|black|white|brown|gray|[a-f]|mc|cc\d*)$/i
  )
  const stitchPart = colorSuffixMatch ? colorSuffixMatch[1].trim() : cleanCode
  const colorPart = colorSuffixMatch ? colorSuffixMatch[2].toLowerCase() : null

  for (const pattern of stitchPatterns) {
    const match = stitchPart.match(pattern.pattern)
    if (match) {
      const count = match[1] || '1'
      const base = `${count}${pattern.name}`
      return colorPart ? `${base}:${colorPart}` : base
    }
  }
  const generalMatch = stitchPart.match(/(\d+)([a-zA-Z]+)/)
  if (generalMatch) {
    const base = `${generalMatch[1]}${generalMatch[2].toLowerCase()}`
    return colorPart ? `${base}:${colorPart}` : base
  }
  return null
}
```

#### Step 2b: Update `extractStitchesFromText()` (line 1200)

No structural change needed — it already calls `normalizeStitchCode()` for each comma-separated part. The updated `normalizeStitchCode` will naturally produce `"2bs:green"` strings. **Verify** that the comma-split at line 1208 doesn't break on `"2bs green, 3sl blue"` — it splits on commas, so `"2bs green"` is one token. This works.

#### Step 2c: Update `extractStitches()` (line 1017)

The repeat-pattern branch at line 1038 extracts content inside parentheses and passes it to `extractStitchesFromText()`. No change needed — the color suffix flows through.

#### Step 2d: No change to `parseRows()` (line 853)

Row objects are constructed at lines 902-907 and 916-921 as `{ number, text, color, stitches }`. The `stitches` value comes from `extractStitches()` which now returns color-annotated strings. The row-level `color` field remains for row-wide color declarations.

### Phase 3: Update rendering components

Each component currently has its own copy of `getStitchType`, `getStitchCount`, `getStitchClass`, and `processRowStitches`. Replace them all with imports from the shared composable.

#### 3a. `ColorBlockStitches.vue` (lines 164-238)

```diff
+ import { processRowStitches, getStitchClass, getStitchColor, getColorHex } from '@/composables/useStitchHelpers'

- // DELETE local processRowStitches (lines 164-193)
- // DELETE local getStitchClass (lines 196-218)
- // DELETE local getStitchCount (lines 220-228)
- // DELETE local getStitchType (lines 230-238)
```

In the template where stitch blocks are rendered (lines 26-46), add a yarn-color indicator:

```vue
<!-- Current: just the stitch class for background color -->
<div class="stitch-block" :class="getStitchClass(stitch)">
  {{ stitch }}
</div>

<!-- Updated: add yarn-color border when present -->
<div
  class="stitch-block"
  :class="getStitchClass(stitch)"
  :style="getStitchColor(stitch) ? { borderLeft: '3px solid ' + getColorHex(getStitchColor(stitch)) } : {}"
>
  {{ getStitchType(stitch) }}
</div>
```

#### 3b. `SymbolStitches.vue` (lines 334-437)

Same pattern — delete local functions (lines 334-437), import from composable. Update template (lines 12-141) to include yarn-color indicator on each stitch symbol cell.

#### 3c. `TextStitches.vue` (lines 281-384)

Delete local functions (lines 281-384), import from composable. In the text display template, append the color name when present:

```vue
<!-- Show "2sc green" instead of just "2sc" -->
<span class="stitch-text" :class="getStitchClass(stitch)">
  {{ getStitchBase(stitch) }}
  <span v-if="getStitchColor(stitch)" class="yarn-color-tag">
    {{ getStitchColor(stitch) }}
  </span>
</span>
```

#### 3d. `CrochetNotationView.vue` (lines 516-525, 648-689)

Delete local `getStitchType` (line 522), `getStitchCount` (line 516), and update `getRowStitches` (line 648) to use the composable's `expandStitch`. Also fix the existing bug at line 652 where `displayRepeatedStitchesSeparately` ref is accessed without `.value`.

#### 3e. `RowEditModal.vue` (lines 348-416)

Delete local `getStitchType` (line 348), `getStitchClass` (line 354), `getColorHex` (line 372). Import all from composable.

Add a per-stitch color input to the edit form. In the stitch list template (around line 80-100), add a small color dropdown/text input next to each stitch:

```vue
<div v-for="(stitch, idx) in editStitches" :key="idx" class="stitch-edit-row">
  <span class="stitch-label" :class="getStitchClass(stitch)">
    {{ getStitchBase(stitch) }}
  </span>
  <input
    type="text"
    :value="getStitchColor(stitch) || ''"
    @input="updateStitchColor(idx, $event.target.value)"
    placeholder="color"
    class="stitch-color-input"
  />
</div>
```

Add helper to update the color on a stitch string:

```js
function updateStitchColor(idx, color) {
  const base = getStitchBase(editStitches.value[idx])
  editStitches.value[idx] = color ? `${base}:${color.toLowerCase()}` : base
}
```

#### 3f. `PatternPreviewSection.vue` (lines 192-222)

Delete local `getStitchCount` (line 192), `getStitchType` (line 197), `getStitchClass` (line 202). Import from composable. Update template (lines 85-126) to show yarn-color indicator.

#### 3g. `PatternChartView.vue` (line 24 references `getColorHex`)

Import `getColorHex` from composable instead of expecting it locally.

### Phase 4: CSS changes

**File: `vue-project/src/assets/styles/stitch-colors.css`**

Add yarn-color indicator styles after the existing stitch-type classes (after line 78):

```css
/* Yarn color indicator — left border on stitch blocks */
.stitch-block[style*="border-left"] {
  border-left-width: 3px !important;
  border-left-style: solid !important;
}

/* Yarn color tag in text mode */
.yarn-color-tag {
  font-size: 0.7em;
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 2px;
  background: rgba(0, 0, 0, 0.1);
  vertical-align: middle;
}
```

### Phase 5: Stitch color input in AddPatternModal upload flow

In `AddPatternModal.vue`, the pattern preview section (around lines 440-460) shows parsed rows. Update to display per-stitch colors in the preview so users get feedback during upload.

The preview already calls the rendering sub-components (ColorBlockStitches, SymbolStitches, TextStitches). Once those components are updated in Phase 3, the preview will automatically show yarn colors. No additional work needed here.

---

## Unit Tests

### Test file 1: `vue-project/src/composables/__tests__/useStitchHelpers.spec.js`

This is the most important test file — it validates all the shared parsing and helper logic.

```js
import { describe, it, expect } from 'vitest'
import {
  getStitchBase,
  getStitchColor,
  getStitchCount,
  getStitchType,
  getStitchClass,
  expandStitch,
  processRowStitches,
  getColorHex,
} from '../useStitchHelpers'

describe('useStitchHelpers', () => {

  describe('getStitchBase', () => {
    it('returns full string when no color suffix', () => {
      expect(getStitchBase('2bs')).toBe('2bs')
    })
    it('strips color suffix', () => {
      expect(getStitchBase('2bs:green')).toBe('2bs')
    })
    it('handles empty/null input', () => {
      expect(getStitchBase('')).toBe('')
      expect(getStitchBase(null)).toBe('')
    })
  })

  describe('getStitchColor', () => {
    it('returns null when no color', () => {
      expect(getStitchColor('2bs')).toBeNull()
    })
    it('extracts color from suffix', () => {
      expect(getStitchColor('2bs:green')).toBe('green')
    })
    it('returns null for empty input', () => {
      expect(getStitchColor('')).toBeNull()
      expect(getStitchColor(null)).toBeNull()
    })
    it('handles edge case of trailing colon with no color', () => {
      expect(getStitchColor('2bs:')).toBeNull()
    })
  })

  describe('getStitchCount', () => {
    it('extracts numeric prefix', () => {
      expect(getStitchCount('3sc')).toBe(3)
      expect(getStitchCount('12dc')).toBe(12)
    })
    it('returns 1 when no prefix', () => {
      expect(getStitchCount('sc')).toBe(1)
    })
    it('works with color suffix', () => {
      expect(getStitchCount('3sc:blue')).toBe(3)
    })
  })

  describe('getStitchType', () => {
    it('extracts stitch type', () => {
      expect(getStitchType('3sc')).toBe('sc')
      expect(getStitchType('1hdc')).toBe('hdc')
    })
    it('extracts type with color suffix', () => {
      expect(getStitchType('2dc:red')).toBe('dc')
    })
    it('lowercases the type', () => {
      expect(getStitchType('2DC')).toBe('dc')
    })
    it('handles type-only input (no count)', () => {
      expect(getStitchType('sc')).toBe('sc')
    })
  })

  describe('getStitchClass', () => {
    it('maps known stitch types to CSS classes', () => {
      expect(getStitchClass('2sc')).toBe('stitch-sc')
      expect(getStitchClass('1dc:green')).toBe('stitch-dc')
      expect(getStitchClass('3hdc')).toBe('stitch-hdc')
      expect(getStitchClass('1inc')).toBe('stitch-inc')
      expect(getStitchClass('1bs:blue')).toBe('stitch-bs')
    })
    it('returns empty string for unknown types', () => {
      expect(getStitchClass('2xyz')).toBe('')
    })
  })

  describe('expandStitch', () => {
    it('expands count into individual entries', () => {
      expect(expandStitch('3sc')).toEqual(['sc', 'sc', 'sc'])
    })
    it('preserves color through expansion', () => {
      expect(expandStitch('2dc:green')).toEqual(['dc:green', 'dc:green'])
    })
    it('handles count of 1', () => {
      expect(expandStitch('1sc')).toEqual(['sc'])
    })
    it('handles no-count input', () => {
      expect(expandStitch('sc')).toEqual(['sc'])
    })
  })

  describe('processRowStitches', () => {
    it('expands a simple array of stitch strings', () => {
      expect(processRowStitches(['2sc', '1dc'])).toEqual(['sc', 'sc', 'dc'])
    })
    it('preserves colors through expansion', () => {
      expect(processRowStitches(['2sc:red', '1dc:blue'])).toEqual([
        'sc:red', 'sc:red', 'dc:blue'
      ])
    })
    it('handles repeat structure', () => {
      const stitches = {
        repeated: true,
        beforeRepeat: [],
        repeatedStitches: ['1sc', '1inc'],
        afterRepeat: [],
        repeatCount: 3,
      }
      expect(processRowStitches(stitches)).toEqual([
        'sc', 'inc', 'sc', 'inc', 'sc', 'inc'
      ])
    })
    it('handles repeat structure with colors', () => {
      const stitches = {
        repeated: true,
        beforeRepeat: ['1ch:red'],
        repeatedStitches: ['1sc:green', '1inc:blue'],
        afterRepeat: [],
        repeatCount: 2,
      }
      expect(processRowStitches(stitches)).toEqual([
        'ch:red', 'sc:green', 'inc:blue', 'sc:green', 'inc:blue'
      ])
    })
    it('returns empty array for null/undefined', () => {
      expect(processRowStitches(null)).toEqual([])
      expect(processRowStitches(undefined)).toEqual([])
    })
  })

  describe('getColorHex', () => {
    it('maps color names to hex', () => {
      expect(getColorHex('green')).toBe('#4caf50')
      expect(getColorHex('Red')).toBe('#ff5252')
    })
    it('maps letter codes to hex', () => {
      expect(getColorHex('a')).toBe('#ff5252')
      expect(getColorHex('B')).toBe('#4caf50')
    })
    it('maps MC/CC codes', () => {
      expect(getColorHex('mc')).toBe('#333333')
      expect(getColorHex('cc1')).toBe('#e91e63')
    })
    it('returns fallback gray for unknown colors', () => {
      expect(getColorHex('magenta')).toBe('#888888')
    })
    it('returns null for null/undefined input', () => {
      expect(getColorHex(null)).toBeNull()
      expect(getColorHex(undefined)).toBeNull()
    })
  })
})
```

### Test file 2: `vue-project/src/components/__tests__/AddPatternModal.parsing.spec.js`

Tests the parser's ability to handle the new color-in-stitch format. This tests the actual functions inside AddPatternModal. Since `normalizeStitchCode` and `extractStitchesFromText` are not exported, we test through the component's behavior — feed it pattern text and verify parsed output.

```js
import { describe, it, expect } from 'vitest'

// Since parser functions are internal to AddPatternModal, we test
// by importing the component and triggering parse via the textarea.
// Alternatively, extract the parser into a module (recommended).

// NOTE: If the parser is extracted to a separate module as recommended
// in the refactoring notes below, import directly:
// import { normalizeStitchCode, extractStitchesFromText } from '@/utils/patternParser'

describe('Pattern parser — per-stitch color support', () => {

  describe('normalizeStitchCode', () => {
    // These tests assume the function is extracted to a testable module.

    it('parses plain stitch code', () => {
      expect(normalizeStitchCode('2sc')).toBe('2sc')
    })
    it('parses stitch with color suffix', () => {
      expect(normalizeStitchCode('2bs green')).toBe('2bs:green')
    })
    it('handles color names case-insensitively', () => {
      expect(normalizeStitchCode('3dc Red')).toBe('3dc:red')
    })
    it('handles letter color codes', () => {
      expect(normalizeStitchCode('1sc A')).toBe('1sc:a')
    })
    it('handles MC/CC codes', () => {
      expect(normalizeStitchCode('2hdc MC')).toBe('2hdc:mc')
      expect(normalizeStitchCode('1tr CC2')).toBe('1tr:cc2')
    })
    it('does not treat unknown words as colors', () => {
      expect(normalizeStitchCode('2sc together')).toBeNull()
    })
    it('returns null for garbage input', () => {
      expect(normalizeStitchCode('hello world')).toBeNull()
    })
  })

  describe('extractStitchesFromText', () => {
    it('parses comma-separated stitches with colors', () => {
      const result = extractStitchesFromText('2bs green, 3sl blue, 1sc')
      expect(result).toEqual(['2bs:green', '3sl:blue', '1sc'])
    })
    it('parses mixed — some with colors, some without', () => {
      const result = extractStitchesFromText('1sc red, 2dc, 1hdc blue')
      expect(result).toEqual(['1sc:red', '2dc', '1hdc:blue'])
    })
    it('backward-compatible with no-color stitches', () => {
      const result = extractStitchesFromText('2sc, 1dc, 3hdc')
      expect(result).toEqual(['2sc', '1dc', '3hdc'])
    })
  })
})
```

### Test file 3: Update existing `AddPatternModal.spec.js`

**File: `vue-project/src/components/__tests__/AddPatternModal.spec.js`**

The existing tests (lines 5-182) validate the component mounts and form submissions but don't test parsing. Add a section:

```js
describe('pattern parsing with colors', () => {
  it('preserves stitch colors in parsed output when pattern text includes them', async () => {
    const wrapper = createWrapper({ modelValue: true })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Row 1: 2sc green, 1dc blue\nRow 2: 3hdc')
    // Trigger parse and verify the parsedRows computed includes color-annotated stitches
    // (Exact assertion depends on how parsedRows is exposed — may need to check emitted data)
  })
})
```

---

## Refactoring Notes

### Strongly recommended: Extract parser into its own module

The parsing logic (`normalizeStitchCode`, `extractStitchesFromText`, `extractStitches`, `parseRows`, `extractColor`, `detectRowFormat`) is currently embedded inside `AddPatternModal.vue` (lines 853-1229). This makes it untestable in isolation.

**Recommended:** Create `vue-project/src/utils/patternParser.js` and move all parsing functions there. The component calls the utility; tests import the utility directly.

This is not strictly required for the color feature, but it makes the unit tests in Test file 2 above actually runnable without mounting the full component.

### `getColorHex` partial-match bug (issue #46)

The current `getColorHex` in `RowEditModal.vue:408-410` does partial string matching — `"Turquoise".includes("a")` matches the "A" color key. The shared composable version above uses exact `toLowerCase()` key lookup, which fixes this.

---

## Implementation Order

1. Create `composables/useStitchHelpers.js` with all shared functions
2. Write `composables/__tests__/useStitchHelpers.spec.js` and verify tests pass
3. Update `normalizeStitchCode()` in `AddPatternModal.vue:1175` for color suffix parsing
4. Extract parser to `utils/patternParser.js` (optional but recommended)
5. Write parser tests (`AddPatternModal.parsing.spec.js`)
6. Update `ColorBlockStitches.vue` — replace local helpers with imports, add yarn-color rendering
7. Update `SymbolStitches.vue` — same treatment
8. Update `TextStitches.vue` — same treatment
9. Update `CrochetNotationView.vue` — replace helpers, fix `.value` bug (issue #7)
10. Update `RowEditModal.vue` — replace helpers, add per-stitch color input
11. Update `PatternPreviewSection.vue` — replace helpers, add color indicator
12. Update `PatternChartView.vue` — import shared `getColorHex`
13. Update `stitch-colors.css` — add yarn-color indicator styles
14. Fix database issues (#10, #15, #25) in `firestore.indexes.json`, `PatternListView.vue`, `stores/pattern.js`
15. Manual QA: upload a pattern with per-stitch colors, verify parse → preview → save → load → render cycle

---

## Acceptance Criteria

- [ ] Pattern text like `"2bs green, 3sl blue, 1sc"` is correctly parsed into `["2bs:green", "3sl:blue", "1sc"]`
- [ ] Existing patterns without per-stitch colors render identically to before (no regression)
- [ ] Per-stitch yarn colors are visually indicated in ColorBlock, Symbol, and Text stitch views
- [ ] RowEditModal allows editing per-stitch color
- [ ] Repeat patterns preserve per-stitch colors through expansion
- [ ] All unit tests in `useStitchHelpers.spec.js` pass
- [ ] Parser tests for color-annotated stitches pass
- [ ] Firestore index matches the field name used in queries
- [ ] PatternListView includes `userId` when saving
- [ ] Pattern store local state includes `createdAt`/`updatedAt` after add

---

## Files Changed Summary

| File | Action | Lines Affected |
|------|--------|----------------|
| `composables/useStitchHelpers.js` | **NEW** | ~100 lines |
| `composables/__tests__/useStitchHelpers.spec.js` | **NEW** | ~170 lines |
| `components/__tests__/AddPatternModal.parsing.spec.js` | **NEW** | ~50 lines |
| `components/AddPatternModal.vue` | Modify `normalizeStitchCode` | Lines 1175-1197 |
| `components/pattern/stitches/ColorBlockStitches.vue` | Delete local helpers, import composable, update template | Lines 164-238, 26-46 |
| `components/pattern/stitches/SymbolStitches.vue` | Delete local helpers, import composable, update template | Lines 334-437, 12-141 |
| `components/pattern/stitches/TextStitches.vue` | Delete local helpers, import composable, update template | Lines 281-384, 12-93 |
| `views/CrochetNotationView.vue` | Delete local helpers, import composable, fix .value bug | Lines 516-525, 648-689 |
| `components/pattern/RowEditModal.vue` | Delete local helpers, import composable, add color input | Lines 348-416, 80-100 |
| `components/pattern/PatternPreviewSection.vue` | Delete local helpers, import composable | Lines 192-222, 85-126 |
| `components/pattern/PatternChartView.vue` | Import shared `getColorHex` | Line 24 |
| `assets/styles/stitch-colors.css` | Add yarn-color indicator styles | After line 78 |
| `firestore.indexes.json` | Fix field name: `timestamp` → `createdAt` | Lines 8-13 |
| `views/PatternListView.vue` | Add `userId` to saved pattern | Line 328 |
| `stores/pattern.js` | Include timestamps in local state push | Lines 71-74 |
