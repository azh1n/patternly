<template>
  <div class="side-navigation" :class="{ 'expanded': isExpanded }">
    <!-- Backdrop for mobile - closes navigation when clicking outside -->
    <div 
      v-if="isExpanded" 
      class="nav-backdrop" 
      @click="toggleNavigation"
    ></div>
    
    <!-- Navigation sidebar -->
    <aside class="nav-sidebar" :class="{ 'expanded': isExpanded }">
      <!-- Logo and collapse button section -->
      <div class="sidebar-header">
        <h1 class="app-logo" @click="navigateToHome">Patternly</h1>
        <button class="collapse-btn" @click="toggleNavigation">
          <font-awesome-icon :icon="isExpanded ? 'chevron-left' : 'chevron-right'" />
        </button>
      </div>
      
      <!-- Navigation links -->
      <nav class="nav-links">
        <router-link to="/" class="nav-item" exact-active-class="active">
          <font-awesome-icon icon="home" class="nav-icon" />
          <span class="nav-label" v-if="isExpanded">Dashboard</span>
        </router-link>
        
        <router-link to="/patterns" class="nav-item" active-class="active">
          <font-awesome-icon icon="folder" class="nav-icon" />
          <span class="nav-label" v-if="isExpanded">Saved Patterns</span>
        </router-link>
        
        <router-link to="/builder" class="nav-item" active-class="active">
          <font-awesome-icon icon="pencil-ruler" class="nav-icon" />
          <span class="nav-label" v-if="isExpanded">Pattern Builder</span>
        </router-link>
        
        <router-link to="/marketplace" class="nav-item" active-class="active">
          <font-awesome-icon icon="store" class="nav-icon" />
          <span class="nav-label" v-if="isExpanded">Marketplace</span>
        </router-link>
        
        <router-link v-if="experimentalFeatures" to="/tools" class="nav-item" active-class="active">
          <font-awesome-icon icon="tools" class="nav-icon" />
          <span class="nav-label" v-if="isExpanded">Tools</span>
        </router-link>
      </nav>
      
      <!-- Bottom section for user-related items -->
      <div class="sidebar-footer">
        <div class="nav-divider" v-if="isExpanded"></div>
        
        <router-link to="/profile" class="nav-item" active-class="active">
          <font-awesome-icon icon="user" class="nav-icon" />
          <span class="nav-label" v-if="isExpanded">Profile</span>
        </router-link>
        
        <router-link to="/about" class="nav-item" active-class="active">
          <font-awesome-icon icon="info-circle" class="nav-icon" />
          <span class="nav-label" v-if="isExpanded">About</span>
        </router-link>
        
        <div class="experimental-toggle" v-if="isExpanded">
          <label class="toggle-label">
            <span>Experimental Features</span>
            <div class="toggle-switch" @click="toggleExperimentalFeatures">
              <div class="toggle-slider" :class="{ 'active': experimentalFeatures }"></div>
            </div>
          </label>
        </div>
        
        <button v-else class="experimental-btn" @click="toggleExperimentalFeatures">
          <font-awesome-icon icon="flask" class="nav-icon" :class="{ 'active-feature': experimentalFeatures }" />
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserSettings } from '@/services/userSettings'

const props = defineProps({
  defaultExpanded: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:expanded'])

const router = useRouter()
const { experimentalFeatures, toggleExperimentalFeatures } = useUserSettings()
const isExpanded = ref(props.defaultExpanded)

// Set initial expanded state based on screen size
onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})

// Check screen size and adjust navigation accordingly
const checkScreenSize = () => {
  if (window.innerWidth < 768) {
    isExpanded.value = false
  } else {
    isExpanded.value = props.defaultExpanded
  }
  emit('update:expanded', isExpanded.value)
}

// Watch for route changes to close sidebar on mobile
watch(router.currentRoute, () => {
  if (window.innerWidth < 768) {
    isExpanded.value = false
    emit('update:expanded', isExpanded.value)
  }
})

// Toggle sidebar expanded state
const toggleNavigation = () => {
  isExpanded.value = !isExpanded.value
  emit('update:expanded', isExpanded.value)
}

// Navigate home
const navigateToHome = () => {
  router.push('/')
  if (window.innerWidth < 768) {
    isExpanded.value = false
    emit('update:expanded', isExpanded.value)
  }
}
</script>

<style scoped>
/* Navigation backdrop - covers screen on mobile */
.nav-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: none;
}

/* Sidebar container */
.nav-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  background-color: var(--header-bg);
  border-right: 1px solid var(--border-color);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  width: 60px;
  overflow-x: hidden;
  overflow-y: auto;
}

.nav-sidebar.expanded {
  width: 220px;
}

/* Sidebar header with logo and collapse button */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  min-height: 60px;
  border-bottom: 1px solid var(--border-color);
}

.app-logo {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--accent-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.collapse-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.collapse-btn:hover {
  color: var(--accent-color);
}

/* Navigation links section */
.nav-links {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: var(--text-primary);
  text-decoration: none;
  transition: background-color 0.2s, color 0.2s;
  white-space: nowrap;
}

.nav-item:hover {
  background-color: var(--hover-bg);
  color: var(--accent-color);
}

.nav-item.active {
  background-color: var(--active-bg);
  color: var(--accent-color);
  border-left: 3px solid var(--accent-color);
}

.nav-icon {
  width: 20px;
  text-align: center;
  margin-right: 12px;
  font-size: 1rem;
}

.active-feature {
  color: #2ecc71;
}

.nav-label {
  font-size: 0.9rem;
  font-weight: 500;
}

/* Sidebar footer */
.sidebar-footer {
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border-color);
}

.nav-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 0.5rem 1rem;
}

/* Experimental features toggle */
.experimental-toggle {
  padding: 0.75rem 1rem;
  margin-top: 0.5rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  cursor: pointer;
}

.toggle-switch {
  position: relative;
  width: 34px;
  height: 18px;
  background-color: #ccc;
  border-radius: 10px;
  transition: background-color 0.2s;
  cursor: pointer;
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-slider.active {
  transform: translateX(16px);
  background-color: white;
}

.toggle-switch .toggle-slider.active {
  background-color: white;
}

.toggle-switch:has(.toggle-slider.active) {
  background-color: #2ecc71;
}

.experimental-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.75rem 1rem;
  text-align: center;
  color: var(--text-primary);
}

/* Mobile adjustments */
@media (max-width: 767px) {
  .nav-backdrop {
    display: block;
  }
  
  .nav-sidebar {
    transform: translateX(-100%);
    width: 260px;
  }
  
  .nav-sidebar.expanded {
    transform: translateX(0);
    width: 260px;
  }
}
</style> 