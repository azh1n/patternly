<!-- User profile page component for managing account settings -->
<template>
  <!-- Main profile container -->
  <div class="profile-container">
    <AppHeader />

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
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuth } from '@/services/auth'
import { useTheme } from '@/services/theme'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'

// Initialize router and services
const router = useRouter()
const { user, loading, updateProfile, updatePassword, logout } = useAuth()
const { isDarkMode, toggleTheme } = useTheme()

// Form state management
const form = reactive({
  displayName: '',
  newPassword: ''
})

// Status indicators
const error = ref('')
const success = ref('')
const isSubmitting = ref(false)

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
/* Main container styles */
.profile-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--main-bg);
}

/* Content wrapper styles */
.profile-content {
  padding: 1rem;
  margin: 0 auto;
  width: 100%;
  max-width: 100%;
  flex: 1;
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
  gap: 1.25rem;
  width: 100%;
  margin: 0 auto;
}

/* Form group styles */
.form-group {
  position: relative;
  margin-bottom: 1rem;
}

/* Input icon positioning */
.form-group .input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

/* Input field styles */
.form-group input {
  padding: 0.75rem;
  background-color: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  font-size: 1rem;
  color: var(--text-primary);
  transition: all 0.2s;
  width: 100%;
}

/* Form label styles */
.form-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

/* Field icon styles */
.field-icon {
  color: var(--accent-color);
  width: 16px;
  height: 16px;
}

/* Input focus state */
.form-group input:focus {
  outline: none;
  border-color: var(--accent-color);
  background-color: var(--hover-bg);
}

/* Disabled input styles */
.form-group input:disabled {
  background-color: var(--disabled-bg);
  cursor: not-allowed;
  color: var(--text-secondary);
}

/* Input placeholder styles */
.form-group input::placeholder {
  color: var(--text-secondary);
}

/* Button group layout */
.button-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
  width: 100%;
}

/* Common button styles */
.button-group button {
  width: 100%;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Disabled button state */
button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Primary button styles */
.primary-button {
  background: var(--accent-color);
  color: white;
  border: none;
}

/* Primary button hover state */
.primary-button:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

/* Secondary button styles */
.secondary-button {
  background: transparent;
  color: var(--accent-color);
  border: 1px solid var(--accent-color);
}

/* Secondary button hover state */
.secondary-button:hover:not(:disabled) {
  background: var(--hover-bg);
}

/* Message styles */
.error-message,
.success-message {
  padding: 0.75rem;
  border-radius: 6px;
  text-align: center;
  font-size: 0.9rem;
}

/* Error message styles */
.error-message {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.2);
}

/* Success message styles */
.success-message {
  background-color: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.2);
  position: sticky;
  top: 0;
  z-index: 100;
}

/* Profile icon styles */
.profile-icon {
  margin-right: 0.5rem;
  color: var(--accent-color);
}

/* Theme toggle section styles */
.theme-toggle {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

/* Theme toggle button styles */
.theme-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

/* Theme button hover state */
.theme-button:hover {
  background-color: var(--hover-bg);
  border-color: var(--accent-color);
}

/* Theme icon styles */
.theme-icon {
  font-size: 1.2rem;
  color: var(--accent-color);
}

/* Tablet styles */
@media (min-width: 768px) {
  .profile-content {
    padding: 2rem;
    max-width: 600px;
  }

  .profile-card {
    padding: 2rem;
    border-radius: 12px;
  }

  .profile-card h2 {
    font-size: 1.5rem;
  }

  .button-group {
    flex-direction: row;
  }

  .button-group button {
    flex: 1;
  }
}

/* Desktop styles */
@media (min-width: 1024px) {
  .profile-content {
    padding: 3rem;
  }

  .profile-card {
    padding: 3rem;
  }
}

/* Remove any development overlays */
:deep(.vue-dev-overlay),
:deep(.__vue-dev-overlay) {
  display: none !important;
}
</style> 