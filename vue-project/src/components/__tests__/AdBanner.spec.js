import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AdBanner from '../AdBanner.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

describe('AdBanner', () => {
  let appendChildSpy
  let consoleErrorSpy

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()

    // Mock document.createElement
    vi.spyOn(document, 'createElement')

    // Mock document.head.appendChild
    appendChildSpy = vi.spyOn(document.head, 'appendChild').mockImplementation(() => {})

    // Mock console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock window.adsbygoogle
    vi.stubGlobal('adsbygoogle', { push: vi.fn() })

    await router.push('/')
    await router.isReady()
  })

  const mountWithRouter = (opts = {}) =>
    mount(AdBanner, { global: { plugins: [router] }, ...opts })

  it('renders the ad banner container', () => {
    const wrapper = mountWithRouter()
    expect(wrapper.find('.ad-banner').exists()).toBe(true)
    expect(wrapper.find('.adsbygoogle').exists()).toBe(true)
  })

  it('loads the AdSense script', () => {
    mountWithRouter()
    expect(document.createElement).toHaveBeenCalledWith('script')
    expect(appendChildSpy).toHaveBeenCalled()
  })

  it('has the correct ad unit attributes', () => {
    const wrapper = mountWithRouter()
    const adUnit = wrapper.find('.adsbygoogle')

    expect(adUnit.attributes('data-ad-client')).toBe('ca-pub-8237432847073620')
    expect(adUnit.attributes('data-ad-slot')).toBe('7158018837')
    expect(adUnit.attributes('data-ad-format')).toBe('auto')
    expect(adUnit.attributes('data-full-width-responsive')).toBe('false')
  })

  it('has the correct banner class', () => {
    const wrapper = mountWithRouter()
    expect(wrapper.find('.ad-banner').exists()).toBe(true)
  })
})
