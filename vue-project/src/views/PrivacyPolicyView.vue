<template>
  <div class="privacy-policy">
    <h1>Privacy Policy</h1>
    
    <p><em>Last Updated: {{ currentDate }}</em></p>

    <section>
      <h2>Introduction</h2>
      <p>Welcome to our service. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services. Please read this Privacy Policy carefully. By accessing or using our service, you acknowledge that you have read, understood, and agree to be bound by all the terms outlined in this Privacy Policy.</p>
    </section>

    <section>
      <h2>Information We Collect</h2>
      
      <h3>Personal Information</h3>
      <p>We may collect personal information that you voluntarily provide when using our service, including but not limited to:</p>
      <ul>
        <li>Account information (name, email address, phone number)</li>
        <li>Profile information</li>
        <li>Payment and billing information</li>
        <li>Communications between you and our service</li>
        <li>Any other information you choose to provide</li>
      </ul>

      <h3>Automatically Collected Information</h3>
      <p>When you access our service, we may automatically collect certain information, including:</p>
      <ul>
        <li>Device information (device type, operating system, browser type)</li>
        <li>Log information (IP address, access times, pages viewed)</li>
        <li>Usage details (interactions with our service)</li>
        <li>Location information</li>
      </ul>
    </section>

    <section>
      <h2>How We Use Your Information</h2>
      <p>We may use the information we collect for various purposes, including:</p>
      <ul>
        <li>Providing, maintaining, and improving our service</li>
        <li>Processing transactions and managing service fees</li>
        <li>Sending administrative information, updates, and promotional communications</li>
        <li>Responding to your comments, questions, and requests</li>
        <li>Monitoring and analyzing usage patterns and trends</li>
        <li>Protecting against fraudulent, unauthorized, or illegal activity</li>
      </ul>
    </section>

    <section>
      <h2>Firebase Data Storage</h2>
      <p>We use Google Firebase to store and process user data. Firebase's privacy practices are governed by Google's Privacy Policy, which can be found at <a href="https://policies.google.com/privacy" target="_blank">https://policies.google.com/privacy</a>. By using our service, you acknowledge and agree that your information will be transferred to and processed by Firebase.</p>
      <p>Firebase collects and stores various types of data, including:</p>
      <ul>
        <li>Authentication information</li>
        <li>User-generated content</li>
        <li>Usage statistics</li>
        <li>Other data necessary for the operation of our service</li>
      </ul>
    </section>

    <section>
      <h2>Service Fees</h2>
      <p>We charge service fees for certain features or aspects of our service. When processing payments for these fees:</p>
      <ol>
        <li>We collect and store billing information necessary to process your payment</li>
        <li>Payment processing is handled by secure third-party payment processors</li>
        <li>We maintain records of transactions for legal and accounting purposes</li>
        <li>We may use your payment information to detect and prevent fraud</li>
      </ol>
      <p>We do not store complete credit card information on our servers.</p>
    </section>

    <section>
      <h2>Data Sharing and Disclosure</h2>
      <p>We may share your information in the following circumstances:</p>
      <ul>
        <li>With service providers who perform services on our behalf</li>
        <li>To comply with legal obligations</li>
        <li>To protect and defend our rights and property</li>
        <li>With business partners with your consent</li>
        <li>In connection with a business transaction such as a merger or acquisition</li>
      </ul>
    </section>

    <section>
      <h2>Data Security</h2>
      <p>We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.</p>
    </section>

    <section>
      <h2>Your Rights</h2>
      <p>Depending on your location, you may have certain rights regarding your personal information, such as:</p>
      <ul>
        <li>Access to your personal information</li>
        <li>Correction of inaccurate or incomplete information</li>
        <li>Deletion of your personal information</li>
        <li>Restriction or objection to processing</li>
        <li>Data portability</li>
      </ul>
      <p>To exercise these rights, please contact us using the information provided in the "Contact Us" section below.</p>
    </section>

    <section>
      <h2>Children's Privacy</h2>
      <p>Our service is not intended for individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we learn we have collected personal information from a child under 13, we will delete that information.</p>
    </section>

    <section>
      <h2>Changes to this Privacy Policy</h2>
      <p>We may update this Privacy Policy from time to time. The updated version will be indicated by an updated "Last Updated" date. We encourage you to review this Privacy Policy frequently to stay informed about how we are protecting your information.</p>
    </section>

    <section>
      <h2>Contact Us</h2>
      <p>If you have questions or concerns about this Privacy Policy, please contact us at:</p>
      <p>{{ contactInfo || '[Your Contact Information]' }}</p>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// You can replace these with your actual values
const currentDate = ref(new Date().toLocaleDateString());
const contactInfo = ref(''); // Add your contact information here
</script>

<style scoped>
.privacy-policy {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  line-height: 1.6;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
}

h2 {
  margin-top: 30px;
  padding-bottom: 5px;
  border-bottom: 1px solid #eee;
}

h3 {
  margin-top: 20px;
}

section {
  margin-bottom: 30px;
}

ul, ol {
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
</style> 