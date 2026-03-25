/**
 * Stitch Classification Service
 *
 * Loads a trained ONNX model in a Web Worker and classifies extracted grid cells
 * into stitch types. All inference runs client-side via onnxruntime-web (WASM).
 *
 * Usage:
 *   const { classifyCells, isModelLoaded, isClassifying, progress } = useStitchClassification()
 *   const predictions = await classifyCells(cellImages, (completed, total) => { ... })
 */

import { ref, shallowRef } from 'vue';

const MODEL_PATH = '/models/stitch-classifier.onnx';
const CLASSES_PATH = '/models/stitch-classes.json';
const BATCH_SIZE = 64;
const CONFIDENCE_THRESHOLD = 0.5;

// Shared state across all consumers
const worker = shallowRef(null);
const isModelLoaded = ref(false);
const isClassifying = ref(false);
const modelLoadError = ref(null);

/**
 * Initialize the Web Worker and load the model.
 * Safe to call multiple times — only initializes once.
 */
async function ensureModel() {
  if (isModelLoaded.value) return;
  if (worker.value) return; // Already initializing

  return new Promise((resolve, reject) => {
    const w = new Worker(
      new URL('@/workers/classificationWorker.js', import.meta.url),
      { type: 'module' }
    );

    const onMessage = (e) => {
      if (e.data.type === 'init-complete') {
        w.removeEventListener('message', onMessage);
        isModelLoaded.value = true;
        modelLoadError.value = null;
        resolve();
      } else if (e.data.type === 'init-error') {
        w.removeEventListener('message', onMessage);
        modelLoadError.value = e.data.error;
        worker.value = null;
        reject(new Error(e.data.error));
      }
    };

    w.addEventListener('message', onMessage);
    worker.value = w;

    // Build absolute URLs for the worker (it can't use import.meta.url)
    const base = window.location.origin;
    w.postMessage({
      type: 'init',
      modelUrl: `${base}${MODEL_PATH}`,
      classesUrl: `${base}${CLASSES_PATH}`,
    });
  });
}

/**
 * Classify an array of cell images.
 *
 * @param {{ width: number, height: number, data: Uint8ClampedArray }[]} cellImages
 *   Each cell is an object with width, height, and RGBA pixel data.
 * @param {(completed: number, total: number) => void} [onProgress] - Progress callback
 * @returns {Promise<{ stitchType: string, confidence: number }[]>} - One prediction per cell
 */
async function classifyCells(cellImages, onProgress) {
  if (!cellImages || cellImages.length === 0) return [];

  await ensureModel();

  isClassifying.value = true;

  try {
    return await new Promise((resolve, reject) => {
      const w = worker.value;

      const onMessage = (e) => {
        if (e.data.type === 'progress') {
          onProgress?.(e.data.completed, e.data.total);
        } else if (e.data.type === 'result') {
          w.removeEventListener('message', onMessage);

          // Mark low-confidence predictions as unknown
          const predictions = e.data.predictions.map(p => ({
            stitchType: p.confidence >= CONFIDENCE_THRESHOLD ? p.stitchType : 'unknown',
            confidence: p.confidence,
          }));

          resolve(predictions);
        } else if (e.data.type === 'error') {
          w.removeEventListener('message', onMessage);
          reject(new Error(e.data.error));
        }
      };

      w.addEventListener('message', onMessage);

      // Transfer cell data to worker
      // We send plain objects (not transferable) since cells are small
      w.postMessage({
        type: 'classify',
        cells: cellImages.map(c => ({
          width: c.width,
          height: c.height,
          data: c.data,
        })),
        batchSize: BATCH_SIZE,
      });
    });
  } finally {
    isClassifying.value = false;
  }
}

/**
 * Clean up the worker. Call when no longer needed.
 */
function dispose() {
  if (worker.value) {
    worker.value.terminate();
    worker.value = null;
    isModelLoaded.value = false;
  }
}

/**
 * Composable for stitch classification.
 */
export function useStitchClassification() {
  return {
    classifyCells,
    ensureModel,
    dispose,
    isModelLoaded,
    isClassifying,
    modelLoadError,
    CONFIDENCE_THRESHOLD,
  };
}
