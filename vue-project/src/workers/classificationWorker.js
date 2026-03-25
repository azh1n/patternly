/**
 * Web Worker for stitch classification inference.
 * Runs ONNX model inference off the main thread to keep UI responsive.
 *
 * Messages IN:
 *   { type: 'init', modelUrl: string, classesUrl: string }
 *   { type: 'classify', cells: { width, height, data: Uint8ClampedArray }[], batchSize: number }
 *
 * Messages OUT:
 *   { type: 'init-complete' }
 *   { type: 'init-error', error: string }
 *   { type: 'progress', completed: number, total: number }
 *   { type: 'result', predictions: { stitchType: string, confidence: number }[] }
 *   { type: 'error', error: string }
 */

import * as ort from 'onnxruntime-web';

let session = null;
let classMapping = null;

/**
 * Initialize the ONNX session and load class names.
 */
async function init(modelUrl, classesUrl) {
  // Configure ONNX Runtime for WASM
  ort.env.wasm.numThreads = 1;

  // Load class mapping
  const classesResponse = await fetch(classesUrl);
  classMapping = await classesResponse.json();

  // Load ONNX model
  const modelResponse = await fetch(modelUrl);
  const modelBuffer = await modelResponse.arrayBuffer();
  session = await ort.InferenceSession.create(modelBuffer, {
    executionProviders: ['wasm'],
  });
}

/**
 * Preprocess a single cell image into a normalized float32 array [3, 64, 64].
 * Input: { width, height, data: Uint8ClampedArray } (RGBA pixel data)
 * Output: Float32Array of length 3*64*64 in CHW format, values 0-1
 */
function preprocessCell(cell, targetSize = 64) {
  const { width, height, data } = cell;

  // Simple nearest-neighbor resize to targetSize x targetSize
  const resized = new Float32Array(3 * targetSize * targetSize);

  const scaleX = width / targetSize;
  const scaleY = height / targetSize;

  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const srcX = Math.min(Math.floor(x * scaleX), width - 1);
      const srcY = Math.min(Math.floor(y * scaleY), height - 1);
      const srcIdx = (srcY * width + srcX) * 4; // RGBA

      // CHW format, normalized to 0-1
      const dstIdx = y * targetSize + x;
      resized[0 * targetSize * targetSize + dstIdx] = data[srcIdx] / 255.0;     // R
      resized[1 * targetSize * targetSize + dstIdx] = data[srcIdx + 1] / 255.0; // G
      resized[2 * targetSize * targetSize + dstIdx] = data[srcIdx + 2] / 255.0; // B
    }
  }

  return resized;
}

/**
 * Apply softmax to an array of logits.
 */
function softmax(logits) {
  const maxLogit = Math.max(...logits);
  const exps = logits.map(l => Math.exp(l - maxLogit));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

/**
 * Run batched inference on an array of cells.
 */
async function classifyCells(cells, batchSize = 64) {
  if (!session || !classMapping) {
    throw new Error('Model not initialized');
  }

  const targetSize = 64;
  const channelSize = 3 * targetSize * targetSize;
  const predictions = [];
  const totalCells = cells.length;

  // Get model input name
  const inputName = session.inputNames[0];

  for (let i = 0; i < totalCells; i += batchSize) {
    const batchCells = cells.slice(i, Math.min(i + batchSize, totalCells));
    const actualBatchSize = batchCells.length;

    // Build batched input tensor
    const batchData = new Float32Array(actualBatchSize * channelSize);
    for (let j = 0; j < actualBatchSize; j++) {
      const cellData = preprocessCell(batchCells[j], targetSize);
      batchData.set(cellData, j * channelSize);
    }

    const inputTensor = new ort.Tensor('float32', batchData, [actualBatchSize, 3, targetSize, targetSize]);

    // Run inference
    const results = await session.run({ [inputName]: inputTensor });
    const outputTensor = results[session.outputNames[0]];
    const outputData = outputTensor.data;
    const numClasses = outputData.length / actualBatchSize;

    // Process each cell's output
    for (let j = 0; j < actualBatchSize; j++) {
      const logits = Array.from(outputData.slice(j * numClasses, (j + 1) * numClasses));
      const probs = softmax(logits);
      const maxIdx = probs.indexOf(Math.max(...probs));
      const confidence = probs[maxIdx];

      const classInfo = classMapping[String(maxIdx)];
      const stitchType = classInfo ? classInfo.stitchType : 'unknown';

      predictions.push({ stitchType, confidence });
    }

    // Report progress
    const completed = Math.min(i + batchSize, totalCells);
    self.postMessage({ type: 'progress', completed, total: totalCells });
  }

  return predictions;
}

// Message handler
self.onmessage = async (e) => {
  const { type } = e.data;

  try {
    if (type === 'init') {
      await init(e.data.modelUrl, e.data.classesUrl);
      self.postMessage({ type: 'init-complete' });
    } else if (type === 'classify') {
      const predictions = await classifyCells(e.data.cells, e.data.batchSize || 64);
      self.postMessage({ type: 'result', predictions });
    }
  } catch (err) {
    const errorType = type === 'init' ? 'init-error' : 'error';
    self.postMessage({ type: errorType, error: err.message || String(err) });
  }
};
