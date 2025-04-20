import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { render, fireEvent } from '@testing-library/vue'
import PatternCard from '../PatternCard.vue'

const mockPush = vi.fn()

// Mock vue-router before importing the component
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

describe('PatternCard', () => {
  const mockPattern = {
    id: '1',
    name: 'Test Pattern',
    content: 'Row 1: k2, p2\nRow 2: p2, k2\nRow 3: k2, p2',
    timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    completedRows: {
      'row1': true,
      'row2': false,
      'row3': false
    }
  }

  beforeEach(() => {
    // Clear mock calls before each test
    mockPush.mockClear()
  })

  it('renders pattern information correctly', () => {
    const wrapper = mount(PatternCard, {
      props: {
        pattern: mockPattern
      }
    })

    expect(wrapper.text()).toContain(mockPattern.name)
    expect(wrapper.text()).toContain(mockPattern.content.split('\n')[0])
    expect(wrapper.text()).toContain('1 / 3 rows')
  })

  it('calculates completion percentage correctly', () => {
    const wrapper = mount(PatternCard, {
      props: {
        pattern: mockPattern
      }
    })

    const progressBar = wrapper.find('.completion-progress')
    expect(progressBar.attributes('style')).toContain('width: 33%')
  })

  it('navigates to pattern detail when clicked', async () => {
    const wrapper = mount(PatternCard, {
      props: {
        pattern: mockPattern
      }
    })

    await wrapper.find('.pattern-card').trigger('click')
    await wrapper.vm.$nextTick()
    
    expect(mockPush).toHaveBeenCalledWith('/pattern/1')
  })

  it('is accessible and can be interacted with using keyboard', async () => {
    const wrapper = mount(PatternCard, {
      props: {
        pattern: mockPattern
      }
    })

    const card = wrapper.find('[role="button"]')
    expect(card.exists()).toBe(true)
    
    await card.trigger('keydown.enter')
    await wrapper.vm.$nextTick()
    
    expect(mockPush).toHaveBeenCalledWith('/pattern/1')
  })
}) 