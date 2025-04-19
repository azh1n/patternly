<!--
  LoginPage.vue
  Authentication page component for user login and registration.
  
  Features:
  - User login and registration
  - Form validation
  - Password visibility toggle
  - Error handling
  - Loading states
  - Responsive design
  - Keyboard navigation
  - Password reset functionality
-->
<template>
  <div class="login-page">
    <!-- Header -->
    <header class="page-header">
      <h1>{{ isLoginMode ? 'Welcome Back' : 'Create Account' }}</h1>
      <p class="subtitle">
        {{ isLoginMode 
          ? 'Sign in to access your patterns' 
          : 'Join Patternly to start creating patterns' 
        }}
      </p>
    </header>

    <!-- Auth Form -->
    <form 
      @submit.prevent="handleSubmit" 
      class="auth-form"
      role="form"
      aria-label="Authentication form"
    >
      <!-- Email Input -->
      <div class="form-group">
        <label for="email">Email Address</label>
        <div class="input-wrapper">
          <font-awesome-icon icon="envelope" class="input-icon" aria-hidden="true" />
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="Enter your email"
            :class="{ 'error': emailError }"
            aria-invalid="emailError"
            aria-describedby="email-error"
            required
            autocomplete="email"
            @keydown.enter="handleSubmit"
            ref="emailInput"
          />
        </div>
        <span v-if="emailError" id="email-error" class="error-message">
          {{ emailError }}
        </span>
      </div>

      <!-- Password Input -->
      <div class="form-group">
        <label for="password">Password</label>
        <div class="input-wrapper">
          <font-awesome-icon icon="lock" class="input-icon" aria-hidden="true" />
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Enter your password"
            :class="{ 'error': passwordError }"
            aria-invalid="passwordError"
            aria-describedby="password-error"
            required
            autocomplete="current-password"
            @keydown.enter="handleSubmit"
          />
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

      <!-- Display Name Input (Registration Only) -->
      <div v-if="!isLoginMode" class="form-group">
        <label for="displayName">Display Name</label>
        <div class="input-wrapper">
          <font-awesome-icon icon="user" class="input-icon" aria-hidden="true" />
          <input
            id="displayName"
            v-model="displayName"
            type="text"
            placeholder="Choose a display name"
            :class="{ 'error': displayNameError }"
            aria-invalid="displayNameError"
            aria-describedby="display-name-error"
            required
            autocomplete="name"
            @keydown.enter="handleSubmit"
          />
        </div>
        <span v-if="displayNameError" id="display-name-error" class="error-message">
          {{ displayNameError }}
        </span>
      </div>

      <!-- Error Message -->
      <div 
        v-if="errorMessage" 
        class="error-message"
        role="alert"
        aria-live="polite"
      >
        {{ errorMessage }}
      </div>

      <!-- Submit Button -->
      <button 
        type="submit" 
        class="submit-button"
        :disabled="isLoading"
        @keydown.enter="handleSubmit"
      >
        <span v-if="isLoading">
          <span class="spinner" aria-hidden="true"></span>
          {{ isLoginMode ? 'Signing in...' : 'Creating account...' }}
        </span>
        <span v-else>
          {{ isLoginMode ? 'Sign In' : 'Create Account' }}
        </span>
      </button>

      <!-- Mode Toggle -->
      <button 
        type="button" 
        class="mode-toggle"
        @click="toggleMode"
        @keydown.enter="toggleMode"
      >
        {{ isLoginMode 
          ? 'Need an account? Create one' 
          : 'Already have an account? Sign in' 
        }}
      </button>

      <!-- Password Reset -->
      <router-link 
        v-if="isLoginMode"
        to="/reset-password" 
        class="reset-link"
        @keydown.enter="handleResetClick"
      >
        Forgot your password?
      </router-link>
    </form>
  </div>
</template>

<script setup>
/**
 * Imports
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

/**
 * Router Setup
 */
const router = useRouter()

/**
 * Auth Setup
 */
const { login, register, error: authError } = useAuth()

/**
 * State
 */
const email = ref('')
const password = ref('')
const displayName = ref('')
const isLoginMode = ref(true)
const isLoading = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')
const emailError = ref('')
const passwordError = ref('')
const displayNameError = ref('')

/**
 * Refs
 */
const emailInput = ref(null)

/**
 * Computed Properties
 */

/**
 * Validates email format
 * @returns {boolean} Whether email is valid
 */
const isEmailValid = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

/**
 * Validates password strength
 * @returns {boolean} Whether password is valid
 */
const isPasswordValid = computed(() => {
  return password.value.length >= 6
})

/**
 * Validates display name
 * @returns {boolean} Whether display name is valid
 */
const isDisplayNameValid = computed(() => {
  return displayName.value.trim().length >= 2
})

/**
 * Methods
 */

/**
 * Toggles password visibility
 */
const togglePassword = () => {
  showPassword.value = !showPassword.value
}

/**
 * Toggles between login and registration modes
 */
const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  resetForm()
}

/**
 * Resets form state
 */
const resetForm = () => {
  errorMessage.value = ''
  emailError.value = ''
  passwordError.value = ''
  displayNameError.value = ''
}

/**
 * Validates form inputs
 * @returns {boolean} Whether form is valid
 */
const validateForm = () => {
  let isValid = true
  resetForm()

  if (!isEmailValid.value) {
    emailError.value = 'Please enter a valid email address'
    isValid = false
  }

  if (!isPasswordValid.value) {
    passwordError.value = 'Password must be at least 6 characters'
    isValid = false
  }

  if (!isLoginMode.value && !isDisplayNameValid.value) {
    displayNameError.value = 'Display name must be at least 2 characters'
    isValid = false
  }

  return isValid
}

/**
 * Handles form submission
 */
const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    isLoading.value = true
    errorMessage.value = ''

    if (isLoginMode.value) {
      await login(email.value, password.value)
    } else {
      await register(email.value, password.value, displayName.value)
    }

    router.push('/')
  } catch (error) {
    errorMessage.value = authError.value || 'An error occurred. Please try again.'
  } finally {
    isLoading.value = false
  }
}

/**
 * Handles password reset click
 */
const handleResetClick = (event) => {
  event.preventDefault()
  router.push('/reset-password')
}

/**
 * Lifecycle Hooks
 */
onMounted(() => {
  emailInput.value?.focus()
})
</script>

<style scoped>
/* ===== Page Layout ===== */
.login-page {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: var(--spacing-xl);
}

/* ===== Header Styles ===== */
.page-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.page-header h1 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
  font-size: 2rem;
}

.subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

/* ===== Form Styles ===== */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.form-group label {
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 1rem;
}

input {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) var(--spacing-xl);
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius-lg);
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.3s ease;
  outline: none;
}

input:focus {
  border-color: var(--accent-color);
  background-color: var(--hover-bg);
}

input.error {
  border-color: var(--error-color);
}

.error-message {
  color: var(--error-color);
  font-size: 0.9rem;
  margin-top: var(--spacing-xs);
}

/* ===== Password Toggle ===== */
.toggle-password {
  position: absolute;
  right: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: var(--spacing-sm);
  transition: all 0.2s ease;
  outline: none;
}

.toggle-password:hover,
.toggle-password:focus {
  color: var(--text-primary);
}

/* ===== Submit Button ===== */
.submit-button {
  width: 100%;
  padding: var(--spacing-md);
  background-color: var(--accent-color);
  border: none;
  border-radius: var(--border-radius-lg);
  color: white;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.submit-button:hover:not(:disabled),
.submit-button:focus:not(:disabled) {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Mode Toggle ===== */
.mode-toggle {
  background: transparent;
  border: none;
  color: var(--accent-color);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  text-align: center;
}

.mode-toggle:hover,
.mode-toggle:focus {
  text-decoration: underline;
}

/* ===== Reset Link ===== */
.reset-link {
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-decoration: none;
  text-align: center;
  transition: all 0.2s ease;
  outline: none;
}

.reset-link:hover,
.reset-link:focus {
  color: var(--accent-color);
  text-decoration: underline;
}

/* ===== Responsive Styles ===== */
@media (max-width: 480px) {
  .login-page {
    padding: var(--spacing-lg);
  }

  .page-header h1 {
    font-size: 1.8rem;
  }

  .subtitle {
    font-size: 0.9rem;
  }
}
</style> 