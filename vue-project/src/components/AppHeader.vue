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
        @click="router.push('/')"
        class="clickable"
      >
        Patternly
      </h1>
      <!-- Right section with conditional navigation -->
      <div class="right-section">
        <nav v-if="showNav">
          <router-link to="/profile" class="profile-link">Profile</router-link>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'

// Component props
const props = defineProps({
  showNav: {
    type: Boolean,
    default: false  // Controls visibility of navigation elements
  }
})

// Router instance for programmatic navigation
const router = useRouter()
</script>

<style scoped>
/* Main header container styles */
.header {
  background-color: var(--header-bg);
  height: var(--header-height);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid var(--border-color);
  position: relative;
  width: 100%;
  min-width: 1200px;
}

/* Header content wrapper styles */
.header-content {
  width: 1200px;
  padding: 0 72px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Left section styles for layout balance */
.left-section {
  width: 100px;
}

/* Right section styles with navigation */
.right-section {
  width: 100px;
  display: flex;
  justify-content: flex-end;
}

/* App title styles with gradient effect */
.header h1 {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 600;
  cursor: pointer;
  background-image: linear-gradient(90deg, 
    #81C784 0%,
    #2E7D32 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--accent-color);
  transition: all 0.2s;
  padding-bottom: 4px;
}

/* Hover effects for app title */
.header h1:hover {
  transform: translateY(-1px);
  text-shadow: 0 2px 4px rgba(76, 175, 80, 0.2);
  border-bottom: 2px solid var(--accent-color);
}

/* Profile link styles */
.profile-link {
  color: var(--button-text);
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.2s;
  background-color: var(--button-bg);
  border: 1px solid var(--button-border);
}

/* Hover effects for profile link */
.profile-link:hover {
  background-color: var(--button-hover-bg);
  border-color: var(--accent-color);
}
</style> 