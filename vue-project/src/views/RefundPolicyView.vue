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
      
      <div class="refund-policy">
        <h1>Refund Policy</h1>
        
        <p><em>Last updated: {{ currentDate }}</em></p>

        <p>This Refund Policy outlines the terms and conditions for refunds and cancellations for Patternly's services and digital products.</p>

        <section>
          <h2>1. Subscription Refunds</h2>
          <p>For our subscription-based services:</p>
          <ul>
            <li>Monthly subscriptions can be cancelled at any time. No partial refunds will be issued for the current billing period.</li>
            <li>Annual subscriptions can be refunded within 14 days of purchase for a full refund if you are not satisfied with the service.</li>
            <li>After the 14-day period, annual subscriptions can be cancelled, but no partial refunds will be issued for the remaining subscription period.</li>
          </ul>
        </section>

        <section>
          <h2>2. Digital Product Refunds</h2>
          <p>For individual pattern purchases or other digital products:</p>
          <ul>
            <li>Due to the digital nature of our products, all sales are generally final once the digital content has been accessed or downloaded.</li>
            <li>If you have not downloaded or accessed the digital content, you may request a refund within 7 days of purchase.</li>
            <li>If a pattern contains significant errors that make it unusable, please contact our support team for assistance or a potential refund.</li>
          </ul>
        </section>

        <section>
          <h2>3. Processing Fees</h2>
          <p>When processing refunds, please note the following:</p>
          <ul>
            <li>A processing fee of 3-5% of the transaction amount will be retained from all refunds to cover payment processing costs.</li>
            <li>For refunds requested after the standard refund period but approved as exceptions, a higher processing fee may apply.</li>
            <li>If a refund is issued due to an error on our part (such as a technical issue or a mistake in the pattern), the processing fee will be waived.</li>
            <li>For seller-issued refunds, the processing fee will be deducted from the refund amount returned to the buyer.</li>
          </ul>
        </section>

        <section>
          <h2>4. How to Request a Refund</h2>
          <p>To request a refund:</p>
          <ul>
            <li>Log into your account and navigate to your purchase history</li>
            <li>Select the order you wish to request a refund for</li>
            <li>Follow the prompts to submit your refund request</li>
            <li>Alternatively, contact our support team at business.michael.m.williams@gmail.com</li>
          </ul>
          <p>Please include your order number and reason for the refund request in your communication.</p>
        </section>

        <section>
          <h2>5. Processing Time</h2>
          <p>Refund requests are typically processed within 5-7 business days. Once approved, the refund (minus any applicable processing fees) will be issued to the original payment method used for the purchase. Depending on your financial institution, it may take an additional 5-10 business days for the refund to appear in your account.</p>
        </section>

        <section>
          <h2>6. Marketplace Transactions</h2>
          <p>For patterns or products purchased from third-party sellers on our marketplace:</p>
          <ul>
            <li>Refund requests must be submitted within 7 days of purchase.</li>
            <li>The seller has 3 business days to respond to and approve/deny the refund request.</li>
            <li>If approved, Patternly will process the refund minus the applicable processing fee.</li>
            <li>If a seller does not respond within the 3-day period, Patternly may review and decide on the refund request.</li>
            <li>Patternly reserves the right to issue refunds at its discretion if a pattern does not meet our quality standards.</li>
          </ul>
        </section>

        <section>
          <h2>7. Special Circumstances</h2>
          <p>We understand that special circumstances may arise. If you are requesting a refund outside of our standard policy terms, please contact our support team, and we will review your case individually.</p>
        </section>

        <section>
          <h2>8. Promotional Offers and Free Trials</h2>
          <p>Purchases made with promotional codes or discounts are subject to this refund policy unless otherwise stated in the specific promotion terms.</p>
          <p>Free trial conversions to paid subscriptions can be cancelled according to the subscription refund terms outlined above.</p>
        </section>

        <section>
          <h2>9. Changes to this Policy</h2>
          <p>We may update our Refund Policy from time to time. We will notify you of any changes by posting the new policy on this page with a new "Last updated" date.</p>
        </section>

        <section>
          <h2>10. Contact Us</h2>
          <p>If you have any questions about our Refund Policy, please contact us at:</p>
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

.refund-policy {
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
  .refund-policy {
    padding: 3rem 2rem;
  }
}
</style> 