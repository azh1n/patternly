/**
 * Stitch pattern definitions for parsing pattern text.
 * Each entry maps a regex to a normalized stitch name.
 */
export const stitchPatterns = [
  { pattern: /\b(\d+)sc\b/i, name: 'sc' },
  { pattern: /\b(\d+)\s*sc\b/i, name: 'sc' },
  { pattern: /\b(\d+)inc\b/i, name: 'inc' },
  { pattern: /\b(\d+)\s*inc\b/i, name: 'inc' },
  { pattern: /\binc\b/i, name: 'inc' },
  { pattern: /\b(\d+)dec\b/i, name: 'dec' },
  { pattern: /\b(\d+)\s*dec\b/i, name: 'dec' },
  { pattern: /\bdec\b/i, name: 'dec' },
  { pattern: /\b(\d+)\s*dc\b/i, name: 'dc' },
  { pattern: /\b(\d+)dc\b/i, name: 'dc' },
  { pattern: /\b(\d+)\s*hdc\b/i, name: 'hdc' },
  { pattern: /\b(\d+)hdc\b/i, name: 'hdc' },
  { pattern: /\b(\d+)\s*tr\b/i, name: 'tr' },
  { pattern: /\b(\d+)tr\b/i, name: 'tr' },
  { pattern: /\b(\d+)\s*dtr\b/i, name: 'dtr' },
  { pattern: /\b(\d+)dtr\b/i, name: 'dtr' },
  { pattern: /\b(\d+)\s*sl\s*st\b/i, name: 'sl st' },
  { pattern: /\bch\s*(\d+)\b/i, name: 'ch' },
  { pattern: /\b(\d+)ch\b/i, name: 'ch' },
  { pattern: /\bsk\s*(\d+)\b/i, name: 'sk' },
  { pattern: /\bst\b/i, name: 'st' },
  { pattern: /\bsts\b/i, name: 'sts' },
  { pattern: /\bsp\b/i, name: 'sp' },
  { pattern: /\b(\d+)bs\b/i, name: 'bs' },
  { pattern: /\b(\d+)\s*bs\b/i, name: 'bs' },
  { pattern: /\b(\d+)ns\b/i, name: 'ns' },
  { pattern: /\b(\d+)\s*ns\b/i, name: 'ns' },
]

/**
 * Extract RS/WS side indicator from row text.
 * Returns { side: 'RS' | 'WS' | null, cleanedText: string }
 */
export function extractRowSide(text) {
  if (!text) return { side: null, cleanedText: text }

  // Match [RS], [WS], (RS), (WS), or bare RS/WS near the row prefix
  const sideMatch = text.match(/\[(RS|WS)\]|\((RS|WS)\)|\b(RS|WS)\b/i)
  if (!sideMatch) return { side: null, cleanedText: text }

  const side = (sideMatch[1] || sideMatch[2] || sideMatch[3]).toUpperCase()
  const cleanedText = text.replace(sideMatch[0], '').replace(/\s{2,}/g, ' ').trim()
  return { side, cleanedText }
}

/**
 * Known stitch type abbreviations. Used to distinguish stitch codes from
 * color-only tokens in the general pattern fallback.
 */
const knownStitchTypes = [
  'sc', 'dc', 'hdc', 'tr', 'dtr', 'ch', 'sl', 'inc', 'dec',
  'bs', 'ns', 'st', 'sts', 'sp', 'sk',
]

/**
 * Normalize a single stitch code string.
 *
 * Priority order:
 * 1. Stitch + trailing color word: "2bs green" → "2bs:green"
 * 2. Known stitch patterns (stitchPatterns array)
 * 3. General digit+alpha pattern (only if alpha is a known stitch type)
 * 4. Hex color with optional count: "#FF5733 4" → "4sc:#FF5733"
 * 5. Alpha-only color label with optional count: "BLK4" → "4sc:BLK"
 */
export const normalizeStitchCode = (code) => {
  if (!code) return null

  const cleanCode = code.replace(/[.,;:!?]+$/, '').trim()

  // Step 1: Check for trailing color word: "2bs green" → stitch="2bs", color="green"
  const colorSuffixMatch = cleanCode.match(
    /^(.+?)\s+(red|green|blue|yellow|purple|orange|pink|turquoise|black|white|brown|gray|[a-f]|mc|cc\d*)$/i
  )
  const stitchPart = colorSuffixMatch ? colorSuffixMatch[1].trim() : cleanCode
  const colorPart = colorSuffixMatch ? colorSuffixMatch[2].toLowerCase() : null

  // Step 2: Try all known stitch patterns
  for (const pattern of stitchPatterns) {
    const match = stitchPart.match(pattern.pattern)
    if (match) {
      const count = match[1] || '1'
      const base = `${count}${pattern.name}`
      return colorPart ? `${base}:${colorPart}` : base
    }
  }

  // Step 3: General digit+alpha — only accept if the alpha part is a known stitch type
  const generalMatch = stitchPart.match(/(\d+)([a-zA-Z]+)/)
  if (generalMatch) {
    const possibleType = generalMatch[2].toLowerCase()
    if (knownStitchTypes.includes(possibleType)) {
      const base = `${generalMatch[1]}${possibleType}`
      return colorPart ? `${base}:${colorPart}` : base
    }
  }

  // Step 4: Hex color with optional count — "#FF5733", "4#FF5733", "#00b 2"
  const hexMatch = cleanCode.match(/^(\d+)?\s*(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)\s*(\d+)?$/)
  if (hexMatch) {
    const count = hexMatch[1] || hexMatch[3] || '1'
    const color = hexMatch[2]
    return `${count}sc:${color}`
  }

  // Step 5: Color-only fallback — any alpha label (1-10 chars) with optional count.
  // Digits are always treated as stitch count. Assumes single crochet.
  // Original casing preserved.
  const colorOnlyMatch = cleanCode.match(/^(\d+)?\s*([a-zA-Z]{1,10})\s*(\d+)?$/)
  if (colorOnlyMatch) {
    const count = colorOnlyMatch[1] || colorOnlyMatch[3] || '1'
    const color = colorOnlyMatch[2]
    return `${count}sc:${color}`
  }

  return null
}

/**
 * Extract stitch patterns from a text string.
 * "2bs green, 3sl blue, 1sc" → ["2bs:green", "3sl:blue", "1sc"]
 */
export const extractStitchesFromText = (text) => {
  try {
    const foundStitches = []

    // Remove any stitch count information in parentheses
    const cleanedText = text.replace(/\([^)]*stitch count[^)]*\)/i, '').trim()

    // Split by commas
    const allParts = cleanedText.split(',').map(p => p.trim()).filter(Boolean)

    for (const part of allParts) {
      if (!part) continue

      const cleanPart = part.replace(/[.,;:!?]+$/, '').trim()

      const normalizedStitch = normalizeStitchCode(cleanPart)
      if (normalizedStitch) {
        foundStitches.push(normalizedStitch)
      }
    }

    return foundStitches
  } catch (error) {
    console.error('Error in extractStitchesFromText:', error)
    return []
  }
}
