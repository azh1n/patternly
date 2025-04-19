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
import { useTheme } from './theme'

const user = ref(null)
const loading = ref(true)
const loginAttempts = new Map() // Track login attempts for rate limiting
const { setInitialPreferences } = useTheme()

// Set up auth state listener
onAuthStateChanged(auth, (firebaseUser) => {
  user.value = firebaseUser
  loading.value = false
}, (error) => {
  loading.value = false
})

// Password validation
function validatePassword(password) {
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const errors = []
  if (password.length < minLength) errors.push(`Password must be at least ${minLength} characters long`)
  if (!hasUpperCase) errors.push('Password must contain at least one uppercase letter')
  if (!hasLowerCase) errors.push('Password must contain at least one lowercase letter')
  if (!hasNumbers) errors.push('Password must contain at least one number')
  if (!hasSpecialChar) errors.push('Password must contain at least one special character')

  return errors
}

// Rate limiting
function checkRateLimit(email) {
  const now = Date.now()
  const attempts = loginAttempts.get(email) || []
  const recentAttempts = attempts.filter(time => now - time < 15 * 60 * 1000) // 15 minutes window
  
  if (recentAttempts.length >= 5) {
    const timeUntilReset = Math.ceil((recentAttempts[0] + 15 * 60 * 1000 - now) / 1000 / 60)
    throw new Error(`Too many login attempts. Please try again in ${timeUntilReset} minutes`)
  }

  loginAttempts.set(email, [...recentAttempts, now])
}

function getErrorMessage(error) {
  const code = error.code || ''
  switch (code) {
    case 'auth/configuration-not-found':
      return 'Authentication service is temporarily unavailable. Please try again later.'
    case 'auth/email-already-in-use':
      return 'This email is already registered'
    case 'auth/invalid-email':
      return 'Please enter a valid email address'
    case 'auth/operation-not-allowed':
      return 'This operation is not allowed. Please contact support.'
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password' // Don't specify which is incorrect
    case 'auth/requires-recent-login':
      return 'This action requires recent authentication. Please log out and log back in.'
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please try again later.'
    default:
      return 'An error occurred. Please try again later.'
  }
}

export function useAuth() {
  const register = async ({ email, password, displayName }) => {
    try {
      // Input validation
      if (!email?.trim() || !password?.trim()) {
        throw new Error('Email and password are required')
      }

      // Validate password strength
      const passwordErrors = validatePassword(password)
      if (passwordErrors.length > 0) {
        throw new Error(passwordErrors.join('. '))
      }

      // Sanitize display name
      const sanitizedDisplayName = displayName?.trim()
        .replace(/[<>]/g, '') // Remove potential HTML/script injection
        .substring(0, 50) // Limit length

      const { user: newUser } = await createUserWithEmailAndPassword(auth, email.trim(), password)
      if (sanitizedDisplayName) {
        await firebaseUpdateProfile(newUser, { displayName: sanitizedDisplayName })
      }
      
      // Set initial theme preferences
      await setInitialPreferences()
      
      return newUser
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  const login = async ({ email, password }) => {
    try {
      if (!email?.trim() || !password?.trim()) {
        throw new Error('Email and password are required')
      }

      // Check rate limiting
      checkRateLimit(email)

      const { user: loggedInUser } = await signInWithEmailAndPassword(auth, email.trim(), password)
      return loggedInUser
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  const logout = async () => {
    try {
      // Clear any sensitive data from memory first
      loginAttempts.clear()
      
      // Sign out from Firebase Auth
      await signOut(auth)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  const updateProfile = async (profileData) => {
    try {
      if (!auth.currentUser) throw new Error('No user logged in')
      
      // Sanitize profile data
      const sanitizedData = {
        displayName: profileData.displayName?.trim()
          .replace(/[<>]/g, '')
          .substring(0, 50)
      }

      await firebaseUpdateProfile(auth.currentUser, sanitizedData)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      if (!auth.currentUser) throw new Error('No user logged in')
      
      // Validate new password
      const passwordErrors = validatePassword(newPassword)
      if (passwordErrors.length > 0) {
        throw new Error(passwordErrors.join('. '))
      }

      await firebaseUpdatePassword(auth.currentUser, newPassword)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  const resetPassword = async (email) => {
    try {
      if (!email?.trim()) {
        throw new Error('Email is required')
      }

      // Check rate limiting for reset password
      checkRateLimit(email)

      await sendPasswordResetEmail(auth, email.trim())
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  return {
    user,
    loading,
    register,
    login,
    logout,
    updateProfile,
    updatePassword,
    resetPassword
  }
} 