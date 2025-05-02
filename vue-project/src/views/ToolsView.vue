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
      
      <main class="tools-content">
        <div class="page-header">
          <h1>Pattern Tools</h1>
          <p class="subtitle">Advanced utilities for pattern management</p>
          
          <div class="experimental-badge">
            <font-awesome-icon icon="flask" />
            <span>Experimental Feature</span>
          </div>
        </div>
        
        <!-- Tools section -->
        <div class="tools-grid">
          <div v-if="isLocalhost" class="tool-card" @click="activeToolView = 'firebase-test'">
            <div class="tool-icon">
              <font-awesome-icon icon="database" />
            </div>
            <div class="tool-content">
              <h3>Firebase Connectivity Test</h3>
              <p>Test database connection and saving</p>
            </div>
          </div>
          
          <div class="tool-card disabled">
            <div class="tool-icon">
              <font-awesome-icon icon="file-export" />
            </div>
            <div class="tool-content">
              <h3>Pattern Export</h3>
              <p>Export your patterns in multiple formats</p>
            </div>
            <div class="coming-soon-tag">Coming Soon</div>
          </div>
          
          <div class="tool-card disabled">
            <div class="tool-icon">
              <font-awesome-icon icon="file-import" />
            </div>
            <div class="tool-content">
              <h3>Pattern Import</h3>
              <p>Import patterns from external sources</p>
            </div>
            <div class="coming-soon-tag">Coming Soon</div>
          </div>
          
          <div class="tool-card disabled">
            <div class="tool-icon">
              <font-awesome-icon icon="chart-bar" />
            </div>
            <div class="tool-content">
              <h3>Pattern Analytics</h3>
              <p>View stats about your pattern collection</p>
            </div>
            <div class="coming-soon-tag">Coming Soon</div>
          </div>
          
          <div class="tool-card disabled">
            <div class="tool-icon">
              <font-awesome-icon icon="archive" />
            </div>
            <div class="tool-content">
              <h3>Bulk Actions</h3>
              <p>Manage multiple patterns at once</p>
            </div>
            <div class="coming-soon-tag">Coming Soon</div>
          </div>
        </div>
        
        <div class="info-box">
          <font-awesome-icon icon="info-circle" />
          <p>The Tools section is part of our experimental features. We're constantly adding new functionality. Have suggestions? Let us know on our <a href="#" @click.prevent="navigateToAbout">feedback page</a>.</p>
        </div>
        
        <!-- Active Tool View -->
        <div v-if="activeToolView" class="active-tool-view">
          <div class="tool-header">
            <button class="back-button" @click="activeToolView = null">
              <font-awesome-icon icon="arrow-left" />
              <span>Back to Tools</span>
            </button>
            <h2 class="tool-title">
              {{ getToolTitle(activeToolView) }}
            </h2>
          </div>
          
          <!-- Firebase Test Tool -->
          <div v-if="activeToolView === 'firebase-test' && isLocalhost" class="tool-content-view">
            <FirebaseTest />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import SideNavigation from '@/components/SideNavigation.vue'
import FirebaseTest from '@/components/FirebaseTest.vue'

const router = useRouter()
const sidebarExpanded = ref(window.innerWidth >= 768)
const sideNav = ref(null)
const activeToolView = ref(null)
const isLocalhost = ref(false)

onMounted(() => {
  // Check if the application is running on localhost
  isLocalhost.value = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1'
  
  // Reset the active tool view if it's firebase-test and not localhost
  if (activeToolView.value === 'firebase-test' && !isLocalhost.value) {
    activeToolView.value = null
  }
})

const toggleSidebar = () => {
  if (sideNav.value) {
    // Call the navigation component's method directly
    sideNav.value.toggleNavigation()
  } else {
    // Fallback to the reactive property if ref isn't available
    sidebarExpanded.value = !sidebarExpanded.value
  }
}

const navigateToAbout = () => {
  router.push('/about')
}

// Get the appropriate title for the active tool
const getToolTitle = (toolId) => {
  switch (toolId) {
    case 'firebase-test':
      return isLocalhost.value ? 'Firebase Connectivity Test' : 'Tool'
    default:
      return 'Tool'
  }
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
.tools-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Page header */
.page-header {
  margin-bottom: 2rem;
  text-align: center;
  position: relative;
}

.page-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.experimental-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(46, 204, 113, 0.15);
  color: #2ecc71;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

/* Tools grid */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.tool-card {
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: hidden;
}

.tool-card:not(.disabled):hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.tool-card.disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.tool-icon {
  width: 50px;
  height: 50px;
  background-color: rgba(108, 92, 231, 0.15);
  color: var(--accent-color);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.tool-content h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.tool-content p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.coming-soon-tag {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background-color: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Info box */
.info-box {
  background-color: rgba(52, 152, 219, 0.1);
  border: 1px solid rgba(52, 152, 219, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 2rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.info-box svg {
  color: #3498db;
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.info-box p {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.5;
}

.info-box a {
  color: #3498db;
  text-decoration: none;
  font-weight: 500;
}

.info-box a:hover {
  text-decoration: underline;
}

/* Active Tool View */
.active-tool-view {
  margin-top: 2rem;
  border-top: 1px solid var(--border-color);
  padding-top: 1.5rem;
}

.tool-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: var(--accent-color);
  font-size: 0.9rem;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
}

.back-button:hover {
  background-color: rgba(108, 92, 231, 0.1);
}

.tool-title {
  margin: 0 0 0 1rem;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.tool-content-view {
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  padding: 1.5rem;
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
  
  .tools-content {
    padding: 1.5rem 1rem;
  }
  
  .page-header h1 {
    font-size: 1.75rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
  
  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style> 