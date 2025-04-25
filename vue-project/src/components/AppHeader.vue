<!-- Application header component with navigation and branding -->
<template>
  <!-- Main header container with fixed height and styling -->
  <header class="header">
    <!-- Content wrapper for consistent width and padding -->
    <div class="header-content">
      <!-- Left section with equal width as right section -->
      <div class="side-section left-section"></div>
      <!-- App title with click navigation to home - absolutely positioned -->
      <h1 
        @click="navigateHome"
        class="app-title clickable"
      >
        Patternly
      </h1>
      <!-- Right section with conditional navigation -->
      <div class="side-section right-section">
        <nav v-if="showNav">
          <router-link to="/about" class="nav-link">About</router-link>
          <router-link to="/privacy-policy" class="nav-link">Privacy</router-link>
          <router-link to="/profile" class="profile-link">Profile</router-link>
          <button 
            class="dev-link"
            :class="{ 'active': experimentalFeatures }"
            @click="toggleExperimentalFeatures"
            :title="experimentalFeatures ? 'Experimental Features: ON' : 'Experimental Features: OFF'"
          >
            <font-awesome-icon icon="flask" />
            <span class="status-indicator" :class="{ 'on': experimentalFeatures }"></span>
          </button>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserSettings } from '@/services/userSettings'

// Component props
const props = defineProps({
  showNav: {
    type: Boolean,
    default: false  // Controls visibility of navigation elements
  },
  isDevMode: {
    type: Boolean,
    default: false  // Indicates if the app is in dev mode
  }
})

// Router instance for programmatic navigation
const router = useRouter()

// Get experimental features state and toggle function
const { experimentalFeatures, toggleExperimentalFeatures } = useUserSettings()

// Navigate to home page
const navigateHome = () => {
  router.push('/')
}
</script>

<style scoped>
/* Main header container styles */
.header {
  background-color: var(--header-bg);
  min-height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid var(--border-color);
  position: relative;
  width: 100%;
  padding: 0.5rem 0;
}

/* Header content wrapper styles */
.header-content {
  width: 100%;
  padding: 0 0.75rem;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative; /* For absolute positioning of title */
}

/* Side sections with equal widths */
.side-section {
  flex-shrink: 0;
  min-width: 80px; /* Ensure both sides have equal width */
}

/* Left section specific styles */
.left-section {
  display: flex;
  justify-content: flex-start;
}

/* Right section styles with navigation */
.right-section {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

/* App title styles - centered absolutely */
.app-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-color);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
}

/* Navigation styles */
nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Regular nav link styles */
.nav-link {
  color: var(--text-primary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: var(--accent-color);
}

/* Profile link styles */
.profile-link {
  color: var(--text-primary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.profile-link:hover {
  color: var(--accent-color);
}

/* Dev link for experimental features */
.dev-link {
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--accent-color);
  color: white;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  position: relative;
}

.dev-link.active {
  background-color: #2ecc71; /* Green color for active state */
  box-shadow: 0 0 8px #2ecc71; /* Glow effect when active */
}

/* Status indicator dot */
.status-indicator {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #e74c3c; /* Red for OFF state */
  border: 2px solid var(--header-bg);
  transition: all 0.2s ease;
}

.status-indicator.on {
  background-color: #2ecc71; /* Green for ON state */
}

.dev-link:hover {
  transform: scale(1.1);
  background-color: var(--accent-hover);
}

/* Generic clickable element styles */
.clickable {
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

/* Desktop styles for larger screens */
@media (min-width: 768px) {
  .header-content {
    max-width: 1200px;
    padding: 0 2rem;
  }
  
  .side-section {
    min-width: 100px;
  }
  
  .app-title {
    font-size: 1.8rem;
  }
}
</style> 