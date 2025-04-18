<template>
  <div class="profile-container">
    <header class="header">
      <h1 @click="router.push('/')" class="clickable">Pattern Tracker</h1>
    </header>

    <div class="profile-content">
      <div class="profile-card">
        <h2>Profile Settings</h2>
        
        <div v-if="loading" class="loading">
          Loading...
        </div>
        
        <form v-else @submit.prevent="handleSubmit" class="profile-form">
          <div class="form-group">
            <label for="displayName">Display Name</label>
            <input
              id="displayName"
              v-model="form.displayName"
              type="text"
              :placeholder="user?.displayName || 'Enter display name'"
            >
          </div>
          
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              :value="user?.email"
              type="email"
              disabled
            >
          </div>
          
          <div class="form-group">
            <label for="newPassword">New Password (optional)</label>
            <input
              id="newPassword"
              v-model="form.newPassword"
              type="password"
              placeholder="Enter new password"
            >
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
              {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
            </button>
            
            <button 
              type="button" 
              class="secondary-button"
              @click="handleLogout"
              :disabled="isSubmitting"
            >
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuth } from '@/services/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const { user, loading, updateProfile, updatePassword, logout } = useAuth()

const form = reactive({
  displayName: '',
  newPassword: ''
})

const error = ref('')
const success = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  error.value = ''
  success.value = ''
  isSubmitting.value = true

  try {
    if (form.displayName) {
      await updateProfile({ displayName: form.displayName })
    }

    if (form.newPassword) {
      await updatePassword(form.newPassword)
    }

    success.value = 'Profile updated successfully'
    form.newPassword = '' // Clear password field after success
  } catch (err) {
    error.value = err.message
  } finally {
    isSubmitting.value = false
  }
}

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
.profile-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--main-bg);
}

.header {
  background-color: var(--header-bg);
  height: var(--header-height);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid var(--border-color);
}

.header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.5rem;
  background: linear-gradient(45deg, var(--accent-color), #81C784);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header h1.clickable {
  cursor: pointer;
  transition: all 0.2s;
}

.header h1.clickable:hover {
  transform: translateY(-1px);
  text-shadow: 0 2px 4px rgba(76, 175, 80, 0.2);
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
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.form-group label {
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
}

.form-group input {
  padding: 0.75rem;
  background-color: #2a2a2a;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 1rem;
  color: var(--text-primary);
  transition: all 0.2s;
  width: 100%;
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent-color);
  background-color: #333;
}

.form-group input:disabled {
  background-color: #222;
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

@media (min-width: 768px) {
  .header {
    padding: 1rem 4rem;
  }

  .header h1 {
    font-size: 1.8rem;
  }

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
  .header h1 {
    font-size: 2.2rem;
  }

  .profile-content {
    padding: 3rem 4rem;
  }
}

/* Remove any development overlays */
:deep(.vue-dev-overlay),
:deep(.__vue-dev-overlay) {
  display: none !important;
}
</style> 