<template>
  <div class="privacy-policy-page">
    <AppHeader :show-nav="true" :is-dev-mode="false" />
    
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
        </ul>
        <p>We may also collect basic technical data such as browser type, IP address, and device information to improve the app's performance.</p>
      </section>

      <section>
        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide and improve the Patternly web application</li>
          <li>Save and display your patterns and preferences</li>
          <li>Communicate with you about updates or account-related issues</li>
          <li>Support secure login and future payment features</li>
        </ul>
      </section>

      <section>
        <h2>3. Data Sharing</h2>
        <p>We do not sell your personal data. In the future, we may use trusted third-party services to process payments or support app functionality. These providers will only receive the data necessary to perform their services.</p>
      </section>

      <section>
        <h2>4. Data Storage and Security</h2>
        <p>We use secure, industry-standard services to store and manage your data. Your information is protected using encryption and other safeguards, but no online system can be guaranteed 100% secure.</p>
      </section>

      <section>
        <h2>5. Your Rights</h2>
        <p>If you're located in California or the European Union, you have the right to:</p>
        <ul>
          <li>Access the data we hold about you</li>
          <li>Request correction or deletion of your data</li>
          <li>Withdraw consent or object to how we process your information</li>
        </ul>
        <p>To request any of these actions, contact us using the information below.</p>
      </section>

      <section>
        <h2>6. Contact Us</h2>
        <p>If you have any questions about this policy or your personal data, you can reach us at:</p>
        <p>📧 business.michael.m.williams@gmail.com</p>
      </section>

      <section>
        <h2>7. Changes to This Policy</h2>
        <p>We may update this Privacy Policy occasionally. We will post the updated version here with a new "Last updated" date.</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AppHeader from '@/components/AppHeader.vue';

// Format date as Month Day, Year
const currentDate = ref(new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}));
</script>

<style scoped>
.privacy-policy-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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

@media (min-width: 768px) {
  .privacy-policy {
    padding: 3rem 2rem;
  }
}
</style> 