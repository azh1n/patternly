import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import GridLineEditor from '../GridLineEditor.vue'

// Mock FontAwesome to avoid registration issues in tests
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: {
    name: 'FontAwesomeIcon',
    template: '<i />'
  }
}))

const makeGridResult = () => ({
  horizontalLines: [
    { x1: 0, y1: 50, x2: 200, y2: 50, isGridBorder: false, isHorizontalGridLine: true, confidence: 0.9 },
    { x1: 0, y1: 100, x2: 200, y2: 100, isGridBorder: true, isHorizontalGridLine: true, confidence: 1 }
  ],
  verticalLines: [
    { x1: 50, y1: 0, x2: 50, y2: 200, isGridBorder: false, isVerticalGridLine: true, confidence: 0.85 }
  ],
  gridArea: { x: 0, y: 0, width: 200, height: 200 },
  gridFound: true,
  medianCellWidth: 50,
  medianCellHeight: 50
})

const mountEditor = async (props = {}) => {
  const wrapper = mount(GridLineEditor, {
    props: {
      gridResult: makeGridResult(),
      imageWidth: 200,
      imageHeight: 200,
      ...props
    },
    global: {
      stubs: {
        'font-awesome-icon': { template: '<i />' }
      }
    }
  })
  await nextTick()
  await nextTick()
  return wrapper
}

describe('GridLineEditor', () => {
  it('renders SVG overlay', async () => {
    const wrapper = await mountEditor()
    const html = wrapper.html()
    expect(html).toContain('viewBox="0 0 200 200"')
  })

  it('renders lines from gridResult in SVG', async () => {
    const wrapper = await mountEditor()
    const html = wrapper.html()
    // 2 horizontal + 1 vertical = 3 visible lines
    const lineCount = (html.match(/<line /g) || []).length
    expect(lineCount).toBeGreaterThanOrEqual(3)
  })

  it('renders grid area rectangle', async () => {
    const wrapper = await mountEditor()
    const html = wrapper.html()
    expect(html).toContain('stroke="lime"')
    expect(html).toContain('stroke-dasharray="8,4"')
  })

  it('exposes activeTool via defineExpose', async () => {
    const wrapper = await mountEditor()
    expect(wrapper.vm.activeTool).toBe('select')
  })

  it('exposes setActiveTool via defineExpose', async () => {
    const wrapper = await mountEditor()
    wrapper.vm.setActiveTool('addHorizontal')
    expect(wrapper.vm.activeTool).toBe('addHorizontal')
  })

  it('emits confirm with grid result when onConfirm called', async () => {
    const wrapper = await mountEditor()
    wrapper.vm.onConfirm()

    expect(wrapper.emitted('confirm')).toBeTruthy()
    expect(wrapper.emitted('confirm')).toHaveLength(1)

    const payload = wrapper.emitted('confirm')[0][0]
    expect(payload.gridFound).toBe(true)
    expect(payload.horizontalLines).toHaveLength(2)
    expect(payload.verticalLines).toHaveLength(1)
    expect(payload.horizontalLines[0]).not.toHaveProperty('id')
  })

  it('emits reset when onReset called', async () => {
    const wrapper = await mountEditor()
    wrapper.vm.onReset()
    expect(wrapper.emitted('reset')).toBeTruthy()
  })

  it('does not render delete button when no line selected', async () => {
    const wrapper = await mountEditor()
    const deleteBtn = wrapper.find('.delete-line-btn')
    expect(deleteBtn.exists()).toBe(false)
  })
})
