<template>
  <div class="about">
    <AppHeader :show-nav="true" :is-dev-mode="false" />
    
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
</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
</script>

<style scoped>
.about {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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

@media (min-width: 768px) {
  .about-content {
    padding: 3rem 2rem;
  }
  
  .about-card {
    padding: 3rem;
  }
}
</style> 