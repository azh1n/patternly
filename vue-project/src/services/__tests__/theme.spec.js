// Mock Firebase modules before imports
const mockFirestore = {
  doc: vi.fn((db, collection, id) => ({ id })),
  setDoc: vi.fn(),
  getDoc: vi.fn()
}

vi.mock('@/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' }
  },
  db: {}
}))

vi.mock('firebase/firestore', () => ({
  doc: (...args) => mockFirestore.doc(...args),
  setDoc: (...args) => mockFirestore.setDoc(...args),
  getDoc: (...args) => mockFirestore.getDoc(...args)
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, callback) => {
    // Simulate immediate callback with logged-in user
    callback({ uid: 'test-user-id' })
    return vi.fn() // Return unsubscribe function
  })
}))

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTheme } from '../theme'

describe('Theme Service', () => {
  let mediaQueryCallback
  const originalMatchMedia = window.matchMedia
  let theme

  beforeEach(() => {
    // Reset document styles
    document.documentElement.style.cssText = ''
    
    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addEventListener: (event, cb) => {
        mediaQueryCallback = cb
      },
      removeEventListener: vi.fn()
    }))

    // Reset mocks
    vi.clearAllMocks()
    mockFirestore.doc.mockClear()
    mockFirestore.setDoc.mockClear()
    mockFirestore.getDoc.mockClear()

    // Default mock implementations
    mockFirestore.getDoc.mockImplementation(() => Promise.resolve({
      exists: () => false,
      data: () => ({})
    }))

    // Reset theme service
    theme = useTheme()
    theme.resetTheme()
  })

  afterEach(() => {
    // Clean up
    document.documentElement.style.cssText = ''
    window.matchMedia = originalMatchMedia
    mediaQueryCallback = null
    theme.resetTheme()
  })

  it('initializes with system preference when no stored theme', async () => {
    mockFirestore.getDoc.mockImplementationOnce(() => Promise.resolve({
      exists: () => false,
      data: () => ({})
    }))

    await theme.initTheme()
    expect(theme.isDarkMode.value).toBe(false)
  })

  it('loads theme from Firebase if available', async () => {
    mockFirestore.getDoc.mockImplementationOnce(() => Promise.resolve({
      exists: () => true,
      data: () => ({ isDarkMode: true })
    }))

    await theme.initTheme()
    expect(theme.isDarkMode.value).toBe(true)
  })

  it('toggles theme correctly and saves to Firebase', async () => {
    mockFirestore.getDoc.mockImplementationOnce(() => Promise.resolve({
      exists: () => true,
      data: () => ({ isDarkMode: false })
    }))

    await theme.initTheme()
    expect(theme.isDarkMode.value).toBe(false)

    theme.toggleTheme()
    expect(theme.isDarkMode.value).toBe(true)
    expect(mockFirestore.setDoc).toHaveBeenCalledWith(
      { id: 'test-user-id' },
      { isDarkMode: true },
      { merge: true }
    )
  })

  it('applies correct CSS variables for dark mode', async () => {
    mockFirestore.getDoc.mockImplementationOnce(() => Promise.resolve({
      exists: () => true,
      data: () => ({ isDarkMode: false })
    }))

    await theme.initTheme()
    theme.toggleTheme()

    expect(theme.isDarkMode.value).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--main-bg')).toBe('#121212')
    expect(document.documentElement.style.getPropertyValue('--text-primary')).toBe('#ffffff')
  })

  it('applies correct CSS variables for light mode', async () => {
    mockFirestore.getDoc.mockImplementationOnce(() => Promise.resolve({
      exists: () => true,
      data: () => ({ isDarkMode: true })
    }))

    await theme.initTheme()
    theme.toggleTheme()

    expect(theme.isDarkMode.value).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--main-bg')).toBe('#f8f9fa')
    expect(document.documentElement.style.getPropertyValue('--text-primary')).toBe('#212529')
  })

  it('responds to system theme changes', async () => {
    await theme.initTheme()

    // Simulate system theme change
    if (mediaQueryCallback) {
      mediaQueryCallback({ matches: true })
      expect(theme.isDarkMode.value).toBe(true)
      expect(document.documentElement.style.getPropertyValue('--main-bg')).toBe('#121212')
    }
  })
}) 