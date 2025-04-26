/**
 * Mapping of crochet stitch abbreviations to their SVG symbol files
 * This allows the application to display crochet chart notation
 */
export const stitchSymbolMapping = {
  // Basic stitches
  'ch': 'chain.svg',
  'sl': 'slip-stitch.svg',
  'sc': 'single-crochet.svg',
  'hdc': 'half-double-crochet.svg',
  'dc': 'double-crochet.svg',
  'tr': 'treble-crochet.svg',
  'dtr': 'double-treble-crochet.svg',
  
  // Decreases
  'sc2tog': 'sc2tog.svg',
  'sc3tog': 'sc3tog.svg',
  'dc2tog': 'dc2tog.svg',
  'dc3tog': 'dc3tog.svg',
  
  // Clusters and special stitches
  '3dc': '3dc-cluster.svg',
  '3hdc': '3hdc-cluster.svg',
  '5dc': '5dc-popcorn.svg',
  '5dcshell': '5dc-shell.svg',
  'picot': 'ch-3-picot.svg',
  
  // Post stitches
  'fpdc': 'front-post-dc.svg',
  'bpdc': 'back-post-dc.svg',
  
  // Loop indicators
  'blo': 'back-loop-only.svg',
  'flo': 'front-loop-only.svg'
};

/**
 * Maps a stitch abbreviation to its corresponding symbol file path
 * @param {string} stitchType - The stitch abbreviation (e.g., 'sc', 'dc')
 * @returns {string} - Path to the SVG symbol or null if not found
 */
export function getStitchSymbolPath(stitchType) {
  if (!stitchType) return null;
  
  const lowerType = stitchType.toLowerCase();
  const symbolFile = stitchSymbolMapping[lowerType];
  
  if (symbolFile) {
    // Use relative path to ensure proper loading
    return new URL(`/src/assets/crochet-symbols/${symbolFile}`, import.meta.url).href;
  }
  
  return null;
}

/**
 * Determines if a stitch has a corresponding symbol
 * @param {string} stitchType - The stitch abbreviation
 * @returns {boolean} - True if a symbol exists for this stitch
 */
export function hasStitchSymbol(stitchType) {
  if (!stitchType) return false;
  return !!stitchSymbolMapping[stitchType.toLowerCase()];
}
