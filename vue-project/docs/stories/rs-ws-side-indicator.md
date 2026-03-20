# Story: RS/WS (Right Side / Wrong Side) Row Indicator

**Status:** Planning
**Priority:** Medium
**Depends on:** [Per-Stitch Yarn Color Support](./archive/per-stitch-color-support.md)
**Estimated Scope:** ~8 files modified, 1 test file updated

---

## Problem

Crochet patterns commonly annotate rows with `[RS]` (right side) or `[WS]` (wrong side) to tell the crocheter which face of the fabric they're working on. Examples:

```
Row 1 [RS]: 2sc, 3dc, 1hdc
Row 2 [WS]: 1sc in each st
Row 3 (RS): (1sc, 1inc) x6
Row 4 (WS): 22sc
```

Currently the parser ignores these tokens. Worse, `[RS]` and `[WS]` leak into the stitch text and can interfere with stitch parsing — `normalizeStitchCode` may see leftover bracket characters or the letters "RS"/"WS" as garbage input.

## Goal

1. Parse RS/WS indicators from row text and store them on the row object.
2. Strip them cleanly so they don't pollute stitch parsing.
3. Display the side indicator in the UI next to the row number.

---

## Format Variations to Support

| Format | Example |
|--------|---------|
| Bracketed | `Row 1 [RS]: 2sc, 3dc` |
| Parenthesized | `Row 3 (RS): 1sc, 1inc` |
| Bare after colon | `Row 1: RS, 2sc, 3dc` |
| Bare after number | `Row 1 RS: 2sc, 3dc` |
| Lowercase | `Row 1 [rs]: 2sc` |

All variations should be recognized. The stored value is always uppercase: `"RS"` or `"WS"`.

---

## Implementation Plan

### Phase 1: Parser changes

#### 1a. New helper in `patternParser.js`

```js
/**
 * Extract RS/WS side indicator from row text.
 * Returns { side: 'RS' | 'WS' | null, cleanedText: string }
 */
export function extractRowSide(text) {
  // Match [RS], [WS], (RS), (WS), or bare RS/WS near the row prefix
  const sideMatch = text.match(/\[(RS|WS)\]|\((RS|WS)\)|\b(RS|WS)\b/i)
  if (!sideMatch) return { side: null, cleanedText: text }

  const side = (sideMatch[1] || sideMatch[2] || sideMatch[3]).toUpperCase()
  const cleanedText = text.replace(sideMatch[0], '').replace(/\s{2,}/g, ' ').trim()
  return { side, cleanedText }
}
```

#### 1b. Update `extractStitches()` in `AddPatternModal.vue` (~line 1030)

After stripping the `Row X:` prefix, call `extractRowSide` on the remaining text before passing it to stitch parsing. This ensures `[RS]`/`[WS]` tokens are removed before `normalizeStitchCode` ever sees them.

```js
// Current:
let cleanedText = text.replace(/^(?:Round|Row) \d+\s*:?\s*/, '').trim()

// Updated:
let cleanedText = text.replace(/^(?:Round|Row) \d+\s*:?\s*/, '').trim()
const { cleanedText: textWithoutSide } = extractRowSide(cleanedText)
cleanedText = textWithoutSide
```

#### 1c. Update row object construction in `AddPatternModal.vue` (~lines 874-893)

When building row objects, extract the side from the raw row text:

```js
const { side } = extractRowSide(line)

foundRows.push({
  number: rowNum,
  text: line.trim(),
  color: extractColor(line),
  stitches: extractStitches(line),
  side,  // 'RS' | 'WS' | null
})
```

Apply the same change to both the `lines.forEach` path (~line 859) and the fallback `rowsFromRegex` path (~line 924).

#### 1d. Update `directRepeatMatch` regex (~line 1010)

The regex `(?:Round|Row)\s+\d+\s+\(([^)]+)\)\s*x(\d+)` may fail to match if `[RS]` sits between the row number and the repeat parens. Update to allow optional RS/WS:

```js
const directRepeatMatch = text.match(
  /(?:Round|Row)\s+\d+\s*(?:\[(?:RS|WS)\]|\((?:RS|WS)\))?\s*:?\s*\(([^)]+)\)\s*x(\d+)/i
)
```

### Phase 2: Rendering changes

#### 2a. `PatternPreviewSection.vue`

In the row header area (where row number is displayed), add:

```vue
<span v-if="row.side" class="row-side-tag" :class="'side-' + row.side.toLowerCase()">
  {{ row.side }}
</span>
```

#### 2b. `CrochetNotationView.vue`

Same small addition in its row header template.

#### 2c. `RowEditModal.vue`

Show the side indicator in the edit modal's row header. Optionally make it editable (a simple RS/WS/none dropdown).

### Phase 3: CSS

Add to `stitch-colors.css` (or scoped in the relevant components):

```css
.row-side-tag {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
  margin-left: 4px;
  vertical-align: middle;
  text-transform: uppercase;
}

.side-rs {
  background: rgba(76, 175, 80, 0.15);
  color: #2e7d32;
}

.side-ws {
  background: rgba(156, 39, 176, 0.15);
  color: #7b1fa2;
}
```

### Phase 4: Tests

Update `patternParser.spec.js`:

```js
describe('extractRowSide', () => {
  it('extracts [RS] from row text', () => {
    const result = extractRowSide('Row 1 [RS]: 2sc, 3dc')
    expect(result.side).toBe('RS')
    expect(result.cleanedText).toBe('Row 1: 2sc, 3dc')
  })
  it('extracts (WS) from row text', () => {
    const result = extractRowSide('Row 2 (WS): 1sc')
    expect(result.side).toBe('WS')
  })
  it('extracts bare RS', () => {
    const result = extractRowSide('Row 1 RS: 2sc')
    expect(result.side).toBe('RS')
  })
  it('is case-insensitive', () => {
    const result = extractRowSide('Row 1 [rs]: 2sc')
    expect(result.side).toBe('RS')
  })
  it('returns null when no side indicator', () => {
    const result = extractRowSide('Row 1: 2sc, 3dc')
    expect(result.side).toBeNull()
    expect(result.cleanedText).toBe('Row 1: 2sc, 3dc')
  })
})
```

---

## Edge Cases

- **RS/WS inside stitch parens:** `(1sc RS, 1inc)` — the regex should only match RS/WS near the row prefix, not inside stitch content. The helper strips the first match; if RS/WS appears as a stitch token it will be ignored by `normalizeStitchCode` (returns null) which is correct.
- **Both RS and WS in same row:** Shouldn't happen in valid patterns. Take the first match.
- **Patterns with no RS/WS:** `side` is `null`, no badge shown. Zero visual change.
- **Existing patterns in the database:** Already stored rows have no `side` field. Templates use `v-if="row.side"` so they gracefully handle missing field.

---

## Files Changed Summary

| File | Action |
|------|--------|
| `utils/patternParser.js` | Add `extractRowSide` helper |
| `utils/__tests__/patternParser.spec.js` | Add `extractRowSide` tests |
| `components/AddPatternModal.vue` | Call `extractRowSide` in row building + stitch extraction, update directRepeatMatch regex |
| `components/pattern/PatternPreviewSection.vue` | Show RS/WS badge in row header |
| `components/pattern/crochet/CrochetNotationView.vue` | Show RS/WS badge in row header |
| `components/pattern/RowEditModal.vue` | Show RS/WS badge (optionally editable) |
| `assets/styles/stitch-colors.css` | `.row-side-tag`, `.side-rs`, `.side-ws` styles |

---

## Acceptance Criteria

- [ ] `Row 1 [RS]: 2sc, 3dc` parses into row with `side: 'RS'` and stitches `['2sc', '3dc']`
- [ ] `Row 2 (WS): 1sc` parses correctly
- [ ] `[RS]` / `[WS]` tokens do not appear in parsed stitch arrays
- [ ] RS/WS badge is visible next to row number in pattern preview and crochet notation views
- [ ] Patterns without RS/WS render identically to before (no regression)
- [ ] All parser tests pass
