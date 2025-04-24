<!-- Application header component with navigation and branding -->
<template>
  <!-- Main header container with fixed height and styling -->
  <header class="header">
    <!-- Content wrapper for consistent width and padding -->
    <div class="header-content">
      <!-- Left section placeholder for layout balance -->
      <div class="left-section"></div>
      <!-- App title with click navigation to home -->
      <h1 
        @click="navigateHome"
        class="clickable"
      >
        Patternly
      </h1>
      <!-- Right section with conditional navigation -->
      <div class="right-section">
        <nav v-if="showNav">
          <router-link to="/profile" class="profile-link">Profile</router-link>
          <router-link 
            v-if="experimentalFeatures" 
            to="/dev" 
            class="dev-link"
            title="Experimental Features"
          >
            <font-awesome-icon icon="flask" />
          </router-link>
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

// Get experimental features state
const { experimentalFeatures } = useUserSettings()

// Navigate to appropriate home page based on dev mode
const navigateHome = () => {
  if (props.isDevMode) {
    router.push('/dev')
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
/* Main header container styles */
.header {
  background-color: var(--header-bg);
  min-height: 60px; /* Changed from fixed height to min-height */
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid var(--border-color);
  position: relative;
  width: 100%;
  padding: 0.5rem 0; /* Added padding to prevent content squishing */
}

/* Header content wrapper styles */
.header-content {
  width: 100%;
  padding: 0 0.75rem; /* Reduced side padding for mobile */
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Left section styles for layout balance */
.left-section {
  width: 20px; /* Reduced width for mobile */
  flex-shrink: 0; /* Prevent shrinking */
}

/* Right section styles with navigation */
.right-section {
  width: auto;
  flex-shrink: 0; /* Prevent shrinking */
  display: flex;
  align-items: center;
}

/* App title styles */
h1 {
  margin: 0;
  font-size: 1.5rem; /* Reduced font size for mobile */
  font-weight: 700;
  color: var(--accent-color);
  cursor: pointer;
}

/* Navigation styles */
nav {
  display: flex;
  align-items: center;
  gap: 1rem;
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
  
  .left-section {
    width: 40px;
  }
  
  h1 {
    font-size: 1.8rem;
  }
}
</style> 