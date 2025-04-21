import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuth } from '@/services/auth'
import { auth } from '@/firebase'
import HomeView from '../views/HomeView.vue'
import LoginPage from '../components/LoginPage.vue'
import ProfilePage from '../components/ProfilePage.vue'
import GoogleAuthCallback from '../components/GoogleAuthCallback.vue'

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
      path: '/auth/callback',
      name: 'auth-callback',
      component: GoogleAuthCallback,
      meta: { requiresGuest: true }
    }
  ]
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const currentUser = auth.currentUser

  if (requiresAuth && !currentUser) {
    next('/login')
  } else {
    next()
  }
})

export default router 