<template>
  <div class="login-page">
    <div class="form-container">
      <h1>{{ isRegistering ? 'Create Account' : 'Login' }}</h1>
      
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email"
            v-model="email"
            required
            placeholder="Enter your email"
          >
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password"
            id="password" 
            v-model="password"
            required
            placeholder="Enter your password"
          >
        </div>

        <div v-if="isRegistering" class="form-group">
          <label for="displayName">Display Name</label>
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
            {{ submitButtonText }}
          </button>

          <button 
            type="button"
            class="secondary-button"
            @click="toggleMode"
            :disabled="submitting"
          >
            {{ toggleButtonText }}
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
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--main-bg);
}

.form-container {
  background-color: var(--header-bg);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  width: 100%;
  max-width: var(--max-content-width);
  margin: 0 auto;
}

h1 {
  margin-bottom: 2rem;
  text-align: center;
  color: var(--text-primary);
  font-size: 1.8rem;
  background: linear-gradient(45deg, var(--accent-color), #81C784);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 500px;
  margin: 0 auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 500;
  color: var(--text-primary);
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

button {
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
  .login-page {
    padding: 4rem;
  }

  .form-container {
    padding: 3rem;
  }

  h1 {
    font-size: 2rem;
  }

  .button-group {
    flex-direction: row;
  }

  .button-group button {
    flex: 1;
  }
}
</style> 