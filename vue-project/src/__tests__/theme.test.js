import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTheme } from '../services/theme'

// Mock Firebase
vi.mock('@/firebase', () => ({
  auth: {
    currentUser: null
  },
  db: {}
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => false,
    data: () => ({})
  })),
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, callback) => {
    // Simulate immediate callback with no user
    Promise.resolve().then(() => callback(null))
    return vi.fn() // Return unsubscribe function
  })
}))

describe('Theme Service', () => {
  beforeEach(() => {
    // Reset document styles
    document.documentElement.style.cssText = ''
    vi.clearAllMocks()
  })

  it('should initialize with default theme when no user is logged in', async () => {
    const { isDarkMode, applyTheme } = useTheme()
    // Wait for next tick to allow async operations to complete
    await Promise.resolve()
    applyTheme()
    expect(isDarkMode.value).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--main-bg')).toBe('#f8f9fa')
  })

  it('should toggle theme correctly', async () => {
    const { isDarkMode, toggleTheme, applyTheme } = useTheme()
    await Promise.resolve()
    applyTheme()
    
    expect(isDarkMode.value).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--main-bg')).toBe('#f8f9fa')
    
    toggleTheme()
    expect(isDarkMode.value).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--main-bg')).toBe('#121212')
    
    toggleTheme()
    expect(isDarkMode.value).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--main-bg')).toBe('#f8f9fa')
  })

  it('should apply correct CSS variables for dark mode', async () => {
    const { isDarkMode, toggleTheme, applyTheme } = useTheme()
    await Promise.resolve()
    
    toggleTheme()
    expect(isDarkMode.value).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--main-bg')).toBe('#121212')
    expect(document.documentElement.style.getPropertyValue('--text-primary')).toBe('#ffffff')
  })

  it('should apply correct CSS variables for light mode', async () => {
    const { isDarkMode, applyTheme } = useTheme()
    await Promise.resolve()
    
    isDarkMode.value = false
    applyTheme()
    
    expect(isDarkMode.value).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--main-bg')).toBe('#f8f9fa')
    expect(document.documentElement.style.getPropertyValue('--text-primary')).toBe('#212529')
  })
}) 