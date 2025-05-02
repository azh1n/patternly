<template>
  <div class="app-layout">
    <SideNavigation v-model:expanded="sidebarExpanded" />
    
    <div class="main-container" :class="{ 'sidebar-expanded': sidebarExpanded }">
      <!-- Mobile header with menu button -->
      <div class="mobile-header">
        <button class="menu-btn" @click="toggleSidebar">
          <font-awesome-icon icon="bars" />
        </button>
        <h1 class="mobile-title">Patternly</h1>
        <div class="spacer"></div>
      </div>
      
      <div class="copyright-policy">
        <h1>Copyright & DMCA Policy</h1>
        
        <p><em>Last updated: {{ currentDate }}</em></p>

        <p>At Patternly, we respect the intellectual property rights of others and expect our users to do the same. This Copyright Policy outlines our procedures for responding to notices of alleged copyright infringement.</p>

        <section>
          <h2>1. DMCA Notice Procedure</h2>
          <p>If you believe that content on our platform infringes your copyright, please send a notice containing the following information to the designated agent listed below:</p>
          <ul>
            <li>A physical or electronic signature of the copyright owner or a person authorized to act on their behalf</li>
            <li>Identification of the copyrighted work claimed to have been infringed</li>
            <li>Identification of the material that is claimed to be infringing and where it is located on Patternly</li>
            <li>Your contact information, including your address, telephone number, and email address</li>
            <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or law</li>
            <li>A statement, made under penalty of perjury, that the above information is accurate and that you are the copyright owner or are authorized to act on behalf of the owner</li>
          </ul>
        </section>

        <section>
          <h2>2. Counter-Notice Procedure</h2>
          <p>If your material has been removed as a result of a DMCA notice and you believe it was removed due to a mistake or misidentification, you may submit a counter-notice containing the following information:</p>
          <ul>
            <li>Your physical or electronic signature</li>
            <li>Identification of the material that has been removed and the location where it appeared before it was removed</li>
            <li>A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification</li>
            <li>Your name, address, telephone number, and email address</li>
            <li>A statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located, or if your address is outside of the United States, the judicial district in which Patternly is located</li>
            <li>A statement that you will accept service of process from the person who provided notification of the alleged infringement</li>
          </ul>
        </section>

        <section>
          <h2>3. Repeat Infringer Policy</h2>
          <p>In accordance with the DMCA and other applicable laws, Patternly has adopted a policy of terminating, in appropriate circumstances, the accounts of users who are deemed to be repeat infringers. We may also limit access to our platform and/or terminate the accounts of users who infringe the intellectual property rights of others, whether or not there is any repeat infringement.</p>
        </section>

        <section>
          <h2>4. Copyright on Crochet Patterns</h2>
          <p>It's important to note that crochet patterns themselves are often protected by copyright. When you create a pattern using our platform:</p>
          <ul>
            <li>You retain the copyright to original patterns you create</li>
            <li>You should not copy or reproduce patterns created by others without permission</li>
            <li>We encourage the sharing of patterns with proper attribution</li>
          </ul>
        </section>

        <section>
          <h2>5. Fair Use</h2>
          <p>Patternly respects the principle of fair use, which allows limited use of copyrighted material without permission for purposes such as criticism, comment, news reporting, teaching, scholarship, or research.</p>
        </section>

        <section>
          <h2>6. Designated Agent</h2>
          <p>Our designated agent for notice of alleged copyright infringement can be reached at:</p>
          <p>📧 business.michael.m.williams@gmail.com</p>
        </section>

        <section>
          <h2>7. Changes to this Policy</h2>
          <p>We may update our Copyright Policy from time to time. We will notify you of any changes by posting the new policy on this page with a new "Last updated" date.</p>
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

// Toggle sidebar expanded state
const toggleSidebar = () => {
  sidebarExpanded.value = !sidebarExpanded.value;
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

.copyright-policy {
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
  .copyright-policy {
    padding: 3rem 2rem;
  }
}
</style> 