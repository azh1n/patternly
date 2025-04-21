<template>
  <div class="ad-banner" :class="{ 'ad-loaded': isLoaded, 'ad-error': hasError }">
    <!-- Google AdSense Ad Unit -->
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-8237432847073620"
         data-ad-slot="7158018837"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

const isLoaded = ref(false)
const hasError = ref(false)

onMounted(() => {
  // Load Google AdSense script with your specific client ID
  const script = document.createElement('script')
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8237432847073620'
  script.async = true
  script.crossOrigin = 'anonymous'
  
  script.onerror = () => {
    console.error('Failed to load AdSense script')
    hasError.value = true
  }

  document.head.appendChild(script)

  // Initialize ads after script loads
  script.onload = () => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({
        push: () => {
          isLoaded.value = true
        }
      })
    } catch (e) {
      console.error('Error loading ads:', e)
      hasError.value = true
    }
  }

  // Set a timeout to mark as error if ad doesn't load
  setTimeout(() => {
    if (!isLoaded.value) {
      hasError.value = true
    }
  }, 5000)
})
</script>

<style scoped>
.ad-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: white;
  padding: 8px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  min-height: 50px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.ad-banner.ad-loaded {
  opacity: 1;
  visibility: visible;
}

.ad-banner.ad-error {
  display: none;
}

/* Ensure the banner doesn't interfere with content on mobile */
@media (max-width: 768px) {
  .ad-banner {
    padding: 4px;
  }
}
</style> 