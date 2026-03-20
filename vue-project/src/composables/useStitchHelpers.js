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

  // Hex passthrough: if it's already a hex code, return it directly
  if (color.startsWith('#') && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(color)) {
    // Expand 3-digit hex to 6-digit for consistency
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    }
    return color
  }

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
