<!--
  ProfilePage.vue
  User profile management component.
  
  Features:
  - Display name editing
  - Email management
  - Password change
  - Form validation
  - Error handling
  - Loading states
  - Responsive design
  - Keyboard navigation
-->
<template>
  <div class="profile-container">
    <AppHeader />

    <div class="profile-content">
      <div class="profile-card">
        <h2>
          <font-awesome-icon icon="user" class="profile-icon" />
          Profile Settings
        </h2>
        
        <div v-if="loading" class="loading">
          Loading...
        </div>
        
        <form 
          @submit.prevent="handleSubmit" 
          class="profile-form"
          role="form"
          aria-label="Profile settings form"
        >
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

          <div class="form-group">
            <label for="displayName">
              <font-awesome-icon icon="user-circle" class="field-icon" />
              Display Name
            </label>
            <div class="input-wrapper">
              <input
                id="displayName"
                v-model="form.displayName"
                type="text"
                :placeholder="user?.displayName || 'Enter display name'"
                :class="{ 'error': displayNameError }"
                aria-invalid="displayNameError"
                aria-describedby="display-name-error"
                required
                autocomplete="name"
                @keydown.enter="handleSubmit"
              >
            </div>
            <span v-if="displayNameError" id="display-name-error" class="error-message">
              {{ displayNameError }}
            </span>
          </div>
          
          <div class="form-group">
            <label for="email">
              <font-awesome-icon icon="envelope" class="field-icon" />
              Email
            </label>
            <div class="input-wrapper">
              <input
                id="email"
                v-model="form.email"
                type="email"
                :value="user?.email"
                :class="{ 'error': emailError }"
                aria-invalid="emailError"
                aria-describedby="email-error"
                required
                autocomplete="email"
                @keydown.enter="handleSubmit"
              >
            </div>
            <span v-if="emailError" id="email-error" class="error-message">
              {{ emailError }}
            </span>
          </div>
          
          <div class="form-group">
            <label for="newPassword">
              <font-awesome-icon icon="lock" class="field-icon" />
              New Password (optional)
            </label>
            <div class="input-wrapper">
              <input
                id="newPassword"
                v-model="form.newPassword"
                type="password"
                placeholder="Enter new password"
                :class="{ 'error': passwordError }"
                aria-invalid="passwordError"
                aria-describedby="password-error"
                autocomplete="new-password"
                @keydown.enter="handleSubmit"
              >
              <button
                type="button"
                class="toggle-password"
                @click="togglePassword"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
              >
                <font-awesome-icon 
                  :icon="showPassword ? 'eye-slash' : 'eye'" 
                  aria-hidden="true"
                />
              </button>
            </div>
            <span v-if="passwordError" id="password-error" class="error-message">
              {{ passwordError }}
            </span>
          </div>
          
          <div v-if="error" class="error-message">
            {{ error }}
          </div>
          
          <div v-if="success" class="success-message">
            {{ success }}
          </div>
          
          <div class="button-group">
            <button 
              type="submit" 
              class="primary-button"
              :disabled="isSubmitting"
            >
              <font-awesome-icon icon="save" />
              {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
            </button>
            
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
/**
 * Imports
 */
import { ref, reactive, onMounted, computed } from 'vue'
import { useAuth } from '@/services/auth'
import { useTheme } from '@/services/theme'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'

/**
 * Router Setup
 */
const router = useRouter()

/**
 * Auth Setup
 */
const { user, loading, updateProfile, updatePassword, logout } = useAuth()
const { isDarkMode, toggleTheme } = useTheme()

/**
 * State
 */
const form = reactive({
  displayName: '',
  email: '',
  newPassword: ''
})

const error = ref('')
const success = ref('')
const isSubmitting = ref(false)
const showPassword = ref(false)
const displayNameError = ref('')
const emailError = ref('')
const passwordError = ref('')

/**
 * Computed Properties
 */
const isDisplayNameValid = computed(() => {
  return form.displayName.trim().length >= 2
})

const isEmailValid = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(form.email)
})

const isPasswordValid = computed(() => {
  return !form.newPassword || form.newPassword.length >= 6
})

/**
 * Methods
 */
const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const resetForm = () => {
  error.value = ''
  success.value = ''
  displayNameError.value = ''
  emailError.value = ''
  passwordError.value = ''
}

const validateForm = () => {
  let isValid = true
  resetForm()

  if (!isDisplayNameValid.value) {
    displayNameError.value = 'Display name must be at least 2 characters'
    isValid = false
  }

  if (!isEmailValid.value) {
    emailError.value = 'Please enter a valid email address'
    isValid = false
  }

  if (!isPasswordValid.value) {
    passwordError.value = 'Password must be at least 6 characters'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    isSubmitting.value = true
    error.value = ''
    success.value = ''

    await updateProfile({
      displayName: form.displayName,
      email: form.email,
      password: form.newPassword
    })

    success.value = 'Profile updated successfully'
    form.newPassword = ''
  } catch (err) {
    error.value = err.message
  } finally {
    isSubmitting.value = false
  }
}

const handleLogout = async () => {
  try {
    await logout()
    router.push('/login')
  } catch (err) {
    error.value = err.message
  }
}

/**
 * Lifecycle Hooks
 */
onMounted(() => {
  if (user.value) {
    form.displayName = user.value.displayName || ''
    form.email = user.value.email || ''
  }
})
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--main-bg);
}

.profile-content {
  padding: 2rem 4rem;
  margin: 0 auto;
  width: 1200px;
}

.profile-card {
  background-color: var(--header-bg);
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid var(--border-color);
}

.profile-card h2 {
  margin-bottom: 2rem;
  color: var(--text-primary);
  font-size: 1.5rem;
  text-align: center;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 400px;
  margin: 0 auto;
}

.form-group {
  position: relative;
  margin-bottom: 1.5rem;
}

.form-group .input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

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

.form-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
}

.field-icon {
  color: var(--accent-color);
  width: 16px;
  height: 16px;
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent-color);
  background-color: var(--hover-bg);
}

.form-group input:disabled {
  background-color: var(--disabled-bg);
  cursor: not-allowed;
  color: var(--text-secondary);
}

.form-group input::placeholder {
  color: var(--text-secondary);
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  width: 100%;
}

.button-group button {
  flex: 1;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.primary-button {
  background: var(--accent-color);
  color: white;
  border: none;
}

.primary-button:hover:not(:disabled) {
  background: #43a047;
  transform: translateY(-1px);
}

.secondary-button {
  background: transparent;
  color: var(--accent-color);
  border: 1px solid var(--accent-color);
}

.secondary-button:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.1);
}

.error-message,
.success-message {
  padding: 0.75rem;
  border-radius: 6px;
  text-align: center;
  font-size: 0.9rem;
}

.error-message {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.2);
}

.success-message {
  background-color: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.2);
}

.profile-icon {
  margin-right: 0.5rem;
  color: var(--accent-color);
}

.button-group button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

@media (min-width: 768px) {
  .profile-content {
    padding: 3rem;
  }

  .profile-card {
    padding: 3rem;
  }

  .profile-card h2 {
    font-size: 1.8rem;
  }
}

@media (min-width: 1024px) {
  .profile-content {
    padding: 3rem 4rem;
  }
}

@media (max-width: 768px) {
  .profile-content {
    padding: 1rem;
  }
}

/* Remove any development overlays */
:deep(.vue-dev-overlay),
:deep(.__vue-dev-overlay) {
  display: none !important;
}

.theme-toggle {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

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

.theme-button:hover {
  background-color: rgba(76, 175, 80, 0.1);
  border-color: var(--accent-color);
}

.theme-icon {
  font-size: 1.2rem;
  color: var(--accent-color);
}

.input-wrapper {
  position: relative;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.75rem;
  transition: all 0.2s ease;
  outline: none;
}

.toggle-password:hover,
.toggle-password:focus {
  color: var(--text-primary);
}
</style> 