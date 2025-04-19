<template>
  <div class="login-page">
    <div class="login-header">
      <h1 class="app-title">Patternly</h1>
    </div>
    <div class="form-container">
      <form @submit.prevent="handleSubmit" class="auth-form">
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
          >
        </div>

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

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div class="button-group">
          <button 
            type="submit"
            class="primary-button"
            :disabled="submitting"
          >
            <font-awesome-icon :icon="isRegistering ? 'user-plus' : 'sign-in-alt'" />
            {{ submitButtonText }}
          </button>

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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/services/auth'

const router = useRouter()
const { login, register, resetPassword } = useAuth()

const email = ref('')
const password = ref('')
const displayName = ref('')
const error = ref('')
const submitting = ref(false)
const isRegistering = ref(false)

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

const toggleMode = () => {
  isRegistering.value = !isRegistering.value
  error.value = ''
}

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
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--main-bg);
  padding: 2rem;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 1200px;
}

.app-title {
  font-size: 2.5rem;
  font-weight: 600;
  background: linear-gradient(90deg, 
    #81C784 0%,
    var(--accent-color) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  transition: all 0.3s ease;
}

.app-title:hover {
  transform: translateY(-2px);
  text-shadow: 0 4px 8px rgba(76, 175, 80, 0.2);
}

.form-container {
  background-color: var(--header-bg);
  border-radius: 16px;
  padding: 3rem 4rem;
  width: 100%;
  min-width: 800px;
  max-width: 1200px;
  border: 1px solid var(--border-color);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 80%;
  max-width: 600px;
  margin: 0 auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.field-icon {
  color: var(--accent-color);
  width: 16px;
  height: 16px;
}

input {
  padding: 0.75rem;
  background-color: #2a2a2a;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 1rem;
  color: var(--text-primary);
  transition: all 0.2s;
}

input:focus {
  outline: none;
  border-color: var(--accent-color);
  background-color: #333;
}

input::placeholder {
  color: var(--text-secondary);
}

.error-message {
  color: #e74c3c;
  font-size: 0.9rem;
  text-align: center;
  background-color: rgba(231, 76, 60, 0.1);
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid rgba(231, 76, 60, 0.2);
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

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
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  width: 100%;
  position: relative;
}

.button-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  position: absolute;
  left: 1.5rem;
}

.button-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.25rem;
  flex: 1;
}

.button-text-small {
  font-size: 0.8rem;
  opacity: 0.9;
  width: 100%;
}

.button-text-large {
  font-size: 1.1rem;
  font-weight: 600;
  width: 100%;
}

.secondary-button:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.1);
  border-color: #81C784;
}

.text-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.9rem;
  padding: 0.5rem;
}

.text-button:hover:not(:disabled) {
  color: var(--text-primary);
}

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
</style> 