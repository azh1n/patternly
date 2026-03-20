import { describe, it, expect } from 'vitest'
import { normalizeStitchCode, extractStitchesFromText } from '../patternParser'

describe('patternParser', () => {

  describe('normalizeStitchCode', () => {
    it('parses plain stitch code', () => {
      expect(normalizeStitchCode('2sc')).toBe('2sc')
    })
    it('parses stitch with color suffix', () => {
      expect(normalizeStitchCode('2bs green')).toBe('2bs:green')
    })
    it('handles color names case-insensitively', () => {
      expect(normalizeStitchCode('3dc Red')).toBe('3dc:red')
    })
    it('handles letter color codes', () => {
      expect(normalizeStitchCode('1sc A')).toBe('1sc:a')
    })
    it('handles MC/CC codes', () => {
      expect(normalizeStitchCode('2hdc MC')).toBe('2hdc:mc')
      expect(normalizeStitchCode('1tr CC2')).toBe('1tr:cc2')
    })
    it('does not treat unknown words as colors', () => {
      // "together" is not a recognized color, so the parser ignores it
      // and extracts just the stitch part
      expect(normalizeStitchCode('2sc together')).toBe('2sc')
    })
    it('returns null for garbage input', () => {
      expect(normalizeStitchCode('hello world')).toBeNull()
    })
    it('returns null for null/empty input', () => {
      expect(normalizeStitchCode(null)).toBeNull()
      expect(normalizeStitchCode('')).toBeNull()
    })
    it('strips trailing punctuation before parsing', () => {
      expect(normalizeStitchCode('2sc,')).toBe('2sc')
      expect(normalizeStitchCode('3dc.')).toBe('3dc')
    })
  })

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
    })
    it('treats 7 hex digits as 6-digit hex + trailing count', () => {
      // #123456 is the hex color, 7 is the stitch count
      expect(normalizeStitchCode('#1234567')).toBe('7sc:#123456')
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

  describe('extractStitchesFromText', () => {
    it('parses comma-separated stitches with colors', () => {
      const result = extractStitchesFromText('2bs green, 3sl blue, 1sc')
      expect(result).toEqual(['2bs:green', '3sl:blue', '1sc'])
    })
    it('parses mixed — some with colors, some without', () => {
      const result = extractStitchesFromText('1sc red, 2dc, 1hdc blue')
      expect(result).toEqual(['1sc:red', '2dc', '1hdc:blue'])
    })
    it('backward-compatible with no-color stitches', () => {
      const result = extractStitchesFromText('2sc, 1dc, 3hdc')
      expect(result).toEqual(['2sc', '1dc', '3hdc'])
    })
    it('handles empty input', () => {
      expect(extractStitchesFromText('')).toEqual([])
    })
    it('ignores stitch count parentheses', () => {
      const result = extractStitchesFromText('2sc, 1dc (stitch count: 3)')
      expect(result).toEqual(['2sc', '1dc'])
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
})
