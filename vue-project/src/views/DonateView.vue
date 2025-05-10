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
      
      <div class="donate-page">
        <h1>Support Patternly</h1>
        
        <p class="subtitle">Thank you for considering a donation to help keep Patternly running!</p>

        <div class="donate-content">
          <div class="donate-description">
            <p>
              Patternly is a labor of love created to help the crochet community organize and share patterns.
              Your support helps cover hosting costs, development time, and enables new features.
            </p>
            
            <div class="donation-benefits">
              <h3>What your donation supports:</h3>
              <ul>
                <li>Server and hosting costs</li>
                <li>New feature development</li>
                <li>Bug fixes and maintenance</li>
                <li>Future expansion of pattern tools</li>
              </ul>
            </div>
          </div>

          <div class="donate-buttons">
            <h3>Make a donation</h3>
            <p>Click the button below to support Patternly via Ko-fi:</p>
            
            <!-- Ko-fi button options -->
            <div class="kofi-buttons">
              <!-- Custom button with text and logo -->
              <div class="kofi-button custom-button">
                <a href="https://ko-fi.com/azh1n" target="_blank" rel="noopener noreferrer" class="custom-kofi-btn">
                  <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="Ko-fi donations" class="kofi-img"/>
                  <span class="kofi-text">Support Patternly</span>
                </a>
              </div>
            </div>
            
            <p class="donate-info">
              You'll be redirected to Ko-fi to complete your donation securely.
              <br/>All major credit cards are accepted.
            </p>
          </div>
        </div>
        
        <div class="donate-faq">
          <h2>Donation FAQ</h2>
          
          <div class="faq-item">
            <h3>Is my payment information secure?</h3>
            <p>Yes! All payments are processed securely through Ko-fi's payment system, which uses industry-standard encryption.</p>
          </div>
          
          <div class="faq-item">
            <h3>Is there a minimum donation amount?</h3>
            <p>No, any amount is appreciated! Ko-fi's default suggestion is the price of a coffee, but you can customize the amount.</p>
          </div>
          
          <div class="faq-item">
            <h3>Can I make a recurring donation?</h3>
            <p>Yes, Ko-fi offers the option to set up recurring monthly support.</p>
          </div>
          
          <div class="faq-item">
            <h3>Other ways to support Patternly?</h3>
            <p>Absolutely! Sharing the app with friends, providing feedback, and reporting bugs are all valuable forms of support.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SideNavigation from '@/components/SideNavigation.vue';

const sidebarExpanded = ref(window.innerWidth >= 768);
const sideNav = ref(null);

// Toggle sidebar expanded state
const toggleSidebar = () => {
  if (sideNav.value) {
    // Call the navigation component's method directly
    sideNav.value.toggleNavigation()
  } else {
    // Fallback to the reactive property if ref isn't available
    sidebarExpanded.value = !sidebarExpanded.value
  }
};
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

.donate-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  line-height: 1.6;
}

h1 {
  text-align: center;
  margin-bottom: 10px;
  color: var(--accent-color, #42b983);
}

.subtitle {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1.1rem;
  color: var(--text-secondary);
}

.donate-content {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  margin-bottom: 3rem;
}

.donate-description {
  flex: 1;
}

.donate-buttons {
  flex: 1;
  padding: 1.5rem;
  background-color: var(--card-bg);
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.kofi-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
}

.custom-kofi-btn {
  display: inline-flex;
  align-items: center;
  background-color: #29abe0;
  color: white;
  border-radius: 4px;
  padding: 4px 12px;
  text-decoration: none;
  transition: background-color 0.3s;
}

.custom-kofi-btn:hover {
  background-color: #2095c4;
}

.kofi-img {
  height: 28px;
  width: auto;
  margin-right: 8px;
}

.kofi-text {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  font-weight: 600;
  font-size: 14px;
}

.donate-info {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.donation-benefits {
  margin-top: 1.5rem;
}

.donation-benefits ul {
  padding-left: 1.5rem;
  margin-top: 0.5rem;
}

.donate-faq {
  margin-top: 3rem;
}

.faq-item {
  margin-bottom: 1.5rem;
}

.faq-item h3 {
  color: var(--accent-color, #42b983);
  margin-bottom: 0.5rem;
}

h2 {
  margin-top: 30px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border-color);
  color: var(--accent-color, #42b983);
}

/* Responsive design */
@media (max-width: 768px) {
  .mobile-header {
    display: flex;
  }
  
  .main-container {
    padding-left: 0;
  }
  
  .main-container.sidebar-expanded {
    padding-left: 0;
  }
  
  .donate-content {
    flex-direction: column;
  }
  
  .donate-page {
    padding: 1rem;
  }
}
</style> 