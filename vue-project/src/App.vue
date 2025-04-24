<template>
  <router-view></router-view>
  <AdBanner />
</template>

<style>
:root {
  --header-height: 60px;
  --max-content-width: 1200px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html {
  height: 100%;
  width: 100%;
  overflow-x: hidden;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--main-bg);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
  padding: 0;
  min-height: 100%;
  width: 100%;
  position: relative;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

/* Always keep login page light */
body.login-page {
  background-color: white !important;
}

body.login-page #app {
  background-color: white !important;
}

/* Regular theme handling for other pages */
body:not(.login-page) {
  background-color: var(--main-bg);
}

body:not(.login-page) #app {
  background-color: var(--main-bg);
}
</style>

<script setup>
import { onMounted } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'vue-router'
import { auth } from './firebase'
import { useTheme } from './services/theme'
import { useUserSettings } from './services/userSettings'
import AdBanner from './components/AdBanner.vue'

const router = useRouter()
const { initTheme } = useTheme()
const { initSettings } = useUserSettings()

// Initialize app settings
onMounted(async () => {
  await initTheme()
  await initSettings()
})

// Handle auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    const redirectPath = localStorage.getItem('redirectAfterAuth')
    if (redirectPath) {
      localStorage.removeItem('redirectAfterAuth')
      router.push(redirectPath)
    } else {
      router.push('/')
    }
  } else {
    // User is signed out
    if (router.currentRoute.value.meta.requiresAuth) {
      router.push('/login')
    }
  }
})
</script>
