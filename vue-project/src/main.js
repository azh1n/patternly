import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { 
  faSearch, 
  faPlus, 
  faClipboard,
  faChevronLeft,
  faChevronRight,
  faTrash,
  faCheckCircle,
  faCircle,
  faArrowLeft,
  faArrowRight,
  faUser,
  faSave,
  faSignOutAlt,
  faUserCircle,
  faEnvelope,
  faLock,
  faSignInAlt,
  faUserPlus,
  faSun,
  faMoon,
  faFlask,
  faToggleOn,
  faToggleOff,
  faMagic,
  faHistory,
  faChartLine,
  faCode
} from '@fortawesome/free-solid-svg-icons'

// Add icons to the library
library.add(
  faSearch, 
  faPlus, 
  faClipboard, 
  faChevronLeft, 
  faChevronRight,
  faTrash,
  faCheckCircle,
  faCircle,
  faArrowLeft,
  faArrowRight,
  faUser,
  faSave,
  faSignOutAlt,
  faUserCircle,
  faEnvelope,
  faLock,
  faSignInAlt,
  faUserPlus,
  faSun,
  faMoon,
  faFlask,
  faToggleOn,
  faToggleOff,
  faMagic,
  faHistory,
  faChartLine,
  faCode
)

const app = createApp(App)
const pinia = createPinia()

app.component('font-awesome-icon', FontAwesomeIcon)
app.use(router)
app.use(pinia)
app.mount('#app')
