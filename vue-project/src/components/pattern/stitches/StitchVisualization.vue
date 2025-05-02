<template>
  <div class="stitch-visualization">
    <!-- Stitches per view control -->
    <div class="stitch-control">
      <label for="stitchesPerView">Stitches per view:</label>
      <div class="number-control">
        <button 
          @click="decreaseStitches" 
          :disabled="stitchesPerView <= 1"
        >
          −
        </button>
        <span>{{ stitchesPerView }}</span>
        <button 
          @click="increaseStitches" 
          :disabled="stitchesPerView >= maxStitchesPerView"
        >
          +
        </button>
      </div>
    </div>

    <!-- Stitch navigation -->
    <div class="stitch-navigation">
      <button 
        @click="previousStitches" 
        class="nav-button"
        :disabled="currentStitchIndex === 0"
      >
        <span class="arrow-icon prev-arrow">←</span>
      </button>
      
      <!-- Current stitches display -->
      <div class="stitch-content">
        <div class="current-stitches">
          <slot name="current-stitches"></slot>
        </div>
        <div class="stitch-progress">
          <span class="progress-indicator">
            {{ stitchProgress }}
          </span>
        </div>
      </div>
      
      <button 
        @click="nextStitches" 
        class="nav-button"
        :disabled="currentStitchIndex + stitchesPerView >= props.totalStitches"
      >
        <span class="arrow-icon next-arrow">→</span>
      </button>
    </div>

    <!-- Full row preview section -->
    <div class="full-row-preview">
      <h3>Full Row Preview</h3>
      <div class="preview-content">
        <slot name="row-preview"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from 'vue';

const props = defineProps({
  totalStitches: {
    type: Number,
    required: true
  },
  initialStitchesPerView: {
    type: Number,
    default: 3
  },
  maxStitchesPerView: {
    type: Number,
    default: 5
  }
});

const emits = defineEmits(['update:currentStitchIndex', 'update:stitchesPerView']);

// Navigation state
const currentStitchIndex = ref(0);
const stitchesPerView = ref(props.initialStitchesPerView);
const lastZoomTime = ref(0);
const isZooming = ref(false);
const actualStitchCount = ref(0);

// Function to calculate the total stitch count from displayed stitches
const calculateActualStitchCount = () => {
  nextTick(() => {
    try {
      const currentStitches = document.querySelectorAll('.current-stitches .stitch-wrapper');
      let count = 0;
      
      if (currentStitches && currentStitches.length > 0) {
        currentStitches.forEach(stitch => {
          // Get the text content from the stitch element
          const text = stitch.textContent.trim();
          // Extract the number prefix (like '22' from '22dc')
          const match = text.match(/^(\d+)/);
          if (match) {
            count += parseInt(match[1], 10);
          } else {
            // If no number found, count as 1
            count += 1;
          }
        });
        actualStitchCount.value = count;
      } else {
        // Fallback to stitchesPerView if no stitches found
        actualStitchCount.value = stitchesPerView.value;
      }
    } catch (error) {
      console.error('Error calculating stitch count:', error);
      actualStitchCount.value = stitchesPerView.value;
    }
  });
};

// Set up watchers and observers
onMounted(() => {
  // Initial calculation
  calculateActualStitchCount();
  
  // Set up MutationObserver to watch for DOM changes
  const observer = new MutationObserver(() => {
    calculateActualStitchCount();
  });
  
  // Observe the current-stitches container for changes
  const currentStitchesEl = document.querySelector('.current-stitches');
  if (currentStitchesEl) {
    observer.observe(currentStitchesEl, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
  
  // Clean up on unmount
  onUnmounted(() => {
    observer.disconnect();
  });
});

// Watch for navigation changes to recalculate
watch([currentStitchIndex, stitchesPerView], () => {
  calculateActualStitchCount();
});

// Stitch progress indicator
const stitchProgress = computed(() => {
  if (!props.totalStitches) return '0 of 0';
  
  let start = 1;
  if (currentStitchIndex.value > 0) {
    // Calculate the total stitch count from all previous blocks
    // This requires DOM access to find the actual stitch counts
    try {
      const allStitches = document.querySelectorAll('.preview-content .stitch-wrapper');
      if (allStitches && allStitches.length > 0) {
        // Sum up all the stitches before the current index
        let previousStitchCount = 0;
        for (let i = 0; i < currentStitchIndex.value && i < allStitches.length; i++) {
          const text = allStitches[i].textContent.trim();
          const match = text.match(/^(\d+)/);
          previousStitchCount += match ? parseInt(match[1], 10) : 1;
        }
        start = previousStitchCount + 1;
      }
    } catch (error) {
      console.error('Error calculating start stitch count:', error);
      // Fallback to index + 1 if there's an error
      start = currentStitchIndex.value + 1;
    }
  }
  
  // For the ending stitch count, add the actual stitch count of current view
  const end = Math.min(start - 1 + (actualStitchCount.value || stitchesPerView.value), props.totalStitches);
  
  return `${start}-${end} of ${props.totalStitches} stitches`;
});

// Navigation methods
const nextStitches = () => {
  if (currentStitchIndex.value + stitchesPerView.value < props.totalStitches) {
    // Move exactly by stitchesPerView blocks to avoid overlap
    currentStitchIndex.value += stitchesPerView.value;
    emits('update:currentStitchIndex', currentStitchIndex.value);
    nextTick(() => {
      updateScrollPosition();
    });
  }
};

const previousStitches = () => {
  if (currentStitchIndex.value > 0) {
    // Move exactly by stitchesPerView blocks
    currentStitchIndex.value = Math.max(0, currentStitchIndex.value - stitchesPerView.value);
    emits('update:currentStitchIndex', currentStitchIndex.value);
    nextTick(() => {
      updateScrollPosition();
    });
  }
};

// Stitch view controls
const decreaseStitches = () => {
  if (stitchesPerView.value > 1) {
    stitchesPerView.value--;
    emits('update:stitchesPerView', stitchesPerView.value);
  }
};

const increaseStitches = () => {
  if (stitchesPerView.value < props.maxStitchesPerView) {
    stitchesPerView.value++;
    emits('update:stitchesPerView', stitchesPerView.value);
  }
};

// Update scroll position in the preview
const updateScrollPosition = () => {
  try {
    // Wait for DOM to update
    setTimeout(() => {
      const container = document.querySelector('.preview-content');
      if (!container) return; // Guard against missing container

      const activeStitches = container.querySelectorAll('.current-stitch');
      if (activeStitches && activeStitches.length > 0) {
        const firstActiveStitch = activeStitches[0];
        if (!firstActiveStitch) return; // Guard against missing element
        
        const containerWidth = container.offsetWidth;
        const scrollPosition = firstActiveStitch.offsetLeft - (containerWidth / 2) + (firstActiveStitch.offsetWidth * stitchesPerView.value / 2);
        
        container.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: isZooming.value ? 'auto' : 'smooth'
        });
      }
    }, 100); // Increased delay to ensure DOM has updated
  } catch (error) {
    console.error('Error updating scroll position:', error);
  }
};

// Watch for changes to update scroll position
watch([currentStitchIndex, stitchesPerView], () => {
  nextTick(() => {
    updateScrollPosition();
  });
});

// Initialize ResizeObserver outside so we can access it in onUnmounted
let resizeObserver;

onMounted(() => {
  // Add a resize observer to detect zoom events
  resizeObserver = new ResizeObserver(entries => {
    // When zooming on mobile, multiple resize events fire in quick succession
    const now = Date.now();
    isZooming.value = now - lastZoomTime.value < 500;
    lastZoomTime.value = now;
  });
  
  // Observe the document body for resize events (which occur during zooming)
  resizeObserver.observe(document.body);
});

onUnmounted(() => {
  // Clean up the observer when component is unmounted
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

// Expose methods and state to parent component
defineExpose({
  currentStitchIndex,
  stitchesPerView,
  nextStitches,
  previousStitches
});
</script>

<style scoped>
/* Stitch control */
.stitch-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--text-primary, #fff);
  margin-bottom: 0.75rem;
}

.number-control {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.number-control button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--button-bg, #333);
  color: var(--button-text, #fff);
  border: 1px solid var(--border-color, #444);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  line-height: 1;
}

.number-control button:hover:not(:disabled) {
  background: var(--button-hover-bg, #444);
  border-color: var(--accent-color, #4f87ff);
}

.number-control button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Navigation buttons */
.nav-button {
  padding: 0.5rem 1rem;
  background: var(--button-bg, #333);
  color: var(--button-text, #fff);
  border: 1px solid var(--border-color, #444);
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-button:hover:not(:disabled) {
  background: var(--button-hover-bg, #444);
  border-color: var(--accent-color, #4f87ff);
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Stitch navigation */
.stitch-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.stitch-content {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 70px;
}

.current-stitches {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 0.5rem;
  min-height: 45px;
  padding-top: 0;
  padding-bottom: 0;
}

.stitch-progress {
  font-size: 0.9rem;
  color: var(--text-secondary, #aaa);
}

/* Full row preview */
.full-row-preview {
  margin-top: 0.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.full-row-preview h3 {
  text-align: center;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  color: var(--text-primary);
  font-weight: 600;
}

.preview-content {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  overflow-x: auto;
  padding: 0.5rem;
  margin-top: 1rem;
}

/* Light theme overrides */
:root.light .stitch-navigation,
:root.light .preview-content {
  background: rgba(0, 0, 0, 0.03);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

:root.light .nav-button {
  background: #f5f5f5;
  color: #333;
  border-color: #e0e0e0;
}

:root.light .nav-button:hover:not(:disabled) {
  background: #e0e0e0;
  border-color: #2979ff;
}

/* Mobile styles */
@media (max-width: 767px) {
  .stitch-navigation {
    padding: 0.75rem;
  }

  .current-stitches {
    gap: 1rem;
  }

  .preview-content {
    padding: 0.75rem;
  }
  
  /* Improving touch targets for mobile */
  .nav-button {
    margin: 0 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .arrow-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
}
</style> 