# Story: Yarn Color Mode for Stitch Boxes

**Status:** Planning
**Priority:** Low
**Depends on:** [Per-Stitch Yarn Color Support](./per-stitch-color-support.md)
**Estimated Scope:** ~6 files modified, 1 new test file

---

## Problem

After per-stitch color support lands, yarn colors are shown as a subtle left-border indicator on stitch boxes. But for colorwork patterns (amigurumi, tapestry crochet, C2C blankets), what users actually care about is **which yarn to pick up** — the stitch type is secondary. They want to see a grid of green/blue/red boxes that looks like their finished piece, not a grid of sc-green/dc-blue type colors.

## Goal

When a stitch has a recognized yarn color, allow the stitch box background to become that yarn color instead of the stitch-type color. Since this conflicts with stitch-type coloring, add a toggle so users can switch between the two modes.

---

## Design

### Color Mode Toggle

A simple two-state toggle, available wherever stitch blocks are rendered:

- **"Stitch Type" mode** (default): Current behavior. Background = stitch-type color (green for sc, blue for dc, etc.). Yarn color shown as left-border indicator.
- **"Yarn Color" mode**: Background = yarn color. Stitch type shown as a text label inside the box. Stitches with no yarn color fall back to stitch-type coloring.

The toggle appears as a small segmented control or icon-button pair above the stitch visualization area.

### Standard Colors

"Standard" means any color that resolves via the `getColorHex()` map from the composable (story 1). This already includes:

| Names | Codes | Special |
|-------|-------|---------|
| red, green, blue, yellow, purple, orange, pink, turquoise, black, white, brown, gray | a, b, c, d, e, f | mc, cc, cc1, cc2 |

Any value that `getColorHex()` returns a non-fallback hex for is considered "standard." The fallback gray (`#888888`) is returned for unknown colors — those would still show the gray, which is a reasonable default for "I have a color but it's not mapped."

### Visual Treatment in Yarn Color Mode

```
┌──────────────┐
│  ██████████  │  ← background: getColorHex('green') = #4caf50
│     sc       │  ← stitch type as centered text label
│              │     white text on dark colors, dark text on light colors
└──────────────┘
```

For stitches **without** a yarn color in yarn-color mode: fall back to stitch-type background (no change from default mode). This means a mixed pattern still looks reasonable — colored stitches show yarn, uncolored stitches show type.

### Text Contrast

Need a simple luminance check to decide white vs dark text on the yarn-color background:

```js
function getContrastText(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Relative luminance approximation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#333333' : '#ffffff'
}
```

---

## Implementation Plan

### Step 1: Add `getContrastText` to the shared composable

**File: `vue-project/src/composables/useStitchHelpers.js`**

Add to the existing composable created in story 1:

```js
/**
 * Returns a text color (dark or light) that contrasts with the given hex background.
 */
export function getContrastText(hex) {
  if (!hex) return '#333333'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#333333' : '#ffffff'
}

/**
 * Returns true if the stitch has a recognized (non-fallback) yarn color.
 */
export function hasStandardColor(stitch) {
  const color = getStitchColor(stitch)
  if (!color) return false
  // Check if it resolves to something other than the fallback
  return getColorHex(color) !== '#888888'
}
```

### Step 2: Add color mode state

**File: `vue-project/src/composables/useColorMode.js`** (new)

```js
import { ref } from 'vue'

// Shared reactive state — all stitch visualization components read this
const colorMode = ref('stitch-type') // 'stitch-type' | 'yarn-color'

export function useColorMode() {
  function toggleColorMode() {
    colorMode.value = colorMode.value === 'stitch-type' ? 'yarn-color' : 'stitch-type'
  }

  function setColorMode(mode) {
    colorMode.value = mode
  }

  return {
    colorMode,
    toggleColorMode,
    setColorMode,
  }
}
```

This is a simple shared ref — all stitch components import it and react to the same toggle.

### Step 3: Add toggle UI to parent component

**File: `vue-project/src/components/pattern/PatternPreviewSection.vue`**

This is the wrapper that contains the stitch view mode selector (ColorBlock / Symbol / Text). Add the color-mode toggle next to it, around the existing view-mode controls (lines 85-90):

```vue
<div class="visualization-controls">
  <!-- existing view mode selector -->
  <div class="view-mode-toggle">...</div>

  <!-- new color mode toggle -->
  <div class="color-mode-toggle">
    <button
      :class="{ active: colorMode === 'stitch-type' }"
      @click="setColorMode('stitch-type')"
    >
      Stitch Type
    </button>
    <button
      :class="{ active: colorMode === 'yarn-color' }"
      @click="setColorMode('yarn-color')"
    >
      Yarn Color
    </button>
  </div>
</div>
```

Import `useColorMode` in the script setup.

Also add this toggle to **`CrochetNotationView.vue`** in its controls area (around line 27, near the existing stitch display toggle).

### Step 4: Update stitch rendering components

The same change applies to all three stitch visualization components. The logic:

```js
import { useColorMode } from '@/composables/useColorMode'
import {
  getStitchClass, getStitchColor, getStitchType,
  getColorHex, getContrastText
} from '@/composables/useStitchHelpers'

const { colorMode } = useColorMode()

function stitchBoxStyle(stitch) {
  if (colorMode.value !== 'yarn-color') return {}

  const color = getStitchColor(stitch)
  if (!color) return {} // no yarn color → fall back to CSS class coloring

  const hex = getColorHex(color)
  return {
    backgroundColor: hex,
    color: getContrastText(hex),
    borderColor: 'rgba(0,0,0,0.15)',
  }
}
```

#### 4a. `ColorBlockStitches.vue`

Template update (the stitch block rendering, lines 26-46 after story 1 changes):

```vue
<div
  class="stitch-block"
  :class="colorMode === 'stitch-type' ? getStitchClass(stitch) : ''"
  :style="stitchBoxStyle(stitch)"
>
  {{ colorMode === 'yarn-color' ? getStitchType(stitch) : '' }}
</div>
```

When in yarn-color mode:
- CSS class is removed (no stitch-type background)
- Inline style sets the yarn-color background
- Text label shows the stitch type abbreviation

When in stitch-type mode:
- Behaves exactly as before (CSS class applies, no inline style)

#### 4b. `SymbolStitches.vue`

Same approach. In yarn-color mode, the SVG symbol is still shown (it already communicates stitch type), but the cell background becomes the yarn color:

```vue
<div
  class="stitch-symbol-cell"
  :class="colorMode === 'stitch-type' ? getStitchClass(stitch) : ''"
  :style="stitchBoxStyle(stitch)"
>
  <img :src="getSymbolPath(stitch)" ... />
</div>
```

The SVG symbols are black line drawings, so they need to remain visible on colored backgrounds. Add a small white background circle/pill behind the symbol if the yarn color is dark — or simply ensure SVG symbols have a white stroke/outline. This is a CSS-only fix:

```css
.yarn-color-mode .stitch-symbol-cell img {
  filter: drop-shadow(0 0 1px rgba(255,255,255,0.8));
}
```

#### 4c. `TextStitches.vue`

In text mode, the "box" is more of a badge. Same logic — yarn-color mode sets the badge background:

```vue
<span
  class="stitch-text"
  :class="colorMode === 'stitch-type' ? getStitchClass(stitch) : ''"
  :style="stitchBoxStyle(stitch)"
>
  {{ getStitchBase(stitch) }}
</span>
```

### Step 5: CSS additions

**File: `vue-project/src/assets/styles/stitch-colors.css`**

```css
/* Color mode toggle */
.color-mode-toggle {
  display: inline-flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color, #dee2e6);
}

.color-mode-toggle button {
  padding: 4px 12px;
  font-size: 0.8rem;
  border: none;
  background: var(--button-bg, #f8f9fa);
  color: var(--text-secondary, #6c757d);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.color-mode-toggle button.active {
  background: var(--accent-color, #4CAF50);
  color: #fff;
}

/* Yarn color mode — stitch blocks get inline background, need clean text */
.stitch-block[style*="background-color"] {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## Unit Tests

**File: `vue-project/src/composables/__tests__/useStitchHelpers.spec.js`**

Add to the existing test file from story 1:

```js
import { getContrastText, hasStandardColor } from '../useStitchHelpers'

describe('getContrastText', () => {
  it('returns white text for dark backgrounds', () => {
    expect(getContrastText('#333333')).toBe('#ffffff')
    expect(getContrastText('#000000')).toBe('#ffffff')
    expect(getContrastText('#9c27b0')).toBe('#ffffff') // purple
  })
  it('returns dark text for light backgrounds', () => {
    expect(getContrastText('#ffffff')).toBe('#333333')
    expect(getContrastText('#ffc107')).toBe('#333333') // yellow
    expect(getContrastText('#e0e0e0')).toBe('#333333')
  })
  it('returns dark text for null input', () => {
    expect(getContrastText(null)).toBe('#333333')
  })
})

describe('hasStandardColor', () => {
  it('returns true for recognized color names', () => {
    expect(hasStandardColor('2sc:green')).toBe(true)
    expect(hasStandardColor('1dc:red')).toBe(true)
  })
  it('returns true for letter codes', () => {
    expect(hasStandardColor('3hdc:a')).toBe(true)
  })
  it('returns false for stitches without color', () => {
    expect(hasStandardColor('2sc')).toBe(false)
  })
  it('returns false for unrecognized colors', () => {
    expect(hasStandardColor('2sc:magenta')).toBe(false)
  })
})
```

**File: `vue-project/src/composables/__tests__/useColorMode.spec.js`** (new)

```js
import { describe, it, expect } from 'vitest'
import { useColorMode } from '../useColorMode'

describe('useColorMode', () => {
  it('defaults to stitch-type mode', () => {
    const { colorMode } = useColorMode()
    expect(colorMode.value).toBe('stitch-type')
  })

  it('toggles between modes', () => {
    const { colorMode, toggleColorMode } = useColorMode()
    toggleColorMode()
    expect(colorMode.value).toBe('yarn-color')
    toggleColorMode()
    expect(colorMode.value).toBe('stitch-type')
  })

  it('sets a specific mode', () => {
    const { colorMode, setColorMode } = useColorMode()
    setColorMode('yarn-color')
    expect(colorMode.value).toBe('yarn-color')
    setColorMode('stitch-type')
    expect(colorMode.value).toBe('stitch-type')
  })

  it('shares state across multiple calls', () => {
    const instance1 = useColorMode()
    const instance2 = useColorMode()
    instance1.setColorMode('yarn-color')
    expect(instance2.colorMode.value).toBe('yarn-color')
    // Reset for other tests
    instance1.setColorMode('stitch-type')
  })
})
```

---

## Edge Cases

- **Stitches without yarn color in yarn-color mode:** Fall back to stitch-type CSS class. No visual break.
- **Unknown/unmapped colors:** `getColorHex` returns `#888888` (gray). Box shows gray background with the stitch label. Functional, not confusing.
- **White yarn on white background:** The stitch box gets `backgroundColor: #ffffff`. The border (`rgba(0,0,0,0.15)`) keeps it visually distinct. `getContrastText` returns `#333333` for the label text. Works.
- **Black yarn color:** `#333333` background, `#ffffff` text. Fine.
- **Symbol view with dark yarn colors:** SVG symbols get a light drop-shadow filter so they remain visible.

---

## Files Changed Summary

| File | Action |
|------|--------|
| `composables/useStitchHelpers.js` | Add `getContrastText`, `hasStandardColor` |
| `composables/useColorMode.js` | **NEW** — shared reactive color mode state |
| `composables/__tests__/useColorMode.spec.js` | **NEW** — toggle/state tests |
| `composables/__tests__/useStitchHelpers.spec.js` | Add contrast + standard color tests |
| `components/pattern/PatternPreviewSection.vue` | Add color-mode toggle UI |
| `views/CrochetNotationView.vue` | Add color-mode toggle UI |
| `components/pattern/stitches/ColorBlockStitches.vue` | Conditional class/style based on mode |
| `components/pattern/stitches/SymbolStitches.vue` | Conditional class/style, SVG contrast |
| `components/pattern/stitches/TextStitches.vue` | Conditional class/style |
| `assets/styles/stitch-colors.css` | Toggle styles, yarn-color-mode overrides |

---

## Acceptance Criteria

- [ ] Toggle is visible in pattern preview and crochet notation views
- [ ] Default mode is "Stitch Type" — no visual change from current behavior
- [ ] Switching to "Yarn Color" mode turns stitch boxes into their yarn color
- [ ] Stitch type abbreviation is readable as text label inside yarn-colored boxes
- [ ] Text contrast is correct — light text on dark backgrounds, dark text on light
- [ ] Stitches without yarn color gracefully fall back to stitch-type coloring
- [ ] SVG symbols remain visible on dark yarn-color backgrounds
- [ ] Toggle state is shared — switching in one view applies everywhere
- [ ] All unit tests pass
