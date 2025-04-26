/**
 * Utility functions to detect pattern shape (rectangular vs circular)
 */

/**
 * Determines if a pattern is likely circular based on its rows and content
 * @param {Array} rows - The parsed rows of the pattern
 * @param {String} rawContent - The raw pattern content text
 * @returns {Object} - Contains shape type and confidence level
 */
export function detectPatternShape(rows, rawContent) {
  if (!rows || rows.length === 0) {
    return { type: 'unknown', confidence: 0 };
  }

  let circularConfidence = 0;
  let rectangularConfidence = 0;

  // Check for circular pattern indicators in raw content
  const circularKeywords = [
    'round', 'rnd', 'rounds', 'rnds', 'circle', 'circular',
    'in the round', 'work in rounds', 'join to form a ring',
    'magic ring', 'magic circle', 'join with slip stitch'
  ];

  const rectangularKeywords = [
    'row', 'rows', 'back and forth', 'turn work', 'turn',
    'right side', 'wrong side', 'rs', 'ws'
  ];

  // Check for circular indicators in raw content
  circularKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(rawContent)) {
      circularConfidence += 1;
    }
  });

  // Check for rectangular indicators in raw content
  rectangularKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(rawContent)) {
      rectangularConfidence += 1;
    }
  });

  // Check row structure for circular patterns
  // In circular patterns, rows typically have consistent or increasing stitch counts
  let hasConsistentOrIncreasingStitches = true;
  let previousStitchCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.stitches) continue;
    
    const currentStitchCount = getStitchCount(row);
    
    if (i > 0 && currentStitchCount < previousStitchCount * 0.8) {
      // Significant decrease in stitch count is less common in circular patterns
      hasConsistentOrIncreasingStitches = false;
    }
    
    previousStitchCount = currentStitchCount;
  }

  if (hasConsistentOrIncreasingStitches) {
    circularConfidence += 2;
  } else {
    rectangularConfidence += 1;
  }

  // Check for row naming conventions
  const rowLabels = rows.map(row => row.number?.toString() || '');
  const hasRoundLabels = rowLabels.some(label => 
    /^(round|rnd|r)\s*\d+$/i.test(label)
  );

  if (hasRoundLabels) {
    circularConfidence += 2;
  }

  // Determine final shape based on confidence scores
  const totalConfidence = circularConfidence + rectangularConfidence;
  const circularProbability = totalConfidence > 0 ? circularConfidence / totalConfidence : 0;

  if (circularProbability > 0.6) {
    return { 
      type: 'circular', 
      confidence: Math.min(circularProbability, 0.95) 
    };
  } else if (circularProbability < 0.4) {
    return { 
      type: 'rectangular', 
      confidence: Math.min(1 - circularProbability, 0.95) 
    };
  } else {
    return { 
      type: 'unknown', 
      confidence: 0.5 
    };
  }
}

/**
 * Helper function to count stitches in a row
 * @param {Object} row - A pattern row object
 * @returns {Number} - The total stitch count
 */
function getStitchCount(row) {
  if (!row.stitches) return 0;
  
  if (Array.isArray(row.stitches)) {
    return row.stitches.reduce((total, stitch) => {
      const match = stitch.match(/^(\d+)/);
      const count = match ? parseInt(match[1]) : 1;
      return total + count;
    }, 0);
  } else if (row.stitches.repeated) {
    // Handle repeated stitch patterns
    let total = 0;
    
    if (row.stitches.beforeRepeat) {
      total += row.stitches.beforeRepeat.reduce((sum, stitch) => {
        const match = stitch.match(/^(\d+)/);
        const count = match ? parseInt(match[1]) : 1;
        return sum + count;
      }, 0);
    }
    
    if (row.stitches.repeatedStitches) {
      const repeatTotal = row.stitches.repeatedStitches.reduce((sum, stitch) => {
        const match = stitch.match(/^(\d+)/);
        const count = match ? parseInt(match[1]) : 1;
        return sum + count;
      }, 0);
      total += repeatTotal * (row.stitches.repeatCount || 1);
    }
    
    if (row.stitches.afterRepeat) {
      total += row.stitches.afterRepeat.reduce((sum, stitch) => {
        const match = stitch.match(/^(\d+)/);
        const count = match ? parseInt(match[1]) : 1;
        return sum + count;
      }, 0);
    }
    
    return total;
  }
  
  return 0;
}
