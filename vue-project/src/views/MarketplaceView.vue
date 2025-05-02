<template>
  <div class="app-layout">
    <SideNavigation ref="sideNav" v-model:expanded="sidebarExpanded" />
    
    <div class="main-container" :class="{ 'sidebar-expanded': sidebarExpanded }">
      <!-- Mobile header with menu button -->
      <div class="mobile-header">
        <button class="menu-btn" @click="toggleSidebar">
          <font-awesome-icon icon="bars" />
        </button>
        <h1 class="mobile-title">Patternly</h1>
        <div class="spacer"></div>
      </div>
      
      <main class="marketplace-content">
        <div class="page-header">
          <h1>Pattern Marketplace</h1>
          <p class="subtitle">Discover and share patterns with the community</p>
        </div>
        
        <!-- Placeholder content -->
        <div class="coming-soon">
          <font-awesome-icon icon="store" size="4x" />
          <h2>Marketplace Coming Soon</h2>
          <p>Our community marketplace is under development. Soon you'll be able to discover, share, and download patterns from creators around the world.</p>
          <button class="primary-btn" @click="navigateToPatterns">
            View Your Patterns
          </button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SideNavigation from '@/components/SideNavigation.vue'

const router = useRouter()
const sidebarExpanded = ref(window.innerWidth >= 768)
const sideNav = ref(null)

const toggleSidebar = () => {
  if (sideNav.value) {
    // Call the navigation component's method directly
    sideNav.value.toggleNavigation()
  } else {
    // Fallback to the reactive property if ref isn't available
    sidebarExpanded.value = !sidebarExpanded.value
  }
}

const navigateToPatterns = () => {
  router.push('/patterns')
}
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  position: relative;
  background-color: var(--main-bg);
}

.main-container {
  flex: 1;
  margin-left: 60px;
  transition: margin-left 0.3s ease;
  width: calc(100% - 60px);
}

.main-container.sidebar-expanded {
  margin-left: 220px;
  width: calc(100% - 220px);
}

/* Mobile header (only visible on small screens) */
.mobile-header {
  display: none;
  align-items: center;
  padding: 1rem;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  height: 60px;
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1.25rem;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-title {
  font-size: 1.25rem;
  margin: 0;
  color: var(--accent-color);
  flex: 1;
  text-align: center;
}

.spacer {
  width: 40px;
}

/* Main content area */
.marketplace-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Page header */
.page-header {
  margin-bottom: 2rem;
  text-align: center;
}

.page-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

/* Coming soon placeholder */
.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-secondary);
}

.coming-soon svg {
  color: var(--accent-color);
  opacity: 0.7;
  margin-bottom: 1.5rem;
}

.coming-soon h2 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.coming-soon p {
  margin-bottom: 2rem;
  max-width: 600px;
}

.primary-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background-color: var(--accent-color);
  color: white;
}

.primary-btn:hover {
  background-color: var(--accent-hover);
  transform: translateY(-2px);
}

/* Responsive styles */
@media (max-width: 767px) {
  .main-container {
    margin-left: 0;
    width: 100%;
  }
  
  .main-container.sidebar-expanded {
    margin-left: 0;
    width: 100%;
  }
  
  .mobile-header {
    display: flex;
  }
  
  .marketplace-content {
    padding: 1.5rem 1rem;
  }
  
  .page-header h1 {
    font-size: 1.75rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
}
</style> 