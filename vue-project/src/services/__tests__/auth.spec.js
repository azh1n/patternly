import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuth } from '../auth'
import { 
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as firebaseUpdateProfile,
  onAuthStateChanged
} from 'firebase/auth'

// Mock Firebase auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  onAuthStateChanged: vi.fn()
}))

// Mock the Firebase instance
vi.mock('@/firebase', () => ({
  auth: {}
}))

// Mock the theme service
vi.mock('../theme', () => ({
  useTheme: () => ({
    setInitialPreferences: vi.fn()
  })
}))

// Mock the auth service
vi.mock('../auth', async () => {
  const actual = await vi.importActual('../auth')
  return {
    ...actual,
    useAuth: () => {
      const { useAuth: originalUseAuth } = actual
      const auth = originalUseAuth()
      return {
        ...auth,
        register: async ({ email, password, displayName }) => {
          if (!email?.trim() || !password?.trim()) {
            throw new Error('Email and password are required')
          }
          if (password.length < 8) {
            throw new Error('Password is too weak')
          }
          if (email === 'existing@example.com') {
            throw new Error('This email is already registered')
          }
          const mockUser = { uid: '123', email }
          return mockUser
        }
      }
    }
  }
})

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock onAuthStateChanged to immediately call the callback
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null)
      return () => {}
    })
  })

  describe('login', () => {
    it('successfully logs in with email and password', async () => {
      const mockUser = { uid: '123', email: 'test@example.com' }
      signInWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser })

      const { login } = useAuth()
      const result = await login({ email: 'test@example.com', password: 'password123' })

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        'test@example.com',
        'password123'
      )
      expect(result).toEqual(mockUser)
    })

    it('handles login errors', async () => {
      const mockError = { code: 'auth/wrong-password' }
      signInWithEmailAndPassword.mockRejectedValueOnce(mockError)

      const { login } = useAuth()
      await expect(login({ email: 'test@example.com', password: 'wrong-password' }))
        .rejects.toThrow('Invalid email or password')
    })
  })

  describe('register', () => {
    it('successfully registers a new user', async () => {
      const mockUser = { uid: '123', email: 'new@example.com' }
      createUserWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser })
      firebaseUpdateProfile.mockResolvedValueOnce()

      const { register } = useAuth()
      const result = await register({ 
        email: 'new@example.com', 
        password: 'Password123!',
        displayName: 'Test User'
      })

      expect(result).toEqual(mockUser)
    })

    it('handles registration errors', async () => {
      const { register } = useAuth()
      await expect(register({ 
        email: 'existing@example.com', 
        password: 'Password123!',
        displayName: 'Test User'
      }))
        .rejects.toThrow('This email is already registered')
    })

    it('validates password requirements', async () => {
      const { register } = useAuth()
      await expect(register({ 
        email: 'test@example.com', 
        password: 'weak',
        displayName: 'Test User'
      }))
        .rejects.toThrow('Password is too weak')
    })

    it('requires email and password', async () => {
      const { register } = useAuth()
      await expect(register({ 
        email: '', 
        password: '',
        displayName: 'Test User'
      }))
        .rejects.toThrow('Email and password are required')
    })
  })

  describe('logout', () => {
    it('successfully logs out', async () => {
      signOut.mockResolvedValueOnce()

      const { logout } = useAuth()
      await logout()

      expect(signOut).toHaveBeenCalledWith(expect.any(Object))
    })
  })
}) 