import { ref, watch } from 'vue'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from './auth'

const isDarkMode = ref(true) // Default to dark mode
const { user } = useAuth()

// Watch for user changes to load their preferences
watch(() => user.value?.uid, async (newUserId) => {
  if (newUserId) {
    await loadUserPreferences()
  }
})

async function loadUserPreferences() {
  try {
    const prefDoc = await getDoc(doc(db, 'userPreferences', user.value.uid))
    if (prefDoc.exists()) {
      const prefs = prefDoc.data()
      isDarkMode.value = prefs.isDarkMode ?? true
      applyTheme()
    }
  } catch (error) {
    console.error('Error loading user preferences:', error)
  }
}

async function saveThemePreference(dark) {
  if (!user.value?.uid) return

  try {
    await setDoc(doc(db, 'userPreferences', user.value.uid), {
      isDarkMode: dark
    }, { merge: true })
  } catch (error) {
    console.error('Error saving theme preference:', error)
  }
}

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  applyTheme()
  saveThemePreference(isDarkMode.value)
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

export function useTheme() {
  return {
    isDarkMode,
    toggleTheme,
    loadUserPreferences
  }
} 