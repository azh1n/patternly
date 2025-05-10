<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-section branding">
        <h3 class="footer-title">Patternly</h3>
        <p class="footer-tagline">Pattern design made easy</p>
        <div class="social-links">
          <a href="#" class="social-link" aria-label="Facebook">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
          </a>
          <a href="#" class="social-link" aria-label="Twitter">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4.01c-1 .49-1.98.689-3 .99-1.121-1.265-2.783-1.335-4.38-.737S11.977 6.323 12 8v1c-3.245.083-6.135-1.395-8-4 0 0-4.182 7.433 4 11-1.872 1.247-3.739 2.088-6 2 3.308 1.803 6.913 2.423 10.034 1.517 3.58-1.04 6.522-3.723 7.651-7.742a13.84 13.84 0 0 0 .497-3.753C20.18 7.773 21.692 5.25 22 4.01z"></path></svg>
          </a>
          <a href="#" class="social-link" aria-label="Instagram">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
          </a>
          <a href="#" class="social-link" aria-label="Pinterest">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12h8M12 8v8"></path><circle cx="12" cy="12" r="10"></circle></svg>
          </a>
        </div>
      </div>
      
      <div class="footer-columns">
        <div class="footer-section links">
          <h4 class="footer-heading">Site</h4>
          <nav class="footer-nav">
            <router-link to="/" class="footer-link">Home</router-link>
            <router-link to="/about" class="footer-link">About</router-link>
            <router-link to="/tools" class="footer-link">Tools</router-link>
            <router-link to="/" class="footer-link">Dashboard</router-link>
            <router-link to="/donate" class="footer-link">Donate</router-link>
          </nav>
        </div>
        
        <div class="footer-section links">
          <h4 class="footer-heading">Legal</h4>
          <nav class="footer-nav">
            <router-link to="/privacy-policy" class="footer-link">Privacy Policy</router-link>
            <router-link to="/terms-of-service" class="footer-link">Terms of Service</router-link>
            <router-link to="/copyright-policy" class="footer-link">Copyright Policy</router-link>
            <!-- Refund Policy link temporarily hidden until marketplace is ready -->
            <!-- <router-link to="/refund-policy" class="footer-link">Refund Policy</router-link> -->
          </nav>
        </div>
      </div>
      
      <div class="footer-section newsletter">
        <h4 class="footer-heading">Stay Updated</h4>
        <p class="newsletter-text">Get the latest updates and pattern tips</p>
        <div class="newsletter-form">
          <input type="email" class="newsletter-input" placeholder="Email address" />
          <button type="submit" class="newsletter-button">Subscribe</button>
        </div>
      </div>
    </div>
    
    <div class="footer-bottom">
      <div class="copyright">
        &copy; {{ currentYear }} Patternly. All rights reserved.
      </div>
      <div class="footer-bottom-links">
        <a href="#" class="footer-link">Contact</a>
        <a href="#" class="footer-link">Support</a>
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
  background-color: var(--header-bg);
  padding: 2rem 1rem 0.75rem;
  margin-top: 2.5rem;
  border-top: 1px solid var(--border-color);
  color: var(--text-primary);
  position: relative;
  left: 0;
  right: 0;
  min-width: 100vw;
  margin-left: calc(-1 * (100vw - 100%) / 2);
  margin-right: calc(-1 * (100vw - 100%) / 2);
  box-sizing: border-box;
  box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.05);
}

.footer-content {
  max-width: var(--max-content-width);
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 0 1rem;
  box-sizing: border-box;
}

.footer-columns {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.footer-section {
  display: flex;
  flex-direction: column;
}

.footer-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--accent-color);
  letter-spacing: -0.5px;
}

.footer-tagline {
  color: var(--text-secondary);
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.footer-heading {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.8rem;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.footer-nav {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.footer-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease, transform 0.2s ease;
  display: inline-block;
  padding: 0.4rem 0;
}

.footer-link:hover, .footer-link:active {
  color: var(--accent-color);
  transform: translateX(3px);
}

.social-links {
  display: flex;
  gap: 1rem;
  margin-top: 0.8rem;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--button-bg);
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.social-link:hover, .social-link:active {
  background-color: var(--accent-color);
  color: white;
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.newsletter-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.newsletter-form {
  display: flex;
  width: 100%;
  max-width: 100%;
  gap: 8px;
}

.newsletter-input {
  background-color: #2a2a2a;
  border: 1px solid #444;
  color: #fff;
  padding: 6px 12px;
  border-radius: 4px;
  height: 44px;
  font-size: 14px;
  flex: 1;
  min-width: 0;
}

.newsletter-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.newsletter-button {
  background-color: var(--accent-color);
  color: white;
  border: none;
  padding: 0 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  height: 44px;
  font-size: 14px;
  white-space: nowrap;
}

.newsletter-button:hover, .newsletter-button:active {
  background-color: var(--accent-hover);
}

.footer-bottom {
  max-width: var(--max-content-width);
  width: 100%;
  margin: 1.5rem auto 0;
  padding: 1.2rem 1rem 0;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  box-sizing: border-box;
}

.copyright {
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-align: center;
  opacity: 0.8;
}

.footer-bottom-links {
  display: flex;
  gap: 1.5rem;
}

/* Responsive Styles */
@media (min-width: 768px) {
  .footer {
    padding-top: 3rem;
  }
  
  .footer-content {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    padding: 0 2rem;
    gap: 3rem;
  }
  
  .footer-columns {
    display: contents;
  }
  
  .footer-bottom {
    flex-direction: row;
    justify-content: space-between;
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

@media (min-width: 992px) {
  .footer-content {
    grid-template-columns: 2fr repeat(3, 1fr);
    gap: 2rem;
  }
  
  .footer-columns {
    display: contents;
  }
}

@media (min-width: 1200px) {
  .footer-content {
    padding: 0 2rem;
  }
}
</style> 