import './assets/main.css'

import { createApp } from 'vue'
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
  faUserPlus
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
  faUserPlus
)

const app = createApp(App)

app.component('font-awesome-icon', FontAwesomeIcon)
app.use(router)
app.mount('#app')
