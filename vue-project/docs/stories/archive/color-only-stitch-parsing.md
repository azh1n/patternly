# Story: Color-Only Stitch Parsing (Implicit Single Crochet)

**Status:** Done
**Priority:** Medium
**Depends on:** [Per-Stitch Yarn Color Support](./per-stitch-color-support.md)
**Estimated Scope:** ~3 files modified, 1 test file updated

---

## Problem

Colorwork patterns (tapestry crochet, C2C blankets, pixel art) often omit the stitch type entirely because the entire piece is worked in single crochet. The color is the only instruction that changes:

```
Row 1 [RS]: WHT4, (GRN) x 104, WHT 102
Row 2 [WS]: BLK 3, BGTE 106, TAN 1
Row 3: LtPink, WHT 5, BLK 2
Row 4: #FF5733 4, #00b 2, WHT 6
```

This means:
- `WHT4` → 4 single crochet in WHT
- `(GRN) x 104` → 104 single crochet in GRN (repeat syntax)
- `BLK` → 1 single crochet in BLK
- `#FF5733 4` → 4 single crochet in hex color #FF5733

Currently `normalizeStitchCode` looks for a stitch type first (`sc`, `dc`, `hdc`, etc.) and treats the color as an optional trailing suffix. When there's no stitch type at all — just a color label with an optional count — the function returns `null` and the stitch is silently dropped.

## Goal

When a token contains only a color label (optionally with a count), assume single crochet and produce the standard internal encoding. The color label is freeform text — it is **not** restricted to a fixed set of known color names. The user can review and correct all parsed results in the existing preview/edit UI before saving.

---

## Design Decisions

### Color labels are freeform

The parser does **not** require the color label to be a recognized name like "red" or "green." Pattern authors use arbitrary abbreviations: `BLK`, `WHT`, `BGTE`, `TAN`, `LtPink`, etc. The parser accepts any alphabetic string as a color label.

### Constraints on color labels

- **Alpha only, 1-10 characters** — matches `[a-zA-Z]{1,10}`. This avoids swallowing instruction text. No digits, no special characters in the label itself.
- **Digits adjacent to a label are always stitch count** — `4BLK` → count=4, label=`BLK`. `CC2` → label=`CC`, count=2.
- **Hex colors are the exception** — a `#` prefix followed by exactly 3 or 6 hex characters is treated as the color label: `#FF5733`, `#00b`. The `#` is the distinguishing marker.

### Original casing is preserved

`4BLK` → `4sc:BLK` (not lowercased). The label is displayed on the frontend exactly as the user wrote it.

### Unknown labels render with a default color

`getColorHex` continues to map known names (red, green, etc.) to hex values. Unknown labels like `BLK` or `BGTE` get the existing fallback gray (`#888888`). The label text is always visible on the frontend so the user knows which yarn it refers to. No new color abbreviation mappings are added — the user can map colors via the existing color mapping UI in AddPatternModal.

### Aggressive parsing, user reviews

The parser is intentionally greedy — a bare `BLK` with no count is parsed as `1sc:BLK`. If the parser misinterprets something, the user corrects it in the existing preview/edit flow (PatternPreviewSection, RowEditModal, UnparsedContentSection) before saving.

### Existing stitch parsing takes priority

The color-only fallback is the **last** step in `normalizeStitchCode`. Stitch patterns (`stitchPatterns` array) and the general `(\d+)([a-zA-Z]+)` pattern are checked first. So `2sc`, `3dc red`, `1hdc` all continue to parse exactly as before.

---

## Format Variations to Support

### Standard color labels (alpha only)

| Input token | Count | Label | Internal encoding |
|-------------|-------|-------|-------------------|
| `BLK4` | 4 | BLK | `4sc:BLK` |
| `BLK 4` | 4 | BLK | `4sc:BLK` |
| `4BLK` | 4 | BLK | `4sc:BLK` |
| `WHT 102` | 102 | WHT | `102sc:WHT` |
| `102WHT` | 102 | WHT | `102sc:WHT` |
| `BLK` | 1 | BLK | `1sc:BLK` |
| `BGTE` | 1 | BGTE | `1sc:BGTE` |
| `LtPink` | 1 | LtPink | `1sc:LtPink` |
| `Green` | 1 | Green | `1sc:Green` |
| `Green 3` | 3 | Green | `3sc:Green` |
| `CC2` | 2 | CC | `2sc:CC` |
| `MC` | 1 | MC | `1sc:MC` |

### Hex color labels

| Input token | Count | Label | Internal encoding |
|-------------|-------|-------|-------------------|
| `#FF5733` | 1 | #FF5733 | `1sc:#FF5733` |
| `#FF5733 4` | 4 | #FF5733 | `4sc:#FF5733` |
| `4#FF5733` | 4 | #FF5733 | `4sc:#FF5733` |
| `#00b` | 1 | #00b | `1sc:#00b` |
| `#00b 2` | 2 | #00b | `2sc:#00b` |

### Repeat syntax (no parser changes needed)

| Input | How it's handled |
|-------|-----------------|
| `(GRN) x 104` | Repeat parser extracts `GRN`, passes to `normalizeStitchCode` → `1sc:GRN`, repeat count = 104 |
| `(BGTE) x 34` | Same: `1sc:BGTE` x 34 |
| `(#FF5733) x 10` | Same: `1sc:#FF5733` x 10 |

---

## Implementation Plan

### Phase 1: Update `normalizeStitchCode` in `patternParser.js`

Add two new fallback branches at the end of the function, before `return null`.

Current flow:
1. Strip trailing punctuation
2. Check for trailing color word (for stitch+color like `"2bs green"`)
3. Try all `stitchPatterns` regexes
4. Try general `(\d+)([a-zA-Z]+)` pattern
5. **Return null** ← color-only tokens fall through here

New steps 5 and 6 (before the final `return null`):

```js
// Step 5: Hex color fallback
// Matches: #FF5733, 4#FF5733, #FF5733 4, #00b, 2#00b, #00b 2
const hexColorRegex = /^(\d+)?\s*(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)\s*(\d+)?$/
const hexMatch = cleanCode.match(hexColorRegex)
if (hexMatch) {
  const count = hexMatch[1] || hexMatch[3] || '1'
  const color = hexMatch[2]  // preserve as-is including #
  return `${count}sc:${color}`
}

// Step 6: Color-only fallback
// Any alphabetic label (1-10 chars) with optional leading/trailing count.
// Digits are always treated as stitch count, never part of the label.
// Assumes single crochet. Original casing preserved.
const colorOnlyRegex = /^(\d+)?\s*([a-zA-Z]{1,10})\s*(\d+)?$/
const colorOnlyMatch = cleanCode.match(colorOnlyRegex)
if (colorOnlyMatch) {
  const count = colorOnlyMatch[1] || colorOnlyMatch[3] || '1'
  const color = colorOnlyMatch[2]  // preserve original casing
  return `${count}sc:${color}`
}
```

**Important interaction with step 4 (general pattern):** The existing general pattern `(\d+)([a-zA-Z]+)` at step 4 will match things like `4BLK` as count=`4`, type=`blk`, producing `4blk` (lowercased, no color). We need to ensure step 4 doesn't swallow color-only tokens. Two options:

- **Option A:** Remove or restrict step 4 so it only matches known stitch-like patterns. Risk: may break other parsing.
- **Option B:** Keep step 4 but have step 2 (trailing color word check) handle the `count + color` case. Since step 2's regex only matches known color names, it won't catch `4BLK`.
- **Option C (recommended):** In step 4, check if the extracted "type" is a known stitch type before accepting the match. If it's not a known stitch type, fall through to the color-only branch.

```js
// Step 4 — updated: only accept general match if it looks like a real stitch type
const generalMatch = stitchPart.match(/(\d+)([a-zA-Z]+)/)
if (generalMatch) {
  const possibleType = generalMatch[2].toLowerCase()
  const knownTypes = ['sc','dc','hdc','tr','dtr','ch','sl','inc','dec','bs','ns','st','sts','sp','sk']
  if (knownTypes.includes(possibleType)) {
    const base = `${generalMatch[1]}${possibleType}`
    return colorPart ? `${base}:${colorPart}` : base
  }
  // else: fall through to color-only fallback
}
```

### Phase 2: Update `getColorHex` in `useStitchHelpers.js`

Add hex passthrough — if the color label starts with `#`, return it directly instead of looking it up in the map:

```js
export function getColorHex(color) {
  if (!color) return null

  // Hex passthrough: if it's already a hex code, return it directly
  if (color.startsWith('#') && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(color)) {
    // Expand 3-digit hex to 6-digit for consistency
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    }
    return color
  }

  const colorMap = { /* existing map */ }
  return colorMap[color.toLowerCase()] || '#888888'
}
```

### Phase 3: Interaction with repeat parsing

`(GRN) x 104` is already handled by `parseRepeatedPatterns` in `AddPatternModal.vue`. It extracts `GRN` from inside the parens and passes it to `extractStitchesFromText` → `normalizeStitchCode`. Once the fallback branch is in place, `"GRN"` → `"1sc:GRN"`, and the repeat count of 104 is applied by the repeat structure. No changes needed in the repeat parser.

### Phase 4: Tests

Update `patternParser.spec.js`:

```js
describe('normalizeStitchCode — color-only tokens (alpha labels)', () => {
  it('parses label with trailing count', () => {
    expect(normalizeStitchCode('BLK4')).toBe('4sc:BLK')
    expect(normalizeStitchCode('WHT 102')).toBe('102sc:WHT')
  })
  it('parses label with leading count', () => {
    expect(normalizeStitchCode('4BLK')).toBe('4sc:BLK')
    expect(normalizeStitchCode('102WHT')).toBe('102sc:WHT')
  })
  it('parses bare label as 1sc', () => {
    expect(normalizeStitchCode('BLK')).toBe('1sc:BLK')
    expect(normalizeStitchCode('BGTE')).toBe('1sc:BGTE')
    expect(normalizeStitchCode('LtPink')).toBe('1sc:LtPink')
  })
  it('preserves original casing', () => {
    expect(normalizeStitchCode('BLK')).toBe('1sc:BLK')
    expect(normalizeStitchCode('LtPink')).toBe('1sc:LtPink')
    expect(normalizeStitchCode('Green')).toBe('1sc:Green')
  })
  it('treats digits in label as stitch count', () => {
    // CC2 → label=CC, count=2
    expect(normalizeStitchCode('CC2')).toBe('2sc:CC')
  })
  it('rejects labels longer than 10 alpha characters', () => {
    expect(normalizeStitchCode('VeryLongColorName')).toBeNull()
  })
  it('rejects labels with special characters', () => {
    expect(normalizeStitchCode('BLK-1')).toBeNull()
    expect(normalizeStitchCode('BLK_WHT')).toBeNull()
  })
})

describe('normalizeStitchCode — hex color tokens', () => {
  it('parses 6-digit hex with no count', () => {
    expect(normalizeStitchCode('#FF5733')).toBe('1sc:#FF5733')
  })
  it('parses 6-digit hex with trailing count', () => {
    expect(normalizeStitchCode('#FF5733 4')).toBe('4sc:#FF5733')
  })
  it('parses 6-digit hex with leading count', () => {
    expect(normalizeStitchCode('4#FF5733')).toBe('4sc:#FF5733')
  })
  it('parses 3-digit hex shorthand', () => {
    expect(normalizeStitchCode('#00b')).toBe('1sc:#00b')
    expect(normalizeStitchCode('#00b 2')).toBe('2sc:#00b')
  })
  it('rejects invalid hex', () => {
    expect(normalizeStitchCode('#GGG')).toBeNull()
    expect(normalizeStitchCode('#12')).toBeNull()
    expect(normalizeStitchCode('#1234567')).toBeNull()
  })
})

describe('normalizeStitchCode — no regression on existing patterns', () => {
  it('stitch+color still works', () => {
    expect(normalizeStitchCode('2sc green')).toBe('2sc:green')
    expect(normalizeStitchCode('3dc Red')).toBe('3dc:red')
  })
  it('plain stitches still work', () => {
    expect(normalizeStitchCode('2sc')).toBe('2sc')
    expect(normalizeStitchCode('3hdc')).toBe('3hdc')
    expect(normalizeStitchCode('1inc')).toBe('1inc')
  })
})

describe('extractStitchesFromText — color-only patterns', () => {
  it('parses a full colorwork row', () => {
    const result = extractStitchesFromText('WHT4, GRN 3, BLK')
    expect(result).toEqual(['4sc:WHT', '3sc:GRN', '1sc:BLK'])
  })
  it('handles mixed stitch-type and color-only tokens', () => {
    const result = extractStitchesFromText('2dc red, WHT 5, 1hdc')
    expect(result).toEqual(['2dc:red', '5sc:WHT', '1hdc'])
  })
  it('handles hex colors in a row', () => {
    const result = extractStitchesFromText('#FF5733 4, #00b 2, WHT 6')
    expect(result).toEqual(['4sc:#FF5733', '2sc:#00b', '6sc:WHT'])
  })
})
```

Update `useStitchHelpers.spec.js` — add hex passthrough tests:

```js
describe('getColorHex — hex passthrough', () => {
  it('returns 6-digit hex as-is', () => {
    expect(getColorHex('#FF5733')).toBe('#FF5733')
  })
  it('expands 3-digit hex to 6-digit', () => {
    expect(getColorHex('#00b')).toBe('#0000bb')
  })
  it('falls back to gray for unknown alpha labels', () => {
    expect(getColorHex('BLK')).toBe('#888888')
    expect(getColorHex('BGTE')).toBe('#888888')
  })
  it('still maps known color names', () => {
    expect(getColorHex('red')).toBe('#ff5252')
    expect(getColorHex('Green')).toBe('#4caf50')
  })
})
```

---

## Edge Cases

- **Ambiguity with stitch types:** `st` is a stitch type in the `stitchPatterns` array. Since stitch patterns are checked before the color-only fallback, `"st"` matches as a stitch, not a color. Same for `ch`, `dc`, `sc`, etc. Correct behavior.
- **Step 4 general pattern conflict:** The existing `(\d+)([a-zA-Z]+)` general pattern would match `4BLK` as type=`blk`. The fix (Phase 1, Option C) restricts step 4 to known stitch types, so `4BLK` falls through to the color-only branch. This is the most critical change to get right.
- **Labels at exactly 10 characters:** `Turquoise` (9 chars) passes. `DarkPurple` (10 chars) passes. `ExtraLongCC` (11 chars) is rejected.
- **Patterns mixing both styles:** `"2dc red, WHT 5, 1hdc blue, GRN"` → `['2dc:red', '5sc:WHT', '1hdc:blue', '1sc:GRN']`. Each token is independently parsed — stitch+color tokens use the existing path, color-only tokens use the new fallback.
- **Bare single letter:** `A` → `1sc:A`. Could be a typo but the user can review and correct in the preview UI.
- **Hex without `#`:** `FF5733` is treated as a 6-char alpha label → `1sc:FFabcx` (if it were alpha). Actually `FF5733` contains digits so it would be: digits=`5733`, label=`FF` → `5733sc:FF`. This is wrong but unlikely in practice. The `#` prefix is the contract for hex colors.
- **`#` with invalid hex:** `#GGG` — the hex regex requires `[0-9a-fA-F]`, so `G` fails. Falls through. The alpha-only regex won't match because of the `#`. Returns `null`. Correct.
- **Existing database patterns:** Already stored patterns use the old encoding (lowercase, known colors only). This change only affects new parsing. Old data is unaffected.

---

## Files Changed Summary

| File | Action |
|------|--------|
| `utils/patternParser.js` | Add hex color fallback, add alpha color-only fallback, restrict general pattern match to known stitch types |
| `composables/useStitchHelpers.js` | Add hex passthrough in `getColorHex` |
| `utils/__tests__/patternParser.spec.js` | Add color-only and hex color tests, add regression tests |
| `composables/__tests__/useStitchHelpers.spec.js` | Add hex passthrough tests for `getColorHex` |

---

## Acceptance Criteria

- [ ] `BLK4` parses to `4sc:BLK`
- [ ] `WHT 102` parses to `102sc:WHT`
- [ ] `BLK` parses to `1sc:BLK`
- [ ] `LtPink` parses to `1sc:LtPink`
- [ ] `CC2` parses to `2sc:CC`
- [ ] `#FF5733` parses to `1sc:#FF5733`
- [ ] `#FF5733 4` parses to `4sc:#FF5733`
- [ ] `#00b` parses to `1sc:#00b`
- [ ] `getColorHex('#FF5733')` returns `'#FF5733'`
- [ ] `getColorHex('#00b')` returns `'#0000bb'` (expanded)
- [ ] `getColorHex('BLK')` returns `'#888888'` (fallback gray)
- [ ] Original casing is preserved in the internal encoding
- [ ] Labels longer than 10 alpha characters are rejected
- [ ] Labels with special characters or digits are rejected (digits are treated as count)
- [ ] `(GRN) x 104` in a repeat structure produces 104 `sc:GRN` stitches
- [ ] Existing stitch+color patterns (`2dc red`) still parse correctly (no regression)
- [ ] Existing plain stitches (`2sc`, `3hdc`) still parse correctly (no regression)
- [ ] User can review and correct all parsed results in the preview/edit UI
- [ ] All parser tests pass
