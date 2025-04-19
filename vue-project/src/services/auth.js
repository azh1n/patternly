/**
 * Authentication Service
 * Handles user authentication, registration, and profile management
 * using Firebase Authentication.
 */

import { ref } from 'vue'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as firebaseUpdateProfile,
  updatePassword as firebaseUpdatePassword,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth'
import { auth } from '@/firebase'

// State
const user = ref(null)
const loading = ref(true)
const loginAttempts = new Map()

// Constants
const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MINUTES: 15
}

const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  PATTERNS: {
    UPPERCASE: /[A-Z]/,
    LOWERCASE: /[a-z]/,
    NUMBERS: /\d/,
    SPECIAL: /[!@#$%^&*(),.?":{}|<>]/
  }
}

/**
 * Initialize auth state listener
 */
onAuthStateChanged(auth, (firebaseUser) => {
  user.value = firebaseUser
  loading.value = false
})

/**
 * Validates password strength against security requirements
 * @param {string} password - The password to validate
 * @returns {string[]} Array of validation error messages
 */
function validatePassword(password) {
  const errors = []
  
  if (password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters long`)
  }
  
  const { PATTERNS } = PASSWORD_REQUIREMENTS
  if (!PATTERNS.UPPERCASE.test(password)) errors.push('Must contain at least one uppercase letter')
  if (!PATTERNS.LOWERCASE.test(password)) errors.push('Must contain at least one lowercase letter')
  if (!PATTERNS.NUMBERS.test(password)) errors.push('Must contain at least one number')
  if (!PATTERNS.SPECIAL.test(password)) errors.push('Must contain at least one special character')

  return errors
}

/**
 * Checks if the user has exceeded rate limits for authentication attempts
 * @param {string} email - The email address to check
 * @throws {Error} If rate limit is exceeded
 */
function checkRateLimit(email) {
  const now = Date.now()
  const windowMs = RATE_LIMIT.WINDOW_MINUTES * 60 * 1000
  const attempts = loginAttempts.get(email) || []
  const recentAttempts = attempts.filter(time => now - time < windowMs)
  
  if (recentAttempts.length >= RATE_LIMIT.MAX_ATTEMPTS) {
    const timeUntilReset = Math.ceil((recentAttempts[0] + windowMs - now) / 1000 / 60)
    throw new Error(`Too many login attempts. Please try again in ${timeUntilReset} minutes`)
  }

  loginAttempts.set(email, [...recentAttempts, now])
}

/**
 * Maps Firebase error codes to user-friendly messages
 * @param {Error} error - The Firebase error object
 * @returns {string} User-friendly error message
 */
function getErrorMessage(error) {
  console.error('Auth error:', error.code, error.message)
  
  const errorMessages = {
    'auth/configuration-not-found': 'Authentication service is temporarily unavailable. Please try again later.',
    'auth/email-already-in-use': 'This email is already registered',
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
    'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/user-not-found': 'Invalid email or password',
    'auth/wrong-password': 'Invalid email or password',
    'auth/requires-recent-login': 'This action requires recent authentication. Please log out and log back in.',
    'auth/too-many-requests': 'Too many unsuccessful attempts. Please try again later.'
  }

  return errorMessages[error.code] || 'An error occurred. Please try again later.'
}

/**
 * Sanitizes user input to prevent XSS attacks
 * @param {string} input - The input to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized input
 */
function sanitizeInput(input, maxLength = 50) {
  return input?.trim()
    .replace(/[<>]/g, '')
    .substring(0, maxLength)
}

/**
 * Authentication service hook
 * @returns {Object} Authentication methods and state
 */
export function useAuth() {
  /**
   * Registers a new user
   * @param {Object} params - Registration parameters
   * @param {string} params.email - User's email
   * @param {string} params.password - User's password
   * @param {string} [params.displayName] - User's display name
   */
  const register = async ({ email, password, displayName }) => {
    try {
      if (!email?.trim() || !password?.trim()) {
        throw new Error('Email and password are required')
      }

      const passwordErrors = validatePassword(password)
      if (passwordErrors.length > 0) {
        throw new Error(passwordErrors.join('. '))
      }

      const sanitizedDisplayName = sanitizeInput(displayName)
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email.trim(), password)
      
      if (sanitizedDisplayName) {
        await firebaseUpdateProfile(newUser, { displayName: sanitizedDisplayName })
      }
      return newUser
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Logs in an existing user
   * @param {Object} params - Login parameters
   * @param {string} params.email - User's email
   * @param {string} params.password - User's password
   */
  const login = async ({ email, password }) => {
    try {
      if (!email?.trim() || !password?.trim()) {
        throw new Error('Email and password are required')
      }

      checkRateLimit(email)
      const { user: loggedInUser } = await signInWithEmailAndPassword(auth, email.trim(), password)
      return loggedInUser
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Logs out the current user and cleans up session data
   */
  const logout = async () => {
    try {
      await signOut(auth)
      loginAttempts.clear()
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Updates user profile information
   * @param {Object} profileData - Profile data to update
   * @param {string} [profileData.displayName] - New display name
   */
  const updateProfile = async (profileData) => {
    try {
      if (!auth.currentUser) throw new Error('No user logged in')
      
      const sanitizedData = {
        displayName: sanitizeInput(profileData.displayName)
      }

      await firebaseUpdateProfile(auth.currentUser, sanitizedData)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Updates user's password
   * @param {string} newPassword - New password
   */
  const updatePassword = async (newPassword) => {
    try {
      if (!auth.currentUser) throw new Error('No user logged in')
      
      const passwordErrors = validatePassword(newPassword)
      if (passwordErrors.length > 0) {
        throw new Error(passwordErrors.join('. '))
      }

      await firebaseUpdatePassword(auth.currentUser, newPassword)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Sends password reset email
   * @param {string} email - User's email address
   */
  const resetPassword = async (email) => {
    try {
      if (!email?.trim()) {
        throw new Error('Email is required')
      }

      checkRateLimit(email)
      await sendPasswordResetEmail(auth, email.trim())
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  return {
    // State
    user,
    loading,
    
    // Authentication methods
    register,
    login,
    logout,
    
    // Profile management
    updateProfile,
    updatePassword,
    resetPassword
  }
} 