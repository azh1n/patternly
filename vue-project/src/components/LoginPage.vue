<!-- Authentication page component handling login and registration -->
<template>
  <!-- Main container for the login/registration page -->
  <div class="login-page">
    <!-- Header section with app title -->
    <div class="login-header">
      <h1 class="app-title">Patternly</h1>
    </div>
    <!-- Form container with authentication form -->
    <div class="form-container">
      <form @submit.prevent="handleSubmit" class="auth-form">
        <!-- Email input group -->
        <div class="form-group">
          <label for="email">
            <font-awesome-icon icon="envelope" class="field-icon" />
            Email
          </label>
          <input 
            type="email" 
            id="email"
            v-model="email"
            required
            placeholder="Enter your email"
          >
        </div>

        <!-- Password input group -->
        <div class="form-group">
          <label for="password">
            <font-awesome-icon icon="lock" class="field-icon" />
            Password
          </label>
          <input 
            type="password"
            id="password" 
            v-model="password"
            required
            placeholder="Enter your password"
            @input="validatePassword"
          >
          <!-- Password requirements display -->
          <div v-if="isRegistering" class="password-requirements">
            <div :class="{ 'requirement-met': password.length >= 8 }">
              <font-awesome-icon :icon="password.length >= 8 ? 'check-circle' : 'circle'" />
              At least 8 characters
            </div>
            <div :class="{ 'requirement-met': hasUppercase }">
              <font-awesome-icon :icon="hasUppercase ? 'check-circle' : 'circle'" />
              One uppercase letter
            </div>
            <div :class="{ 'requirement-met': hasNumber }">
              <font-awesome-icon :icon="hasNumber ? 'check-circle' : 'circle'" />
              One number
            </div>
            <div :class="{ 'requirement-met': hasSpecialChar }">
              <font-awesome-icon :icon="hasSpecialChar ? 'check-circle' : 'circle'" />
              One special character
            </div>
          </div>
        </div>

        <!-- Display name input group (shown only during registration) -->
        <div v-if="isRegistering" class="form-group">
          <label for="displayName">
            <font-awesome-icon icon="user-circle" class="field-icon" />
            Display Name
          </label>
          <input 
            type="text"
            id="displayName"
            v-model="displayName"
            required
            placeholder="Choose a display name"
          >
        </div>

        <!-- Error message display -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <!-- Action buttons group -->
        <div class="button-group">
          <!-- Primary action button (Login/Register) -->
          <button 
            type="submit"
            class="primary-button"
            :disabled="submitting || (isRegistering && !isPasswordValid)"
          >
            <font-awesome-icon :icon="isRegistering ? 'user-plus' : 'sign-in-alt'" />
            {{ submitButtonText }}
          </button>

          <!-- Toggle mode button (Switch between Login/Register) -->
          <button 
            type="button"
            class="secondary-button"
            @click="toggleMode"
            :disabled="submitting"
          >
            <font-awesome-icon :icon="isRegistering ? 'sign-in-alt' : 'user-plus'" class="button-icon" />
            <div class="button-text">
              <div class="button-text-small">{{ isRegistering ? 'Already have an account?' : 'Need an account?' }}</div>
              <div class="button-text-large">{{ isRegistering ? 'Login' : 'Register' }}</div>
            </div>
          </button>
        </div>

        <!-- Password reset button (shown only in login mode) -->
        <button 
          v-if="!isRegistering"
          type="button"
          class="text-button"
          @click="handleResetPassword"
          :disabled="submitting"
        >
          Forgot password?
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/services/auth'

// Router and authentication service initialization
const router = useRouter()
const { login, register, resetPassword } = useAuth()

// Form state management
const email = ref('')
const password = ref('')
const displayName = ref('')
const error = ref('')
const submitting = ref(false)
const isRegistering = ref(false)

// Password validation state
const hasUppercase = ref(false)
const hasNumber = ref(false)
const hasSpecialChar = ref(false)

// Computed properties for dynamic button text
const submitButtonText = computed(() => {
  if (submitting.value) {
    return isRegistering.value ? 'Creating Account...' : 'Logging in...'
  }
  return isRegistering.value ? 'Create Account' : 'Login'
})

const toggleButtonText = computed(() => {
  return isRegistering.value 
    ? 'Already have an account? Login' 
    : 'Need an account? Register'
})

// Computed property for password validation
const isPasswordValid = computed(() => {
  return password.value.length >= 8 && 
         hasUppercase.value && 
         hasNumber.value && 
         hasSpecialChar.value
})

// Toggle between login and registration modes
const toggleMode = () => {
  isRegistering.value = !isRegistering.value
  error.value = ''
}

// Password validation function
const validatePassword = () => {
  const pass = password.value
  hasUppercase.value = /[A-Z]/.test(pass)
  hasNumber.value = /[0-9]/.test(pass)
  hasSpecialChar.value = /[!@#$%^&*(),.?":{}|<>]/.test(pass)
}

// Handle form submission for both login and registration
const handleSubmit = async () => {
  error.value = ''
  submitting.value = true

  try {
    if (isRegistering.value) {
      await register({
        email: email.value,
        password: password.value,
        displayName: displayName.value
      })
    } else {
      await login({
        email: email.value,
        password: password.value
      })
    }
    router.push('/')
  } catch (err) {
    error.value = err.message
  } finally {
    submitting.value = false
  }
}

// Handle password reset request
const handleResetPassword = async () => {
  if (!email.value) {
    error.value = 'Please enter your email address'
    return
  }

  error.value = ''
  submitting.value = true

  try {
    await resetPassword(email.value)
    error.value = 'Password reset email sent. Please check your inbox.'
  } catch (err) {
    error.value = err.message
  } finally {
    submitting.value = false
  }
}

// Lifecycle hooks for managing body class
onMounted(() => {
  document.body.classList.add('login-page')
})

onUnmounted(() => {
  document.body.classList.remove('login-page')
})
</script>

<style scoped>
/* Main container styles */
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: white;
  padding: 2rem;
}

/* Header and title styles */
.login-header {
  text-align: center;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 1200px;
}

/* App title with gradient effect */
.app-title {
  font-size: 2.5rem;
  font-weight: 600;
  background: linear-gradient(90deg, 
    #81C784 0%,
    #2E7D32 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  transition: all 0.3s ease;
}

/* Title hover animation */
.app-title:hover {
  transform: translateY(-2px);
  text-shadow: 0 4px 8px rgba(76, 175, 80, 0.2);
}

/* Form container styles */
.form-container {
  background-color: white;
  border-radius: 16px;
  padding: 3rem 4rem;
  width: 100%;
  min-width: 800px;
  max-width: 1200px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
}

/* Authentication form layout */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 80%;
  max-width: 600px;
  margin: 0 auto;
}

/* Form group styles */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Form label styles */
.form-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #333;
}

/* Icon styles in form fields */
.field-icon {
  color: #4CAF50;
  width: 16px;
  height: 16px;
}

/* Input field styles */
input {
  padding: 0.75rem;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
  color: #333;
  transition: all 0.2s;
}

/* Input focus states */
input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}

/* Input placeholder styles */
input::placeholder {
  color: #9e9e9e;
}

/* Error message styles */
.error-message {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  padding: 0.75rem;
  border-radius: 6px;
  text-align: center;
  font-size: 0.9rem;
  border: 1px solid rgba(231, 76, 60, 0.2);
}

/* Button group layout */
.button-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Common button styles */
.button-group button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

/* Disabled button states */
button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Primary button styles */
.primary-button {
  background: #4CAF50;
  color: white;
  border: none;
}

/* Primary button hover effects */
.primary-button:hover:not(:disabled) {
  background: #43a047;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.2);
}

/* Secondary button styles */
.secondary-button {
  background: transparent;
  color: #4CAF50;
  border: 1px solid #4CAF50;
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  width: 100%;
  position: relative;
}

/* Button icon positioning */
.button-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  position: absolute;
  left: 1.5rem;
}

/* Button text container */
.button-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.25rem;
  flex: 1;
}

/* Small button text styles */
.button-text-small {
  font-size: 0.8rem;
  opacity: 0.9;
  width: 100%;
}

/* Large button text styles */
.button-text-large {
  font-size: 1.1rem;
  font-weight: 600;
  width: 100%;
}

/* Secondary button hover effects */
.secondary-button:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.05);
  border-color: #43a047;
}

/* Text button styles */
.text-button {
  background: none;
  border: none;
  color: #666;
  font-size: 0.9rem;
  padding: 0.5rem;
}

/* Text button hover effects */
.text-button:hover:not(:disabled) {
  color: #333;
}

/* Tablet responsive styles */
@media (min-width: 768px) {
  .form-container {
    padding: 3rem;
    width: 85%;
    max-width: 1000px;
  }

  .button-group {
    flex-direction: row;
  }

  .button-group button {
    flex: 1;
  }

  .app-title {
    font-size: 3rem;
  }
}

/* Desktop responsive styles */
@media (min-width: 1024px) {
  .form-container {
    padding: 4rem;
    width: 80%;
    max-width: 1200px;
  }

  .app-title {
    font-size: 3.5rem;
  }
}

/* Mobile responsive styles */
@media (max-width: 840px) {
  .login-page {
    padding: 1rem;
  }

  .form-container {
    min-width: auto;
    width: 100%;
    padding: 1.5rem;
    border-radius: 12px;
  }

  .auth-form {
    width: 100%;
  }

  .app-title {
    font-size: 2rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  input {
    font-size: 16px; /* Prevent iOS zoom on input focus */
    padding: 0.875rem;
  }

  .button-group {
    flex-direction: column;
    gap: 0.75rem;
  }

  .button-group button {
    width: 100%;
    padding: 0.875rem;
  }

  .secondary-button {
    padding: 0.875rem;
  }

  .button-icon {
    position: static;
    margin-right: 0.5rem;
  }

  .button-text {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }

  .button-text-small {
    font-size: 0.875rem;
  }

  .button-text-large {
    font-size: 0.875rem;
    font-weight: 600;
  }
}

/* Additional small screen adjustments */
@media (max-width: 380px) {
  .login-page {
    padding: 0.75rem;
  }

  .form-container {
    padding: 1rem;
  }

  .app-title {
    font-size: 1.75rem;
  }

  input {
    padding: 0.75rem;
  }
}

.password-requirements {
  margin-top: 8px;
  font-size: 0.8rem;
  color: #666;
}

.password-requirements div {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}

.requirement-met {
  color: #4CAF50;
}
</style> 