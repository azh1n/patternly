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

const user = ref(null)
const loading = ref(true)

// Set up auth state listener
onAuthStateChanged(auth, (firebaseUser) => {
  user.value = firebaseUser
  loading.value = false
})

function getErrorMessage(error) {
  console.error('Auth error:', error) // Log the full error for debugging
  
  const code = error.code || ''
  switch (code) {
    case 'auth/configuration-not-found':
      return 'Authentication is not properly configured. Please ensure Email/Password authentication is enabled in the Firebase Console.'
    case 'auth/email-already-in-use':
      return 'This email is already registered'
    case 'auth/invalid-email':
      return 'Invalid email address'
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled in the Firebase Console'
    case 'auth/weak-password':
      return 'Password is too weak (minimum 6 characters)'
    case 'auth/user-disabled':
      return 'This account has been disabled'
    case 'auth/user-not-found':
      return 'No account found with this email'
    case 'auth/wrong-password':
      return 'Incorrect password'
    case 'auth/requires-recent-login':
      return 'Please log out and log back in to perform this action'
    default:
      // Log unexpected errors for debugging
      console.warn('Unexpected auth error:', error)
      return error.message || 'An error occurred. Please try again'
  }
}

export function useAuth() {
  const register = async ({ email, password, displayName }) => {
    try {
      // Validate inputs before attempting registration
      if (!email || !password) {
        throw new Error('Email and password are required')
      }
      
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long')
      }

      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)
      if (displayName) {
        await firebaseUpdateProfile(newUser, { displayName })
      }
      return newUser
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  const login = async ({ email, password }) => {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required')
      }

      const { user: loggedInUser } = await signInWithEmailAndPassword(auth, email, password)
      return loggedInUser
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  const updateProfile = async (profileData) => {
    try {
      if (!auth.currentUser) throw new Error('No user logged in')
      await firebaseUpdateProfile(auth.currentUser, profileData)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      if (!auth.currentUser) throw new Error('No user logged in')
      await firebaseUpdatePassword(auth.currentUser, newPassword)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  const resetPassword = async (email) => {
    try {
      if (!email) {
        throw new Error('Email is required')
      }
      await sendPasswordResetEmail(auth, email)
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