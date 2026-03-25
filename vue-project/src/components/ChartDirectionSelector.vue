<template>
  <div class="direction-selector">
    <h3 class="selector-title">Where does Row 1 start?</h3>
    <p class="selector-subtitle">Click a corner to set where your first stitch begins</p>

    <div class="schematic-area">
      <!-- 4x4 grid with corner indicators -->
      <div class="grid-wrapper">
        <!-- Corner indicators -->
        <button
          v-for="corner in corners"
          :key="corner.value"
          class="corner-indicator"
          :class="[
            corner.position,
            { selected: selectedCorner === corner.value }
          ]"
          @click="selectCorner(corner.value)"
          :aria-label="`Start from ${corner.label}`"
          :title="corner.label"
        >
          <span class="corner-dot"></span>
          <span class="corner-label">1</span>
        </button>

        <!-- Grid cells -->
        <div class="grid">
          <div
            v-for="(cell, index) in gridCells"
            :key="index"
            class="grid-cell"
            :class="{
              'animated': selectedCorner && cell.animationDelay !== null,
              'row-highlight': selectedCorner && cell.row === animatingRow
            }"
            :style="cell.animationDelay !== null ? { animationDelay: `${cell.animationDelay}ms` } : {}"
          >
            <span v-if="selectedCorner && cell.patternRow !== null" class="cell-row-number">
              {{ cell.patternRow }}
            </span>
            <!-- Direction arrow for first cell in each row -->
            <span v-if="selectedCorner && cell.isFirstInRow" class="cell-arrow" :class="cell.arrowDirection">
              {{ cell.arrowDirection === 'left' ? '\u2190' : '\u2192' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Row direction toggle -->
    <div class="direction-toggle">
      <span class="toggle-label">Row direction:</span>
      <div class="toggle-buttons">
        <button
          class="toggle-btn"
          :class="{ active: rowDirection === 'alternating' }"
          @click="setRowDirection('alternating')"
        >
          Flat (alternating)
        </button>
        <button
          class="toggle-btn"
          :class="{ active: rowDirection === 'same' }"
          @click="setRowDirection('same')"
        >
          In the round
        </button>
      </div>
    </div>

    <!-- Continue button — only shown after corner is selected -->
    <button
      v-if="selectedCorner"
      class="continue-btn"
      @click="onContinue"
    >
      Continue
      <font-awesome-icon :icon="['fas', 'arrow-right']" />
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const emit = defineEmits(['confirm'])

const selectedCorner = ref(null)
const rowDirection = ref('alternating')
const animatingRow = ref(-1)
const animationKey = ref(0)

const corners = [
  { value: 'top-left', label: 'Top left', position: 'pos-top-left' },
  { value: 'top-right', label: 'Top right', position: 'pos-top-right' },
  { value: 'bottom-left', label: 'Bottom left', position: 'pos-bottom-left' },
  { value: 'bottom-right', label: 'Bottom right', position: 'pos-bottom-right' },
]

const GRID_ROWS = 4
const GRID_COLS = 4

// Compute grid cells with animation data based on current selection
const gridCells = computed(() => {
  // Trigger recomputation when animationKey changes
  const _ = animationKey.value

  const cells = []
  const corner = selectedCorner.value
  const direction = rowDirection.value

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cell = { row: r, col: c, patternRow: null, animationDelay: null, isFirstInRow: false, arrowDirection: null }

      if (corner) {
        const startFromBottom = corner.startsWith('bottom')
        const startFromRight = corner.endsWith('right')

        // Map physical row to pattern row
        const patternRowIndex = startFromBottom ? (GRID_ROWS - 1 - r) : r
        cell.patternRow = patternRowIndex + 1

        // Determine read direction for this pattern row
        let readsRight
        if (direction === 'same') {
          readsRight = !startFromRight
        } else {
          readsRight = patternRowIndex % 2 === 0 ? !startFromRight : startFromRight
        }

        // Arrow for first visible cell in the row
        const isFirstCol = readsRight ? c === 0 : c === GRID_COLS - 1
        if (isFirstCol) {
          cell.isFirstInRow = true
          cell.arrowDirection = readsRight ? 'right' : 'left'
        }

        // Stagger animation by pattern row
        cell.animationDelay = patternRowIndex * 150
      }

      cells.push(cell)
    }
  }

  return cells
})

function selectCorner(corner) {
  selectedCorner.value = corner
  triggerAnimation()
}

function setRowDirection(direction) {
  rowDirection.value = direction
  if (selectedCorner.value) {
    triggerAnimation()
  }
}

function triggerAnimation() {
  animationKey.value++
}

function onContinue() {
  emit('confirm', {
    startCorner: selectedCorner.value,
    rowDirection: rowDirection.value
  })
}
</script>

<style scoped>
.direction-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 24px;
  max-width: 400px;
  margin: 0 auto;
}

.selector-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.selector-subtitle {
  font-size: 0.875rem;
  color: var(--vt-c-text-light-2);
  margin: 0;
}

@media (prefers-color-scheme: dark) {
  .selector-subtitle {
    color: var(--vt-c-text-dark-2);
  }
}

.schematic-area {
  position: relative;
  padding: 28px;
}

.grid-wrapper {
  position: relative;
  display: inline-block;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 56px);
  grid-template-rows: repeat(4, 56px);
  gap: 0;
  border: 2px solid var(--color-border-hover);
  border-radius: 4px;
  overflow: hidden;
}

.grid-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  transition: background-color 0.2s;
}

.grid-cell.animated {
  animation: cellFadeIn 0.3s ease forwards;
  opacity: 0;
}

@keyframes cellFadeIn {
  from {
    opacity: 0;
    background-color: transparent;
  }
  to {
    opacity: 1;
    background-color: var(--color-background-mute);
  }
}

.cell-row-number {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.6;
}

.cell-arrow {
  position: absolute;
  font-size: 0.875rem;
  color: hsla(160, 100%, 37%, 1);
  font-weight: bold;
}

.cell-arrow.right {
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
}

.cell-arrow.left {
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
}

/* Corner indicators */
.corner-indicator {
  position: absolute;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--color-border-hover);
  background: var(--color-background);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: all 0.2s ease;
  padding: 0;
}

.corner-indicator:hover {
  border-color: hsla(160, 100%, 37%, 1);
  transform: scale(1.1);
}

.corner-indicator.selected {
  border-color: hsla(160, 100%, 37%, 1);
  background: hsla(160, 100%, 37%, 1);
}

.corner-indicator.selected .corner-label {
  color: white;
}

.corner-dot {
  display: none;
}

.corner-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text);
  transition: color 0.2s;
}

.corner-indicator:not(.selected) .corner-label {
  opacity: 0.5;
}

.pos-top-left {
  top: -4px;
  left: -4px;
  transform: translate(-50%, -50%);
}

.pos-top-right {
  top: -4px;
  right: -4px;
  transform: translate(50%, -50%);
}

.pos-bottom-left {
  bottom: -4px;
  left: -4px;
  transform: translate(-50%, 50%);
}

.pos-bottom-right {
  bottom: -4px;
  right: -4px;
  transform: translate(50%, 50%);
}

.corner-indicator:hover {
  transform: scale(1.1);
}

.pos-top-left:hover { transform: translate(-50%, -50%) scale(1.1); }
.pos-top-right:hover { transform: translate(50%, -50%) scale(1.1); }
.pos-bottom-left:hover { transform: translate(-50%, 50%) scale(1.1); }
.pos-bottom-right:hover { transform: translate(50%, 50%) scale(1.1); }

/* Direction toggle */
.direction-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.toggle-label {
  font-size: 0.875rem;
  color: var(--color-text);
  font-weight: 500;
}

.toggle-buttons {
  display: flex;
  gap: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-border-hover);
}

.toggle-btn {
  padding: 8px 16px;
  font-size: 0.8125rem;
  border: none;
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.toggle-btn:first-child {
  border-right: 1px solid var(--color-border-hover);
}

.toggle-btn:hover {
  background: var(--color-background-mute);
}

.toggle-btn.active {
  background: hsla(160, 100%, 37%, 1);
  color: white;
}

/* Continue button */
.continue-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  font-size: 0.9375rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: hsla(160, 100%, 37%, 1);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  animation: fadeInUp 0.2s ease;
}

.continue-btn:hover {
  background: hsla(160, 100%, 32%, 1);
  transform: translateY(-1px);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
