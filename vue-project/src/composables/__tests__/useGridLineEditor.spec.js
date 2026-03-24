import { describe, it, expect, beforeEach } from 'vitest'
import { useGridLineEditor } from '../useGridLineEditor'

const makeGridResult = (overrides = {}) => ({
  horizontalLines: [
    { x1: 0, y1: 50, x2: 200, y2: 50, isGridBorder: false, isHorizontalGridLine: true, confidence: 0.9 },
    { x1: 0, y1: 100, x2: 200, y2: 100, isGridBorder: false, isHorizontalGridLine: true, confidence: 0.8 },
    { x1: 0, y1: 150, x2: 200, y2: 150, isGridBorder: true, isHorizontalGridLine: true, confidence: 1 }
  ],
  verticalLines: [
    { x1: 50, y1: 0, x2: 50, y2: 200, isGridBorder: false, isVerticalGridLine: true, confidence: 0.85 },
    { x1: 100, y1: 0, x2: 100, y2: 200, isGridBorder: false, isVerticalGridLine: true, confidence: 0.7 }
  ],
  gridArea: { x: 0, y: 0, width: 200, height: 200 },
  gridFound: true,
  medianCellWidth: 50,
  medianCellHeight: 50,
  ...overrides
})

describe('useGridLineEditor', () => {
  let editor

  beforeEach(() => {
    editor = useGridLineEditor()
  })

  describe('initFromGridResult', () => {
    it('populates lines and dimensions from grid result', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)

      expect(editor.horizontalLines.value).toHaveLength(3)
      expect(editor.verticalLines.value).toHaveLength(2)
      expect(editor.imageWidth.value).toBe(200)
      expect(editor.imageHeight.value).toBe(200)
      expect(editor.gridArea.value).toEqual({ x: 0, y: 0, width: 200, height: 200 })
      expect(editor.isEditorActive.value).toBe(true)
    })

    it('assigns unique IDs to all lines', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)

      const allIds = [
        ...editor.horizontalLines.value.map(l => l.id),
        ...editor.verticalLines.value.map(l => l.id)
      ]
      const uniqueIds = new Set(allIds)
      expect(uniqueIds.size).toBe(allIds.length)
    })

    it('preserves original line properties', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)

      const firstH = editor.horizontalLines.value[0]
      expect(firstH.x1).toBe(0)
      expect(firstH.y1).toBe(50)
      expect(firstH.x2).toBe(200)
      expect(firstH.y2).toBe(50)
      expect(firstH.confidence).toBe(0.9)
    })

    it('handles empty grid result', () => {
      editor.initFromGridResult({
        horizontalLines: [],
        verticalLines: [],
        gridArea: null,
        medianCellWidth: 0,
        medianCellHeight: 0
      }, 100, 100)

      expect(editor.horizontalLines.value).toHaveLength(0)
      expect(editor.verticalLines.value).toHaveLength(0)
      expect(editor.gridArea.value).toBeNull()
    })
  })

  describe('resetLines', () => {
    it('restores original lines after modifications', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)

      // Delete a line
      const firstId = editor.horizontalLines.value[0].id
      editor.selectLine(firstId)
      editor.deleteSelectedLine()
      expect(editor.horizontalLines.value).toHaveLength(2)

      // Reset
      editor.resetLines()
      expect(editor.horizontalLines.value).toHaveLength(3)
      expect(editor.verticalLines.value).toHaveLength(2)
    })

    it('clears selection and resets tool', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      editor.selectLine(editor.horizontalLines.value[0].id)
      editor.setActiveTool('addHorizontal')

      editor.resetLines()
      expect(editor.selectedLineId.value).toBeNull()
      expect(editor.activeTool.value).toBe('select')
    })
  })

  describe('selectLine / deselectLine', () => {
    it('selects a line by ID', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      const id = editor.horizontalLines.value[0].id

      editor.selectLine(id)
      expect(editor.selectedLineId.value).toBe(id)
      expect(editor.selectedLine.value).toBeTruthy()
      expect(editor.selectedLine.value.id).toBe(id)
    })

    it('deselects', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      editor.selectLine(editor.horizontalLines.value[0].id)

      editor.deselectLine()
      expect(editor.selectedLineId.value).toBeNull()
      expect(editor.selectedLine.value).toBeNull()
    })
  })

  describe('deleteSelectedLine', () => {
    it('deletes a horizontal line', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      const id = editor.horizontalLines.value[0].id

      editor.selectLine(id)
      editor.deleteSelectedLine()

      expect(editor.horizontalLines.value).toHaveLength(2)
      expect(editor.horizontalLines.value.find(l => l.id === id)).toBeUndefined()
      expect(editor.selectedLineId.value).toBeNull()
    })

    it('deletes a vertical line', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      const id = editor.verticalLines.value[0].id

      editor.selectLine(id)
      editor.deleteSelectedLine()

      expect(editor.verticalLines.value).toHaveLength(1)
      expect(editor.verticalLines.value.find(l => l.id === id)).toBeUndefined()
    })

    it('does nothing when nothing is selected', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      editor.deleteSelectedLine()

      expect(editor.horizontalLines.value).toHaveLength(3)
      expect(editor.verticalLines.value).toHaveLength(2)
    })
  })

  describe('moveLine', () => {
    it('moves a horizontal line only in Y', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      const line = editor.horizontalLines.value[0]

      editor.moveLine(line.id, 75)

      expect(line.y1).toBe(75)
      expect(line.y2).toBe(75)
      // X should not change
      expect(line.x1).toBe(0)
      expect(line.x2).toBe(200)
    })

    it('moves a vertical line only in X', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      const line = editor.verticalLines.value[0]

      editor.moveLine(line.id, 75)

      expect(line.x1).toBe(75)
      expect(line.x2).toBe(75)
      // Y should not change
      expect(line.y1).toBe(0)
      expect(line.y2).toBe(200)
    })

    it('clamps to image bounds', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      const hLine = editor.horizontalLines.value[0]
      const vLine = editor.verticalLines.value[0]

      editor.moveLine(hLine.id, -50)
      expect(hLine.y1).toBe(0)

      editor.moveLine(hLine.id, 999)
      expect(hLine.y1).toBe(200)

      editor.moveLine(vLine.id, -50)
      expect(vLine.x1).toBe(0)

      editor.moveLine(vLine.id, 999)
      expect(vLine.x1).toBe(200)
    })
  })

  describe('addHorizontalLine', () => {
    it('adds a horizontal line spanning grid width', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      const id = editor.addHorizontalLine(125)

      expect(editor.horizontalLines.value).toHaveLength(4)
      const added = editor.horizontalLines.value.find(l => l.id === id)
      expect(added).toBeTruthy()
      expect(added.y1).toBe(125)
      expect(added.y2).toBe(125)
      expect(added.x1).toBe(0)
      expect(added.x2).toBe(200)
      expect(added.isHorizontalGridLine).toBe(true)
      expect(added.detectionMethod).toBe('manual')
      expect(added.confidence).toBe(1)
    })

    it('spans full image width when no gridArea', () => {
      editor.initFromGridResult(makeGridResult({ gridArea: null }), 300, 400)
      const id = editor.addHorizontalLine(100)

      const added = editor.horizontalLines.value.find(l => l.id === id)
      expect(added.x1).toBe(0)
      expect(added.x2).toBe(300)
    })

    it('clamps Y to image bounds', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      const id = editor.addHorizontalLine(-50)

      const added = editor.horizontalLines.value.find(l => l.id === id)
      expect(added.y1).toBe(0)
    })
  })

  describe('addVerticalLine', () => {
    it('adds a vertical line spanning grid height', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      const id = editor.addVerticalLine(75)

      expect(editor.verticalLines.value).toHaveLength(3)
      const added = editor.verticalLines.value.find(l => l.id === id)
      expect(added).toBeTruthy()
      expect(added.x1).toBe(75)
      expect(added.x2).toBe(75)
      expect(added.y1).toBe(0)
      expect(added.y2).toBe(200)
      expect(added.isVerticalGridLine).toBe(true)
      expect(added.detectionMethod).toBe('manual')
    })

    it('spans full image height when no gridArea', () => {
      editor.initFromGridResult(makeGridResult({ gridArea: null }), 300, 400)
      const id = editor.addVerticalLine(150)

      const added = editor.verticalLines.value.find(l => l.id === id)
      expect(added.y1).toBe(0)
      expect(added.y2).toBe(400)
    })
  })

  describe('setGridArea', () => {
    it('sets grid area clamped to image bounds', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      editor.setGridArea({ x: 10, y: 20, width: 180, height: 160 })

      expect(editor.gridArea.value).toEqual({ x: 10, y: 20, width: 180, height: 160 })
    })

    it('clamps negative coordinates to 0', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      editor.setGridArea({ x: -10, y: -20, width: 100, height: 100 })

      expect(editor.gridArea.value.x).toBe(0)
      expect(editor.gridArea.value.y).toBe(0)
    })
  })

  describe('setActiveTool', () => {
    it('changes the active tool', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      editor.setActiveTool('addHorizontal')
      expect(editor.activeTool.value).toBe('addHorizontal')
    })

    it('deselects line when switching away from select', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      editor.selectLine(editor.horizontalLines.value[0].id)

      editor.setActiveTool('addVertical')
      expect(editor.selectedLineId.value).toBeNull()
    })
  })

  describe('buildGridResult', () => {
    it('returns a gridResult-compatible object', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      const result = editor.buildGridResult()

      expect(result.gridFound).toBe(true)
      expect(result.horizontalLines).toHaveLength(3)
      expect(result.verticalLines).toHaveLength(2)
      expect(result.gridArea).toEqual({ x: 0, y: 0, width: 200, height: 200 })
      expect(result.medianCellWidth).toBe(50)
      expect(result.medianCellHeight).toBe(50)
    })

    it('strips internal IDs from lines', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      const result = editor.buildGridResult()

      for (const line of [...result.horizontalLines, ...result.verticalLines]) {
        expect(line).not.toHaveProperty('id')
      }
    })

    it('reflects edits (add, delete, move)', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)

      // Delete one horizontal
      editor.selectLine(editor.horizontalLines.value[0].id)
      editor.deleteSelectedLine()

      // Add one vertical
      editor.addVerticalLine(150)

      // Move a vertical line
      editor.moveLine(editor.verticalLines.value[0].id, 60)

      const result = editor.buildGridResult()
      expect(result.horizontalLines).toHaveLength(2)
      expect(result.verticalLines).toHaveLength(3)
      // The moved line should have its new x position
      const movedLine = result.verticalLines.find(l => l.x1 === 60)
      expect(movedLine).toBeTruthy()
    })
  })

  describe('allLines computed', () => {
    it('returns concatenation of horizontal and vertical lines', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      expect(editor.allLines.value).toHaveLength(5)
    })
  })

  describe('deactivate', () => {
    it('clears all state', () => {
      editor.initFromGridResult(makeGridResult(), 200, 200)
      editor.selectLine(editor.horizontalLines.value[0].id)

      editor.deactivate()

      expect(editor.isEditorActive.value).toBe(false)
      expect(editor.selectedLineId.value).toBeNull()
      expect(editor.horizontalLines.value).toHaveLength(0)
      expect(editor.verticalLines.value).toHaveLength(0)
      expect(editor.gridArea.value).toBeNull()
    })
  })
})
