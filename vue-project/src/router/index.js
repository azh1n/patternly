import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuth } from '@/services/auth'
import HomeView from '../views/HomeView.vue'
import LoginPage from '../components/LoginPage.vue'
import ProfilePage from '../components/ProfilePage.vue'

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
    }
  ]
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const { user, loading } = useAuth()
  
  // Wait for auth to initialize
  if (loading.value) {
    // You might want to show a loading screen here
    await new Promise(resolve => {
      const unwatch = watch(loading, (newValue) => {
        if (!newValue) {
          unwatch()
          resolve()
        }
      })
    })
  }

  if (to.meta.requiresAuth && !user.value) {
    // Redirect to login if trying to access a protected route while not authenticated
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.meta.requiresGuest && user.value) {
    // Redirect to home if trying to access guest routes while authenticated
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router 