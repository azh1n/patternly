<template>
  <div class="stitch-confirmation">
    <h3 class="confirmation-title">Verify Detected Stitches</h3>
    <p class="confirmation-subtitle">
      Found {{ legendEntries.length }} unique stitch groups across {{ totalCells }} cells.
      Confirm or correct each group below.
    </p>

    <div class="legend-list">
      <div
        v-for="entry in legendEntries"
        :key="entry.id"
        class="legend-entry"
        :class="{
          'is-unknown': entry.stitchType === 'unknown',
          'low-confidence': entry.avgConfidence < 0.7
        }"
      >
        <!-- Thumbnail -->
        <canvas
          :ref="el => setThumbnailRef(entry.id, el)"
          class="legend-thumbnail"
          width="48"
          height="48"
        ></canvas>

        <!-- Stitch type input with suggestions -->
        <div class="legend-details">
          <div class="stitch-input-wrapper">
            <input
              type="text"
              class="stitch-input"
              :value="entry.stitchType === 'unknown' ? '' : entry.stitchType"
              :placeholder="entry.stitchType === 'unknown' ? 'Type stitch name...' : ''"
              :list="`stitch-suggestions-${entry.id}`"
              @input="onTypeInput(entry.id, $event.target.value)"
              @change="onTypeInput(entry.id, $event.target.value)"
            />
            <datalist :id="`stitch-suggestions-${entry.id}`">
              <option
                v-for="type in STITCH_TYPES"
                :key="type.value"
                :value="type.value"
              >
                {{ type.label }}
              </option>
            </datalist>
          </div>
          <span class="cell-count">{{ entry.cellCount }} cells</span>
          <span
            class="confidence-badge"
            :class="confidenceClass(entry.avgConfidence)"
          >
            {{ Math.round(entry.avgConfidence * 100) }}%
          </span>
        </div>
      </div>
    </div>

    <!-- Unknown warning -->
    <p v-if="!allGroupsAssigned" class="unknown-warning">
      <font-awesome-icon :icon="['fas', 'exclamation-triangle']" />
      Some groups are still marked as "unknown". Assign a stitch type to continue.
    </p>

    <!-- Confirm button -->
    <button
      class="confirm-btn"
      :class="{ disabled: !allGroupsAssigned }"
      :disabled="!allGroupsAssigned"
      @click="onConfirm"
    >
      Confirm Stitches
      <font-awesome-icon :icon="['fas', 'check']" />
    </button>
  </div>
</template>

<script setup>
import { computed, onMounted, nextTick, watch } from 'vue';
import { useStitchLegend, STITCH_TYPES } from '@/composables/useStitchLegend';

const props = defineProps({
  predictions: { type: Array, required: true },
  cellImages: { type: Array, required: true },
  gridCells: { type: Array, required: true },
  gridDimensions: { type: Object, required: true },
  startCorner: { type: String, required: true },
  rowDirection: { type: String, required: true },
});

const emit = defineEmits(['confirm']);

const {
  legendEntries,
  buildLegend,
  updateGroupType,
  allGroupsAssigned,
  buildPatternRows,
} = useStitchLegend();

const totalCells = computed(() =>
  legendEntries.value.reduce((sum, e) => sum + e.cellCount, 0)
);

// Thumbnail canvas refs
const thumbnailRefs = {};

function setThumbnailRef(id, el) {
  if (el) thumbnailRefs[id] = el;
}

function renderThumbnails() {
  for (const entry of legendEntries.value) {
    const canvas = thumbnailRefs[entry.id];
    if (!canvas || !entry.thumbnailData) continue;

    const ctx = canvas.getContext('2d');
    const { width, height, data } = entry.thumbnailData;

    // Draw scaled to canvas
    const imgData = new ImageData(new Uint8ClampedArray(data), width, height);
    const offscreen = new OffscreenCanvas(width, height);
    const offCtx = offscreen.getContext('2d');
    offCtx.putImageData(imgData, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offscreen, 0, 0, 48, 48);
  }
}

function confidenceClass(confidence) {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

function onTypeInput(groupId, value) {
  const trimmed = value.trim().toLowerCase();
  updateGroupType(groupId, trimmed || 'unknown');
}

function onConfirm() {
  if (!allGroupsAssigned.value) return;

  const patternRows = buildPatternRows(
    props.gridCells,
    props.gridDimensions,
    props.startCorner,
    props.rowDirection
  );

  emit('confirm', { patternRows });
}

// Build legend and render thumbnails on mount
onMounted(async () => {
  buildLegend(props.predictions, props.cellImages);
  await nextTick();
  renderThumbnails();
});

// Re-render thumbnails when legend changes (shouldn't normally happen)
watch(legendEntries, async () => {
  await nextTick();
  renderThumbnails();
});
</script>

<style scoped>
.stitch-confirmation {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  max-width: 500px;
  margin: 0 auto;
  width: 100%;
}

.confirmation-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.confirmation-subtitle {
  font-size: 0.875rem;
  color: var(--vt-c-text-light-2);
  margin: 0;
  text-align: center;
}

@media (prefers-color-scheme: dark) {
  .confirmation-subtitle {
    color: var(--vt-c-text-dark-2);
  }
}

.legend-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.legend-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  transition: border-color 0.2s;
}

.legend-entry.is-unknown {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.05);
}

.legend-entry.low-confidence:not(.is-unknown) {
  border-color: #f59e0b;
}

.legend-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-background-mute);
}

.legend-details {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.stitch-input-wrapper {
  flex: 1;
  min-width: 0;
}

.stitch-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--color-border-hover);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.8125rem;
  font-family: inherit;
}

.stitch-input::placeholder {
  color: #d97706;
  opacity: 0.7;
}

.stitch-input:focus {
  outline: none;
  border-color: hsla(160, 100%, 37%, 1);
}

.cell-count {
  font-size: 0.75rem;
  color: var(--vt-c-text-light-2);
  white-space: nowrap;
  flex-shrink: 0;
}

@media (prefers-color-scheme: dark) {
  .cell-count {
    color: var(--vt-c-text-dark-2);
  }
}

.confidence-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}

.confidence-badge.high {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
}

.confidence-badge.medium {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

.confidence-badge.low {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.unknown-warning {
  font-size: 0.8125rem;
  color: #d97706;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.confirm-btn {
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
}

.confirm-btn:hover:not(.disabled) {
  background: hsla(160, 100%, 32%, 1);
  transform: translateY(-1px);
}

.confirm-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
