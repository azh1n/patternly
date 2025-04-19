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
  height: 60px; /* Fixed smaller height for mobile */
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid var(--border-color);
  position: relative;
  width: 100%;
}

/* Header content wrapper styles */
.header-content {
  width: 100%;
  padding: 0 1rem;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Left section styles for layout balance */
.left-section {
  width: 24px;
}

/* Right section styles with navigation */
.right-section {
  width: 24px;
  display: flex;
  justify-content: flex-end;
}

/* App title styles with gradient effect */
.header h1 {
  margin: 0;
  font-size: 1.25rem;
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
  padding-bottom: 2px;
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
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
  background-color: var(--button-bg);
  border: 1px solid var(--button-border);
  font-size: 0.875rem;
}

/* Hover effects for profile link */
.profile-link:hover {
  background-color: var(--button-hover-bg);
  border-color: var(--accent-color);
}

/* Tablet styles */
@media (min-width: 768px) {
  .header {
    height: var(--header-height);
  }

  .header-content {
    padding: 0 2rem;
    max-width: 1200px;
  }

  .left-section,
  .right-section {
    width: 75px;
  }

  .header h1 {
    font-size: 1.8rem;
    padding-bottom: 4px;
  }

  .profile-link {
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }
}

/* Desktop styles */
@media (min-width: 1024px) {
  .header-content {
    padding: 0 4rem;
  }

  .left-section,
  .right-section {
    width: 100px;
  }

  .header h1 {
    font-size: 2.2rem;
  }
}
</style> 