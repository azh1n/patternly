import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AddPatternModal from '../AddPatternModal.vue'

describe('AddPatternModal', () => {
  const createWrapper = (props = {}) => {
    return mount(AddPatternModal, {
      props: {
        modelValue: true,
        isLoading: false,
        ...props
      }
    })
  }

  it('renders the modal when modelValue is true', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('does not render when modelValue is false', () => {
    const wrapper = createWrapper({ modelValue: false })
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('displays the correct title and form elements', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('h2').text()).toBe('Add New Pattern')
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('emits update:modelValue when clicking the overlay', async () => {
    const wrapper = createWrapper()
    const overlay = wrapper.find('.modal-overlay')
    await overlay.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([false])
  })

  it('emits update:modelValue when clicking the close button', async () => {
    const wrapper = createWrapper()
    const closeButton = wrapper.find('.close-button')
    await closeButton.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([false])
  })

  it('emits update:modelValue when clicking the cancel button', async () => {
    const wrapper = createWrapper()
    const cancelButton = wrapper.find('.cancel-button')
    await cancelButton.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([false])
  })

  it('handles pattern name input correctly', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('input[type="text"]')
    await input.setValue('Test Pattern')
    expect(input.element.value).toBe('Test Pattern')
  })

  it('handles pattern text input correctly', async () => {
    const wrapper = createWrapper()
    const textarea = wrapper.find('textarea')
    const testText = 'Row 1: k2, p2\nRow 2: p2, k2'
    await textarea.setValue(testText)
    expect(textarea.element.value).toBe(testText)
  })

  it('enforces character limit on pattern text', async () => {
    const wrapper = createWrapper()
    const textarea = wrapper.find('textarea')
    const longText = 'a'.repeat(100001) // Exceeds MAX_CHARS
    await textarea.setValue(longText)
    expect(textarea.element.value.length).toBe(100000) // Should be truncated to MAX_CHARS
  })

  it('handles pattern submission correctly', async () => {
    const wrapper = createWrapper()

    // Set form values
    await wrapper.find('input[type="text"]').setValue('Test Pattern')
    await wrapper.find('textarea').setValue('Test instructions')

    // Save the pattern
    await wrapper.find('.save-button').trigger('click')

    // Check that pattern-added event was emitted with correct data
    expect(wrapper.emitted('pattern-added')).toBeTruthy()
    expect(wrapper.emitted('pattern-added')[0]).toEqual([{
      name: 'Test Pattern',
      content: 'Test instructions'
    }])

    // Check that modal is closed
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([false])

    // Open modal again
    await wrapper.setProps({ modelValue: true })

    // Check that form is ready for new input
    const input = wrapper.find('input[type="text"]')
    const textarea = wrapper.find('textarea')

    await input.setValue('New Pattern')
    await textarea.setValue('New instructions')

    expect(input.element.value).toBe('New Pattern')
    expect(textarea.element.value).toBe('New instructions')
  })

  it('disables save button when form is invalid', async () => {
    const wrapper = createWrapper()
    const saveButton = wrapper.find('.save-button')
    expect(saveButton.attributes('disabled')).toBeDefined()

    await wrapper.find('input[type="text"]').setValue('Test Pattern')
    expect(saveButton.attributes('disabled')).toBeDefined()

    await wrapper.find('textarea').setValue('Row 1: k2, p2')
    expect(saveButton.attributes('disabled')).toBeUndefined()
  })

  it('shows loading state on save button', () => {
    const wrapper = createWrapper({ isLoading: true })
    const saveButton = wrapper.find('.save-button')
    expect(saveButton.text()).toBe('Saving...')
    expect(saveButton.attributes('disabled')).toBeDefined()
  })

  it('emits pattern-added event and closes modal', async () => {
    const wrapper = createWrapper()

    // Set form values
    await wrapper.find('input[type="text"]').setValue('Test Pattern')
    await wrapper.find('textarea').setValue('Test instructions')

    // Save the pattern
    await wrapper.find('.save-button').trigger('click')

    // Check that pattern-added event was emitted with correct data
    expect(wrapper.emitted('pattern-added')).toBeTruthy()
    expect(wrapper.emitted('pattern-added')[0]).toEqual([{
      name: 'Test Pattern',
      content: 'Test instructions'
    }])

    // Check that modal is closed
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([false])
  })

  it('can add multiple patterns', async () => {
    const wrapper = createWrapper()

    // Add first pattern
    await wrapper.find('input[type="text"]').setValue('Pattern 1')
    await wrapper.find('textarea').setValue('Instructions 1')
    await wrapper.find('.save-button').trigger('click')

    // Add second pattern
    await wrapper.setProps({ modelValue: true })
    await wrapper.find('input[type="text"]').setValue('Pattern 2')
    await wrapper.find('textarea').setValue('Instructions 2')
    await wrapper.find('.save-button').trigger('click')

    // Check both patterns were added
    expect(wrapper.emitted('pattern-added')).toBeTruthy()
    expect(wrapper.emitted('pattern-added').length).toBe(2)
    expect(wrapper.emitted('pattern-added')[0]).toEqual([{
      name: 'Pattern 1',
      content: 'Instructions 1'
    }])
    expect(wrapper.emitted('pattern-added')[1]).toEqual([{
      name: 'Pattern 2',
      content: 'Instructions 2'
    }])
  })
}) 