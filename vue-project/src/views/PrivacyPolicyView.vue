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
      
      <div class="privacy-policy">
        <h1>Privacy Policy</h1>
        
        <p><em>Last updated: {{ currentDate }}</em></p>

        <p>Patternly ("we", "our", or "us") values your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.</p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul>
            <li>Your name and email address (for account creation and login)</li>
            <li>Login credentials (via email/password or Google)</li>
            <li>Saved crochet patterns you input or create</li>
            <li>Payment information (handled securely by a third-party provider — we do not store payment details directly)</li>
            <li>Cookies and similar technologies that collect information about your device and browsing activity</li>
          </ul>
          <p>We may also collect basic technical data such as browser type, IP address, and device information to improve the app's performance.</p>
        </section>

        <section>
          <h2>2. Cookies and Similar Technologies</h2>
          <p>We use cookies (small text files placed on your device) and similar technologies to improve your experience on our site. These include:</p>
          <ul>
            <li><strong>Essential cookies:</strong> Required for the website to function properly, such as keeping you logged in</li>
            <li><strong>Analytics cookies:</strong> Help us understand how visitors use our website so we can improve it</li>
            <li><strong>Preference cookies:</strong> Remember your settings and preferences</li>
          </ul>
          <p>Most web browsers allow you to manage your cookie preferences by deleting or blocking cookies. Please note that if you choose to block cookies, you may not be able to use all features of our website.</p>
          <p>We may use services from third parties who may also set cookies on your device. We do not have control over these cookies.</p>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide and improve the Patternly web application</li>
            <li>Save and display your patterns and preferences</li>
            <li>Communicate with you about updates or account-related issues</li>
            <li>Support secure login and future payment features</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Sharing</h2>
          <p>We do not sell your personal data. In the future, we may use trusted third-party services to process payments or support app functionality. These providers will only receive the data necessary to perform their services.</p>
        </section>

        <section>
          <h2>5. Data Storage and Security</h2>
          <p>We use secure, industry-standard services to store and manage your data. Your information is protected using encryption and other safeguards, but no online system can be guaranteed 100% secure.</p>
        </section>

        <section>
          <h2>6. Your Rights</h2>
          <p>If you're located in California or the European Union, you have the right to:</p>
          <ul>
            <li>Access the data we hold about you</li>
            <li>Request correction or deletion of your data</li>
            <li>Withdraw consent or object to how we process your information</li>
          </ul>
          <p>To request any of these actions, contact us using the information below.</p>
        </section>

        <section>
          <h2>7. Contact Us</h2>
          <p>If you have any questions about this policy or your personal data, you can reach us at:</p>
          <p>📧 business.michael.m.williams@gmail.com</p>
        </section>

        <section>
          <h2>8. Changes to This Policy</h2>
          <p>We may update this Privacy Policy occasionally. We will post the updated version here with a new "Last updated" date.</p>
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

.privacy-policy {
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
  .privacy-policy {
    padding: 3rem 2rem;
  }
}
</style> 