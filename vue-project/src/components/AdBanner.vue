<template>
  <div class="ad-banner" :class="{ 'ad-loaded': isLoaded, 'ad-error': hasError }">
    <!-- Google AdSense Ad Unit -->
    <ins class="adsbygoogle"
         style="display:inline-block"
         data-ad-client="ca-pub-8237432847073620"
         data-ad-slot="7158018837"
         data-ad-format="horizontal"
         data-full-width-responsive="false"></ins>
  </div>
</template>

<script setup>
import { onMounted, ref, onUnmounted } from 'vue'

const isLoaded = ref(false)
const hasError = ref(false)
let adTimeoutId = null

onMounted(() => {
  // Check if AdSense script is already loaded
  if (!document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
    // Load Google AdSense script
    const script = document.createElement('script')
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8237432847073620'
    script.async = true
    script.crossOrigin = 'anonymous'
    
    script.onerror = () => {
      console.error('Failed to load AdSense script')
      hasError.value = true
    }

    document.head.appendChild(script)
  }

  // Initialize the ad with a small delay to ensure script is loaded
  setTimeout(() => {
    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({})
        isLoaded.value = true
      }
    } catch (e) {
      console.error('Error initializing ads:', e)
      hasError.value = true
    }
  }, 1000)

  // Set a timeout to check if ad loaded
  adTimeoutId = setTimeout(() => {
    if (!isLoaded.value) {
      console.warn('Ad did not load within expected timeframe')
      hasError.value = true
    }
  }, 5000)
})

onUnmounted(() => {
  // Clear the timeout when component is unmounted
  if (adTimeoutId) {
    clearTimeout(adTimeoutId)
  }
})
</script>

<style scoped>
.ad-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: var(--main-bg, white);
  padding: 4px;
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.1);
  min-height: 50px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
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

.adsbygoogle {
  width: 320px;
  height: 50px;
  margin: 0 auto;
}

/* Add padding to the bottom of the page to prevent content from being hidden behind the ad */
:root {
  --ad-banner-height: 50px;
}

/* Ensure the banner doesn't interfere with content on mobile */
@media (max-width: 768px) {
  .ad-banner {
    padding: 2px;
    min-height: 50px;
  }
  
  :root {
    --ad-banner-height: 50px;
  }
}
</style> 