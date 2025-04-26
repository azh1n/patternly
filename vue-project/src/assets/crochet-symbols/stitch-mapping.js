/**
 * Mapping of crochet stitch abbreviations to their SVG symbol files
 * This allows the application to display crochet chart notation
 */
export const stitchSymbolMapping = {
  // Basic stitches
  'ch': 'chain.svg',
  'sl': 'slip-stitch.svg',
  'sc': 'sc.svg',
  'hdc': 'hdc.svg',
  'dc': 'dc.svg',
  'tr': 'tr.svg',
  'dtr': 'dtr.svg',
  
  // Increases
  'inc': 'sc-inc.svg',  // Default increase (single crochet)
  'in': 'sc-inc.svg',   // Alternative abbreviation
  'scinc': 'sc-inc.svg', // Explicit single crochet increase
  'scin': 'sc-inc.svg',  // Alternative abbreviation
  'hdcinc': 'hdc-inc.svg', // Half double crochet increase
  'hdcin': 'hdc-inc.svg',  // Alternative abbreviation
  'dcinc': 'dc-inc.svg',   // Double crochet increase
  'dcin': 'dc-inc.svg',    // Alternative abbreviation
  
  // Decreases
  'dec': 'sc-dec.svg',     // Default decrease (single crochet)
  'sc2tog': 'sc-dec.svg',  // Single crochet decrease
  'scdec': 'sc-dec.svg',   // Alternative abbreviation
  'hdc2tog': 'hdc-dec.svg', // Half double crochet decrease
  'hdcdec': 'hdc-dec.svg',  // Alternative abbreviation
  'dc2tog': 'dc-dec.svg',   // Double crochet decrease
  'dcdec': 'dc-dec.svg',    // Alternative abbreviation
  
  // Post stitches
  'fpdc': 'front-post-dc.svg',
  
  // Stitch codes specific to patterns
  'ns': 'negative-stitch.svg',
  'bs': 'border-stitch.svg'
};

/**
 * Maps a stitch abbreviation to its corresponding symbol file path
 * @param {string} stitchType - The stitch abbreviation (e.g., 'sc', 'dc')
 * @returns {string} - Path to the SVG symbol or empty string if not found
 */
export function getStitchSymbolPath(stitchType) {
  if (!stitchType) return '';
  
  const lowerType = stitchType.toLowerCase();
  const symbolFile = stitchSymbolMapping[lowerType];
  
  if (symbolFile) {
    // For now, return an empty string since actual SVG files might not exist yet
    // In a real implementation, this would return a path to the SVG file
    // return new URL(`/src/assets/crochet-symbols/${symbolFile}`, import.meta.url).href;
    return '';
  }
  
  return '';
}

/**
 * Determines if a stitch has a corresponding symbol
 * @param {string} stitchType - The stitch abbreviation
 * @returns {boolean} - True if a symbol exists for this stitch
 */
export function hasStitchSymbol(stitchType) {
  if (!stitchType) return false;
  
  // For now, always return false to use text fallback
  // When actual SVG files are implemented, this should be:
  // return !!stitchSymbolMapping[stitchType.toLowerCase()];
  return false;
}
