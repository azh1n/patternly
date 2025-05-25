import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

export function useAdControl() {
  const shouldShowAds = ref(false)
  const route = useRoute()
  
  // List of routes where ads should never be shown
  const noAdRoutes = [
    '/login',
    '/auth/callback',
    '/profile',
  ]
  
  // Pages that require special content validation
  const validateContentRoutes = [
    '/',
    '/patterns',
    '/tools',
    '/marketplace'
  ]
  
  // Function to check if the current route should show ads
  const checkRoute = () => {
    // Don't show ads on excluded routes
    if (noAdRoutes.includes(route.path)) {
      shouldShowAds.value = false
      return
    }
    
    // Set to true by default for most content pages
    shouldShowAds.value = true
    
    // For certain routes, perform additional content validation
    if (validateContentRoutes.includes(route.path)) {
      validatePageContent()
    }
  }
  
  // Function to validate if a page has enough content
  const validatePageContent = () => {
    // Wait for content to load
    setTimeout(() => {
      // Get the main content area
      const contentElements = document.querySelectorAll('.app-container > :not(.ad-container):not(footer):not(.app-footer)')
      
      if (contentElements.length === 0) {
        shouldShowAds.value = false
        return
      }
      
      // Get the main content element (usually the first one)
      const mainContent = contentElements[0]
      
      // Calculate the content height
      const contentHeight = mainContent.scrollHeight
      
      // Check content metrics
      const hasMinHeight = contentHeight > 300 // At least 300px of content
      const textContent = mainContent.textContent?.trim() || ''
      const hasSubstantialText = textContent.length > 150 // At least 150 chars of text
      const elementCount = mainContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div.content-block, img, ul, ol, table').length
      const hasEnoughElements = elementCount > 3 // At least 3 content elements
      
      // Only show ads if we have substantial content
      shouldShowAds.value = hasMinHeight && (hasSubstantialText || hasEnoughElements)
    }, 500)
  }
  
  // Watch for route changes
  watch(() => route.path, () => {
    checkRoute()
  }, { immediate: true })
  
  onMounted(() => {
    // Initial check
    checkRoute()
    
    // Set up a content observer to detect when content changes
    const contentObserver = new MutationObserver(() => {
      if (validateContentRoutes.includes(route.path)) {
        validatePageContent()
      }
    })
    
    // Start observing with a delay to ensure page is loaded
    setTimeout(() => {
      contentObserver.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: false,
        characterData: false
      })
    }, 1000)
  })
  
  return {
    shouldShowAds
  }
} 