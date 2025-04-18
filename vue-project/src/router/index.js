import { createRouter, createWebHistory } from 'vue-router'
import App from '../App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: App
    },
    {
      path: '/pattern/:id',
      name: 'pattern',
      component: App,
      props: true
    }
  ]
})

export default router 