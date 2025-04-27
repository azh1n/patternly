<!-- User profile page component for managing account settings -->
<template>
  <!-- Main profile container with side navigation -->
  <div class="app-layout">
    <SideNavigation v-model:expanded="sidebarExpanded" />
    
    <div class="main-container" :class="{ 'sidebar-expanded': sidebarExpanded }">
      <!-- Mobile header with menu button -->
      <div class="mobile-header">
        <button class="menu-btn" @click="toggleSidebar">
          <font-awesome-icon icon="bars" />
        </button>
        <h1 class="mobile-title">Patternly</h1>
        <div class="spacer"></div>
      </div>
    
      <!-- Profile content wrapper -->
      <div class="profile-content">
        <!-- Profile settings card -->
        <div class="profile-card">
          <h2>
            <font-awesome-icon icon="user" class="profile-icon" />
            Profile Settings
          </h2>
          
          <!-- Loading state indicator -->
          <div v-if="loading" class="loading">
            Loading...
          </div>
          
          <!-- Profile settings form -->
          <form v-else @submit.prevent="handleSubmit" class="profile-form">
            <!-- Theme toggle section -->
            <div class="form-group theme-toggle">
              <label>
                <font-awesome-icon :icon="isDarkMode ? 'moon' : 'sun'" class="field-icon" />
                Theme
              </label>
              <button 
                type="button"
                class="theme-button"
                @click="toggleTheme"
              >
                <font-awesome-icon :icon="isDarkMode ? 'sun' : 'moon'" class="theme-icon" />
                Switch to {{ isDarkMode ? 'Light' : 'Dark' }} Mode
              </button>
            </div>
            


            <!-- Display name input group -->
            <div class="form-group">
              <label for="displayName">
                <font-awesome-icon icon="user-circle" class="field-icon" />
                Display Name
              </label>
              <input
                id="displayName"
                v-model="form.displayName"
                type="text"
                :placeholder="user?.displayName || 'Enter display name'"
              >
            </div>
            
            <!-- Email display (read-only) -->
            <div class="form-group">
              <label for="email">
                <font-awesome-icon icon="envelope" class="field-icon" />
                Email
              </label>
              <input
                id="email"
                :value="user?.email"
                type="email"
                disabled
              >
            </div>
            
            <!-- New password input group -->
            <div class="form-group">
              <label for="newPassword">
                <font-awesome-icon icon="lock" class="field-icon" />
                New Password (optional)
              </label>
              <input
                id="newPassword"
                v-model="form.newPassword"
                type="password"
                placeholder="Enter new password"
              >
            </div>
            
            <!-- Error message display -->
            <div v-if="error" class="error-message">
              {{ error }}
            </div>
            
            <!-- Success message display -->
            <div v-if="success" class="success-message">
              {{ success }}
            </div>
            
            <!-- Action buttons group -->
            <div class="button-group">
              <!-- Save changes button -->
              <button 
                type="submit" 
                class="primary-button"
                :disabled="isSubmitting"
              >
                <font-awesome-icon icon="save" />
                {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
              </button>
              
              <!-- Logout button -->
              <button 
                type="button" 
                class="secondary-button"
                @click="handleLogout"
                :disabled="isSubmitting"
              >
                <font-awesome-icon icon="sign-out-alt" />
                Logout
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useAuth } from '@/services/auth'
import { useTheme } from '@/services/theme'
import { useUserSettings } from '@/services/userSettings'
import { useRouter, useRoute } from 'vue-router'
import SideNavigation from '@/components/SideNavigation.vue'

// Initialize router and services
const router = useRouter()
const route = useRoute()
const { user, loading, updateProfile, updatePassword, logout } = useAuth()
const { isDarkMode, toggleTheme } = useTheme()
const { initSettings } = useUserSettings()

// Sidebar state
const sidebarExpanded = ref(window.innerWidth >= 768)

// Toggle sidebar expanded state
const toggleSidebar = () => {
  sidebarExpanded.value = !sidebarExpanded.value
}

// Check if we're in dev mode based on the current route
const isDevMode = computed(() => route.path.includes('/dev'))

// Form state management
const form = reactive({
  displayName: '',
  newPassword: ''
})

// Status indicators
const error = ref('')
const success = ref('')
const isSubmitting = ref(false)

// Initialize user settings
onMounted(async () => {
  try {
    await initSettings()
  } catch (err) {
    console.error('Error loading user settings:', err)
  }
})

// Handle form submission for profile updates
async function handleSubmit() {
  error.value = ''
  success.value = ''
  isSubmitting.value = true

  try {
    // Update display name if provided
    if (form.displayName) {
      await updateProfile({ displayName: form.displayName })
    }

    // Update password if provided
    if (form.newPassword) {
      await updatePassword(form.newPassword)
    }

    success.value = 'Profile updated successfully. Redirecting...'
    form.newPassword = '' // Clear password field after success
    
    // Redirect to pattern page after a delay to show success message
    setTimeout(() => {
      router.push('/')
    }, 1500)
  } catch (err) {
    error.value = err.message
  } finally {
    isSubmitting.value = false
  }
}

// Handle user logout
async function handleLogout() {
  try {
    await logout()
    router.push('/login')
  } catch (err) {
    error.value = err.message
  }
}
</script>

<style scoped>
/* App layout styles */
.app-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--main-bg);
  color: var(--text-primary);
  position: relative;
}

.main-container {
  flex: 1;
  padding-left: 60px; /* Width of collapsed sidebar */
  transition: padding-left 0.3s ease;
  width: 100%;
  padding-bottom: 60px; /* Space for ad banner */
}

.main-container.sidebar-expanded {
  padding-left: 220px; /* Width of expanded sidebar */
}

.mobile-header {
  display: none;
  align-items: center;
  padding: 1rem;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
}

.mobile-title {
  margin: 0 1rem;
  font-size: 1.25rem;
  color: var(--accent-color);
}

.spacer {
  flex: 1;
}

/* Content wrapper styles */
.profile-content {
  padding: 1.5rem;
  width: 100%;
  flex: 1;
  position: relative;
}

/* Profile card styles */
.profile-card {
  background-color: var(--header-bg);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  margin-top: 1rem;
}

/* Card header styles */
.profile-card h2 {
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  font-size: 1.25rem;
  text-align: center;
}

/* Loading state styles */
.loading {
  text-align: center;
  padding: 1.5rem;
  color: var(--text-secondary);
}

/* Form layout styles */
.profile-form {
  display: flex;
  flex-direction: column;
}

/* Form group styles */
.form-group {
  margin-bottom: 1.25rem;
}

/* Form labels */
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-weight: 500;
}

/* Input field styles */
.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--card-bg);
  color: var(--text-primary);
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.form-group input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Field icons */
.field-icon {
  margin-right: 0.5rem;
  opacity: 0.7;
}

/* Theme toggle button styles */
.theme-toggle {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.25rem;
}

.theme-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--card-bg);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-button:hover {
  background-color: var(--hover-bg);
}

.theme-icon {
  font-size: 1.2rem;
}

/* Form action buttons */
.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.primary-button, 
.secondary-button {
  padding: 0.75rem 1.25rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  justify-content: center;
}

.primary-button {
  background-color: var(--accent-color);
  border: none;
  color: white;
}

.primary-button:hover:not(:disabled) {
  background-color: var(--accent-hover);
}

.secondary-button {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.secondary-button:hover:not(:disabled) {
  background-color: var(--hover-bg);
}

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Status message styles */
.error-message,
.success-message {
  margin: 1rem 0;
  padding: 0.75rem;
  border-radius: 6px;
  text-align: center;
}

.error-message {
  background-color: rgba(255, 68, 68, 0.1);
  border: 1px solid #ff4444;
  color: #ff4444;
}

.success-message {
  background-color: rgba(76, 175, 80, 0.1);
  border: 1px solid #4caf50;
  color: #4caf50;
}

/* Mobile responsive styles */
@media (max-width: 767px) {
  .main-container {
    padding-left: 0;
  }
  
  .main-container.sidebar-expanded {
    padding-left: 0;
  }
  
  .mobile-header {
    display: flex;
  }

  .profile-content {
    padding: 1rem;
  }
  
  .profile-card {
    padding: 1rem;
  }
  
  .button-group {
    flex-direction: column;
  }
}
</style> 