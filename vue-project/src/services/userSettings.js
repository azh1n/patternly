import { ref } from 'vue'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/firebase'

// Feature flags state
const experimentalFeatures = ref(false)
const initialized = ref(false)
let initPromise = null

// Export reactive state
export function useUserSettings() {
  return {
    experimentalFeatures,
    initialized,
    toggleExperimentalFeatures,
    initSettings,
  }
}

// Initialize user settings
async function initSettings() {
  if (initialized.value) return initPromise
  if (initPromise) return initPromise

  initPromise = new Promise(async (resolve) => {
    // Initialize settings and watch auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await loadUserSettings()
      } else {
        // Reset to default settings when user logs out
        experimentalFeatures.value = false
      }
      unsubscribe() // Unsubscribe after first auth state change
      initialized.value = true
      resolve()
    })

    // Apply default settings immediately
    experimentalFeatures.value = false
    initialized.value = true
  })

  await initPromise // Wait for initialization to complete
  return initPromise
}

// Load user settings from Firestore
async function loadUserSettings() {
  try {
    const userId = auth.currentUser?.uid
    if (!userId) return

    const prefDoc = await getDoc(doc(db, 'userPreferences', userId))
    if (prefDoc.exists()) {
      const prefs = prefDoc.data()
      experimentalFeatures.value = prefs.experimentalFeatures ?? false
    } else {
      await setInitialSettings()
    }
  } catch (error) {
    console.error('Error loading user settings:', error)
  }
}

// Set initial settings for new users
async function setInitialSettings() {
  const userId = auth.currentUser?.uid
  if (!userId) return

  try {
    await setDoc(doc(db, 'userPreferences', userId), {
      experimentalFeatures: false
    }, { merge: true })
    experimentalFeatures.value = false
  } catch (error) {
    console.error('Error setting initial settings:', error)
  }
}

// Toggle experimental features
async function toggleExperimentalFeatures() {
  const userId = auth.currentUser?.uid
  if (!userId) return

  try {
    experimentalFeatures.value = !experimentalFeatures.value
    await setDoc(doc(db, 'userPreferences', userId), {
      experimentalFeatures: experimentalFeatures.value
    }, { merge: true })
    return experimentalFeatures.value
  } catch (error) {
    console.error('Error saving experimental features setting:', error)
    // Revert on error
    experimentalFeatures.value = !experimentalFeatures.value
    return experimentalFeatures.value
  }
} 