import { ref } from 'vue'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db, auth } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'

const isDarkMode = ref(false) // Default to light mode

// Initialize theme and watch auth state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadUserPreferences()
  } else {
    // Reset to default theme when user logs out
    isDarkMode.value = false
    applyTheme()
  }
})

async function loadUserPreferences() {
  try {
    const userId = auth.currentUser?.uid
    if (!userId) return

    const prefDoc = await getDoc(doc(db, 'userPreferences', userId))
    if (prefDoc.exists()) {
      const prefs = prefDoc.data()
      isDarkMode.value = prefs.isDarkMode ?? false
      applyTheme()
    } else {
      await setInitialPreferences()
    }
  } catch (error) {
    console.error('Error loading user preferences:', error)
  }
}

async function setInitialPreferences() {
  const userId = auth.currentUser?.uid
  if (!userId) return

  try {
    await setDoc(doc(db, 'userPreferences', userId), {
      isDarkMode: false
    })
    isDarkMode.value = false
    applyTheme()
  } catch (error) {
    console.error('Error setting initial preferences:', error)
  }
}

async function saveThemePreference(dark) {
  const userId = auth.currentUser?.uid
  if (!userId) return

  try {
    await setDoc(doc(db, 'userPreferences', userId), {
      isDarkMode: dark
    }, { merge: true })
  } catch (error) {
    console.error('Error saving theme preference:', error)
  }
}

function applyTheme() {
  const root = document.documentElement
  if (isDarkMode.value) {
    root.style.setProperty('--main-bg', '#121212')
    root.style.setProperty('--header-bg', '#1a1a1a')
    root.style.setProperty('--text-primary', '#ffffff')
    root.style.setProperty('--text-secondary', '#888888')
    root.style.setProperty('--border-color', '#333333')
    root.style.setProperty('--card-bg', '#2a2a2a')
    root.style.setProperty('--input-bg', '#2a2a2a')
    root.style.setProperty('--input-border', '#333333')
    root.style.setProperty('--hover-bg', '#333333')
    root.style.setProperty('--accent-color', '#4CAF50')
    root.style.setProperty('--accent-hover', '#45a049')
    root.style.setProperty('--button-bg', '#2a2a2a')
    root.style.setProperty('--button-hover-bg', '#333333')
    root.style.setProperty('--button-text', '#ffffff')
    root.style.setProperty('--button-border', '#333333')
  } else {
    root.style.setProperty('--main-bg', '#f8f9fa')
    root.style.setProperty('--header-bg', '#ffffff')
    root.style.setProperty('--text-primary', '#212529')
    root.style.setProperty('--text-secondary', '#6c757d')
    root.style.setProperty('--border-color', '#dee2e6')
    root.style.setProperty('--card-bg', '#ffffff')
    root.style.setProperty('--input-bg', '#ffffff')
    root.style.setProperty('--input-border', '#ced4da')
    root.style.setProperty('--hover-bg', '#f8f9fa')
    root.style.setProperty('--accent-color', '#4CAF50')
    root.style.setProperty('--accent-hover', '#45a049')
    root.style.setProperty('--button-bg', '#f8f9fa')
    root.style.setProperty('--button-hover-bg', '#e9ecef')
    root.style.setProperty('--button-text', '#212529')
    root.style.setProperty('--button-border', '#dee2e6')
  }
}

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  applyTheme()
  saveThemePreference(isDarkMode.value)
}

// Apply default theme immediately
applyTheme()

export function useTheme() {
  return {
    isDarkMode,
    toggleTheme,
    setInitialPreferences,
    loadUserPreferences
  }
} 