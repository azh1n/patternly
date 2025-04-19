<template>
  <div class="auth-callback">
    <div class="loading-spinner">
      <font-awesome-icon icon="spinner" spin />
      <p>{{ statusMessage }}</p>
      <p v-if="error" class="error-message">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, getRedirectResult, onAuthStateChanged } from 'firebase/auth'

const router = useRouter()
const statusMessage = ref('Completing sign in...')
const error = ref('')

onMounted(async () => {
  try {
    console.log('Starting auth callback handling...')
    const auth = getAuth()
    
    // Wait for auth state to be initialized
    await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed:', user)
        unsubscribe()
        resolve()
      })
    })

    // Get the redirect result
    const result = await getRedirectResult(auth)
    console.log('Redirect result:', result)
    
    // Get the stored redirect path or default to home
    const redirectPath = localStorage.getItem('redirectAfterAuth') || '/'
    localStorage.removeItem('redirectAfterAuth') // Clean up
    
    if (result || auth.currentUser) {
      console.log('User authenticated, redirecting to:', redirectPath)
      router.push(redirectPath)
    } else {
      console.log('No user found, redirecting to login')
      router.push('/login')
    }
  } catch (error) {
    console.error('Error during redirect:', error)
    error.value = error.message
    router.push('/login')
  }
})
</script>

<style scoped>
.auth-callback {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
}

.loading-spinner {
  text-align: center;
  padding: 2rem;
}

.loading-spinner svg {
  font-size: 2rem;
  color: #4CAF50;
  margin-bottom: 1rem;
}

.loading-spinner p {
  color: #666;
  font-size: 1.1rem;
  margin: 0.5rem 0;
}

.error-message {
  color: #e74c3c;
  font-size: 0.9rem;
  margin-top: 1rem;
}
</style> 