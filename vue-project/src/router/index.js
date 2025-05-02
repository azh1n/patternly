import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuth } from '@/services/auth'
import { useUserSettings } from '@/services/userSettings'
import { auth } from '@/firebase'
import DashboardView from '../views/DashboardView.vue'
import PatternListView from '../views/PatternListView.vue'
import PatternView from '../views/PatternView.vue'
import PatternBuilderView from '../views/PatternBuilderView.vue'
import MarketplaceView from '../views/MarketplaceView.vue'
import ToolsView from '../views/ToolsView.vue'
import LoginPage from '../components/LoginPage.vue'
import ProfilePage from '../components/ProfilePage.vue'
import GoogleAuthCallback from '../components/GoogleAuthCallback.vue'
import AboutView from '../views/AboutView.vue'
import PrivacyPolicyView from '../views/PrivacyPolicyView.vue'
import TermsOfServiceView from '../views/TermsOfServiceView.vue'
import CopyrightPolicyView from '../views/CopyrightPolicyView.vue'
import RefundPolicyView from '../views/RefundPolicyView.vue'

// Initialize user settings to check for experimental features
const { experimentalFeatures, initSettings } = useUserSettings()

// Initialize the routes
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/patterns',
      name: 'patterns',
      component: PatternListView,
      meta: { requiresAuth: true }
    },
    {
      path: '/pattern/:id',
      name: 'pattern',
      component: PatternView,
      props: true,
      meta: { requiresAuth: true }
    },
    {
      path: '/builder',
      name: 'builder',
      component: PatternBuilderView,
      meta: { requiresAuth: true }
    },
    {
      path: '/marketplace',
      name: 'marketplace',
      component: MarketplaceView,
      meta: { requiresAuth: true, requiresExperimental: false }
    },
    {
      path: '/tools',
      name: 'tools',
      component: ToolsView,
      meta: { requiresAuth: true, requiresExperimental: true }
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
      path: '/privacy-policy',
      name: 'privacy-policy',
      component: PrivacyPolicyView,
      meta: { requiresAuth: false }
    },
    {
      path: '/terms-of-service',
      name: 'terms-of-service',
      component: TermsOfServiceView, 
      meta: { requiresAuth: false }
    },
    {
      path: '/copyright-policy',
      name: 'copyright-policy',
      component: CopyrightPolicyView,
      meta: { requiresAuth: false }
    },
    // Refund Policy route temporarily hidden until marketplace is ready
    // {
    //   path: '/refund-policy',
    //   name: 'refund-policy',
    //   component: RefundPolicyView,
    //   meta: { requiresAuth: false }
    // },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: GoogleAuthCallback,
      meta: { requiresGuest: true }
    },
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