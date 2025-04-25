import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuth } from '@/services/auth'
import { useUserSettings } from '@/services/userSettings'
import { auth } from '@/firebase'
import HomeView from '../views/HomeView.vue'
import LoginPage from '../components/LoginPage.vue'
import ProfilePage from '../components/ProfilePage.vue'
import GoogleAuthCallback from '../components/GoogleAuthCallback.vue'
import DevHomeView from '../components/dev/DevHomeView.vue'
import AboutView from '../views/AboutView.vue'

// Initialize user settings to check for experimental features
const { experimentalFeatures, initSettings } = useUserSettings()

// Initialize the routes
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/pattern/:id',
      name: 'pattern',
      component: HomeView,
      props: true,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { requiresGuest: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfilePage,
      meta: { requiresAuth: true }
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
      meta: { requiresAuth: false }
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: GoogleAuthCallback,
      meta: { requiresGuest: true }
    },
    // Experimental routes
    {
      path: '/dev',
      name: 'dev-home',
      component: DevHomeView,
      meta: { 
        requiresAuth: true,
        requiresExperimental: true 
      }
    },
    {
      path: '/dev/pattern/:id',
      name: 'dev-pattern',
      component: DevHomeView,
      props: true,
      meta: { 
        requiresAuth: true,
        requiresExperimental: true 
      }
    }
  ]
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  // Initialize settings if needed
  await initSettings()
  
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)
  const requiresExperimental = to.matched.some(record => record.meta.requiresExperimental)
  const currentUser = auth.currentUser

  // Check authentication requirements
  if (requiresAuth && !currentUser) {
    next('/login')
  } 
  // Check experimental feature requirements
  else if (requiresExperimental && !experimentalFeatures.value) {
    next('/')
  } 
  // Check guest-only routes
  else if (requiresGuest && currentUser) {
    next('/')
  } 
  // Allow navigation
  else {
    next()
  }
})

export default router 