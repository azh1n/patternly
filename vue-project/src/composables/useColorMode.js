import { getStitchColor, getColorHex, getStitchClass } from './useStitchHelpers'

/**
 * Returns black or white text color for best contrast against a hex background.
 * Uses relative luminance formula (WCAG).
 */
export function getContrastText(hex) {
  if (!hex || !hex.startsWith('#')) return '#fff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#333' : '#fff'
}


/**
 * Returns a border color derived from the yarn color — slightly darkened.
 */
function getYarnBorder(hex) {
  if (!hex || !hex.startsWith('#')) return 'rgba(0,0,0,0.2)'
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 30)
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 30)
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 30)
  return `rgb(${r},${g},${b})`
}

/**
 * Build the inline style object for a stitch box.
 * If the stitch has a yarn color, use it as the background.
 * Otherwise, let the stitch-type CSS class handle the background.
 */
export function getStitchBoxStyle(stitch) {
  const yarnColor = getStitchColor(stitch)
  const hex = yarnColor ? getColorHex(yarnColor) : null

  if (hex) {
    return {
      backgroundColor: hex,
      color: getContrastText(hex),
      borderColor: getYarnBorder(hex)
    }
  }
  return {}
}

/**
 * Get the CSS class(es) for a stitch box.
 * When a yarn color is present, skip the stitch-type class so the
 * inline background isn't overridden by the CSS class.
 */
export function getStitchBoxClass(stitch) {
  const yarnColor = getStitchColor(stitch)
  if (yarnColor) return ''
  return getStitchClass(stitch)
}
