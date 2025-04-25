<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-links">
        <router-link to="/about" class="footer-link">About</router-link>
        <router-link to="/privacy-policy" class="footer-link">Privacy Policy</router-link>
      </div>
      <div class="copyright">
        &copy; {{ currentYear }} Patternly. All rights reserved.
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref } from 'vue';

const currentYear = ref(new Date().getFullYear());
</script>

<style scoped>
.footer {
  width: 100%;
  background-color: var(--footer-bg, var(--header-bg));
  padding: 1.5rem 0;
  margin-top: auto;
  border-top: 1px solid var(--border-color);
}

.footer-content {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.footer-links {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.footer-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: var(--accent-color);
}

.copyright {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

@media (min-width: 768px) {
  .footer-content {
    flex-direction: row;
    justify-content: space-between;
    padding: 0 2rem;
  }
}
</style> 