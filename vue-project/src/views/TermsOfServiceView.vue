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
      
      <div class="terms-of-service">
        <h1>Terms of Service</h1>
        
        <p><em>Last updated: {{ currentDate }}</em></p>

        <p>Welcome to Patternly. By accessing or using our service, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully.</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using Patternly, you agree to these Terms and our Privacy Policy. If you do not agree to these Terms, please do not use our service.</p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>Patternly provides a web application for creating, managing, and sharing crochet patterns. We reserve the right to modify or discontinue the service at any time without notice.</p>
        </section>

        <section>
          <h2>3. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account information, including your password. You agree to notify us immediately of any unauthorized access to or use of your account.</p>
        </section>

        <section>
          <h2>4. User Content</h2>
          <p>You retain ownership of any content you create using our service. By posting content to Patternly, you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, and display your content in connection with providing and promoting the service.</p>
        </section>

        <section>
          <h2>5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the service for any illegal purpose</li>
            <li>Violate any intellectual property rights</li>
            <li>Attempt to gain unauthorized access to any part of the service</li>
            <li>Use the service to transmit harmful code or interfere with its functionality</li>
            <li>Harass, abuse, or harm another person</li>
          </ul>
        </section>

        <section>
          <h2>6. Intellectual Property</h2>
          <p>Patternly and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, and other intellectual property laws.</p>
        </section>

        <section>
          <h2>7. Termination</h2>
          <p>We may terminate or suspend your account and access to the service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users of the service, us, or third parties, or for any other reason.</p>
        </section>

        <section>
          <h2>8. Disclaimer of Warranties</h2>
          <p>The service is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, regarding the reliability or availability of the service.</p>
        </section>

        <section>
          <h2>9. Limitation of Liability</h2>
          <p>In no event shall Patternly be liable for any indirect, incidental, special, consequential or punitive damages, including loss of profits, data, or other intangible losses, resulting from your access to or use of or inability to access or use the service.</p>
        </section>

        <section>
          <h2>10. Changes to Terms</h2>
          <p>We reserve the right to modify these Terms at any time. We will provide notice of significant changes by posting the new Terms on this page with a new "Last updated" date.</p>
        </section>

        <section>
          <h2>11. Governing Law</h2>
          <p>These Terms shall be governed by the laws of the jurisdiction in which we operate, without regard to its conflict of law provisions.</p>
        </section>

        <section>
          <h2>12. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at:</p>
          <p>📧 business.michael.m.williams@gmail.com</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SideNavigation from '@/components/SideNavigation.vue';

// Format date as Month Day, Year
const currentDate = ref(new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}));

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

.terms-of-service {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  line-height: 1.6;
  flex: 1;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
  color: var(--accent-color, #42b983);
}

h2 {
  margin-top: 30px;
  padding-bottom: 5px;
  border-bottom: 1px solid #eee;
  color: var(--accent-color, #42b983);
}

section {
  margin-bottom: 30px;
}

ul {
  padding-left: 20px;
  margin: 15px 0;
}

a {
  color: #42b983;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
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
  .terms-of-service {
    padding: 3rem 2rem;
  }
}
</style> 