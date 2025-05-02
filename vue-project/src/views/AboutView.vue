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
      
      <main class="about-content">
        <div class="about-card">
          <h2>About Patternly</h2>
          
          <section class="about-section">
            <h3>Our Mission</h3>
            <p>Patternly was created to provide a simple, intuitive platform for managing and tracking extensive patterns. Our goal is to help users organize their pattern collection efficiently, visualize their creative journey, and connect with a community of like-minded pattern enthusiasts.</p>
          </section>
          
          <section class="about-section">
            <h3>What We Offer</h3>
            <ul>
              <li>Simple pattern management</li>
              <li>User-friendly interface</li>
              <li>Secure cloud storage</li>
              <li>Regular updates and improvements</li>
            </ul>
          </section>
          
          <section class="about-section">
            <h3>Our Team</h3>
            <p>Patternly is developed by me, Michael Williams, a passionate developer focused on creating intuitive and user-friendly web applications.</p>
          </section>
          
          <section class="about-section">
            <h3>Contact Us</h3>
            <p>Have questions or suggestions? We'd love to hear from you!</p>
            <p>Email: business.michael.m.williams@gmail.com</p>
          </section>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SideNavigation from '@/components/SideNavigation.vue'

const sidebarExpanded = ref(window.innerWidth >= 768)
const sideNav = ref(null)

// Toggle sidebar expanded state
const toggleSidebar = () => {
  if (sideNav.value) {
    // Call the navigation component's method directly
    sideNav.value.toggleNavigation()
  } else {
    // Fallback to the reactive property if ref isn't available
    sidebarExpanded.value = !sidebarExpanded.value
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--main-bg);
  color: var(--text-primary);
  position: relative;
}

.main-container {
  flex: 1;
  padding-left: 60px; /* Width of collapsed sidebar */
  transition: padding-left 0.3s ease;
  width: 100%;
}

.main-container.sidebar-expanded {
  padding-left: 220px; /* Width of expanded sidebar */
}

.mobile-header {
  display: none;
  align-items: center;
  padding: 1rem;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
}

.mobile-title {
  margin: 0 1rem;
  font-size: 1.25rem;
  color: var(--accent-color);
}

.spacer {
  flex: 1;
}

.about-content {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 2rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.about-card {
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  padding: 2rem;
}

.about-card h2 {
  color: var(--accent-color);
  margin-bottom: 1.5rem;
  text-align: center;
  font-size: 2rem;
}

.about-section {
  margin-bottom: 2rem;
}

.about-section h3 {
  color: var(--accent-color);
  margin-bottom: 0.75rem;
  font-size: 1.4rem;
}

.about-section p {
  margin-bottom: 1rem;
  line-height: 1.6;
}

.about-section ul {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

.about-section li {
  margin-bottom: 0.5rem;
}

/* Mobile styles */
@media (max-width: 767px) {
  .main-container {
    padding-left: 0;
  }
  
  .main-container.sidebar-expanded {
    padding-left: 0;
  }
  
  .mobile-header {
    display: flex;
  }
}

@media (min-width: 768px) {
  .about-content {
    padding: 3rem 2rem;
  }
  
  .about-card {
    padding: 3rem;
  }
}
</style> 