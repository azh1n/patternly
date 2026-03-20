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
    it('returns 6-digit hex as-is', () => {
      expect(getColorHex('#FF5733')).toBe('#FF5733')
      expect(getColorHex('#4caf50')).toBe('#4caf50')
    })
    it('expands 3-digit hex to 6-digit', () => {
      expect(getColorHex('#00b')).toBe('#0000bb')
      expect(getColorHex('#f00')).toBe('#ff0000')
    })
    it('falls back to gray for unknown alpha labels', () => {
      expect(getColorHex('BLK')).toBe('#888888')
      expect(getColorHex('BGTE')).toBe('#888888')
    })
  })
})
