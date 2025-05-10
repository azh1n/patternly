<template>
  <div class="ad-banner" :class="{ 
    'ad-loaded': isLoaded, 
    'ad-error': hasError
  }">
    <!-- Google AdSense Ad Unit -->
    <ins class="adsbygoogle"
         style="display:inline-block"
         data-ad-client="ca-pub-8237432847073620"
         data-ad-slot="7158018837"
         data-ad-format="auto"
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
/* Basic styling for all devices */
.ad-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 50px !important; /* Force exact height with !important */
  max-height: 50px !important; /* Force max height with !important */
  background-color: var(--main-bg, #151515);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease;
  padding: 0 !important; /* Remove all padding */
  margin: 0 !important; /* Remove all margin */
  box-shadow: 0 -1px 2px rgba(0, 0, 0, 0.1);
  overflow: hidden !important;
  line-height: 0 !important; /* Minimize line height */
}

.ad-banner.ad-loaded {
  opacity: 1;
  visibility: visible;
}

.ad-banner.ad-error {
  display: none;
}

.adsbygoogle {
  width: 234px; /* Smallest standard banner width */
  height: 50px !important; /* Force exact height with !important */
  max-height: 50px !important; /* Force max height with !important */
  margin: 0 auto !important;
  padding: 0 !important;
  overflow: hidden !important;
}

/* Define the ad banner height for other components */
:root {
  --ad-banner-height: 50px !important; /* Force exact height with !important */
}

/* Responsive adjustments */
@media (max-width: 767px) {
  .ad-banner {
    height: 50px !important;
    max-height: 50px !important;
  }
  
  :root {
    --ad-banner-height: 50px !important;
  }
}
</style> 