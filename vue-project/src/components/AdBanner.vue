<template>
  <div v-if="shouldShowAds" class="ad-container" :class="{ 'ad-ready': adReady }">
    <div class="ad-banner" :class="{ 
      'ad-loaded': isLoaded, 
      'ad-error': hasError
    }">
      <!-- Google AdSense Ad Unit -->
      <ins class="adsbygoogle"
           style="display:none"
           data-ad-client="ca-pub-8237432847073620"
           data-ad-slot="7158018837"
           data-ad-format="auto"
           data-full-width-responsive="false"></ins>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, onUnmounted, nextTick } from 'vue'
import { useAdControl } from '../composables/useAdControl'

const isLoaded = ref(false)
const hasError = ref(false)
const adReady = ref(false)
let adTimeoutId = null
let resizeObserver = null
let constraintInterval = null

// Use the ad control composable
const { shouldShowAds } = useAdControl()

onMounted(() => {
  // First, apply constraints to ensure banner starts hidden
  enforceAdHeight()
  
  // Set up interval to continually enforce height during loading
  constraintInterval = setInterval(() => {
    enforceAdHeight()
  }, 50)
  
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
      stopConstraintInterval()
    }

    document.head.appendChild(script)
  }

  // Initialize the ad with a delay to ensure constraints are applied first
  setTimeout(() => {
    try {
      // Don't proceed if we shouldn't show ads
      if (!shouldShowAds.value) {
        return
      }
      
      // Make ad visible
      const adElement = document.querySelector('.adsbygoogle')
      if (adElement) {
        adElement.style.display = 'inline-block'
      }
      
      // Push the ad
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({})
        
        // Apply constraints again after ad is initialized
        enforceAdHeight()
        
        // Set a small delay before showing ad to ensure constraints apply
        setTimeout(() => {
          isLoaded.value = true
          adReady.value = true
          enforceAdHeight()
          stopConstraintInterval()
        }, 200)
      }
    } catch (e) {
      console.error('Error initializing ads:', e)
      hasError.value = true
      stopConstraintInterval()
    }
  }, 500)

  // Set a timeout to check if ad loaded
  adTimeoutId = setTimeout(() => {
    if (!isLoaded.value && shouldShowAds.value) {
      console.warn('Ad did not load within expected timeframe')
      hasError.value = true
      stopConstraintInterval()
    }
  }, 5000)

  // Use ResizeObserver to monitor height changes
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      enforceAdHeight()
    })
    
    setTimeout(() => {
      const adContainer = document.querySelector('.ad-container')
      if (adContainer) {
        resizeObserver.observe(adContainer)
      }
      
      const adBanner = document.querySelector('.ad-banner')
      if (adBanner) {
        resizeObserver.observe(adBanner)
      }
      
      const adElement = document.querySelector('.adsbygoogle')
      if (adElement) {
        resizeObserver.observe(adElement)
      }
    }, 300)
  }
})

// Stop the constraint interval
const stopConstraintInterval = () => {
  if (constraintInterval) {
    clearInterval(constraintInterval)
    constraintInterval = null
  }
}

// Force ad to stay 50px height
const enforceAdHeight = () => {
  // Enforce container constraints
  const adContainer = document.querySelector('.ad-container')
  if (adContainer) {
    adContainer.style.setProperty('height', '50px', 'important')
    adContainer.style.setProperty('max-height', '50px', 'important')
    adContainer.style.setProperty('overflow', 'hidden', 'important')
  }
  
  // Enforce banner constraints
  const adBanner = document.querySelector('.ad-banner')
  if (adBanner) {
    adBanner.style.setProperty('height', '50px', 'important')
    adBanner.style.setProperty('max-height', '50px', 'important')
    adBanner.style.setProperty('overflow', 'hidden', 'important')
  }
  
  // Enforce ad constraints
  const adElement = document.querySelector('.adsbygoogle')
  if (adElement) {
    adElement.style.setProperty('height', '50px', 'important')
    adElement.style.setProperty('max-height', '50px', 'important')
    adElement.style.setProperty('overflow', 'hidden', 'important')
  }
}

onUnmounted(() => {
  // Clear the timeout when component is unmounted
  if (adTimeoutId) {
    clearTimeout(adTimeoutId)
  }
  
  // Disconnect resize observer
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  
  // Clear constraint interval
  stopConstraintInterval()
})
</script>

<style scoped>
/* Container with fixed height to constrain ad */
.ad-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 50px !important; /* Fixed height container */
  max-height: 50px !important;
  z-index: 1000;
  background-color: var(--main-bg, #151515);
  overflow: hidden !important;
  box-shadow: 0 -1px 2px rgba(0, 0, 0, 0.1);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease;
}

/* Show container only when ad is ready and constrained */
.ad-container.ad-ready {
  opacity: 1;
  visibility: visible;
}

/* Basic styling for all devices */
.ad-banner {
  width: 100%;
  height: 50px !important; /* Force exact height with !important */
  max-height: 50px !important; /* Force max height with !important */
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 !important; /* Remove all padding */
  margin: 0 !important; /* Remove all margin */
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
  .ad-container,
  .ad-banner {
    height: 50px !important;
    max-height: 50px !important;
  }
  
  :root {
    --ad-banner-height: 50px !important;
  }
}
</style> 