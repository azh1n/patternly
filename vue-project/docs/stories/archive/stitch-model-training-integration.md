# Story: Stitch Classification Model — Training & App Integration

**Status:** Done
**Priority:** High
**Depends on:** Roboflow dataset downloaded (done), Chart Starting Point Selection (done)
**Blocks:** Stitch Classification & Pattern Assembly

---

## Problem

We have a Roboflow-annotated dataset of crochet stitch symbols ready to train. We need to train a classification model, export it to a browser-compatible format, and integrate it into the app so cells extracted from chart images can be classified into stitch types — entirely client-side, no API calls, no ongoing cost.

---

## What Was Built

### Training

- **Model:** YOLOv8n-cls (nano classification) trained locally on Apple M4 Pro CPU
- **Dataset:** 14 classes × 200 images = 2,800 total, split 80/20 train/val
- **Training:** 19 epochs (early stopping at patience 10), ~3 minutes
- **Results:** Top-1 accuracy **96.8%**, Top-5 **100%**
- **Export:** ONNX with dynamic batch size (`dynamic=True`), 5.6MB
- **Script:** `scripts/train_stitch_model.py` — standalone Python script, not deployed

### 14 Classes (all map 1:1 to existing app stitch symbols)

| Dataset class | App abbreviation | Symbol file |
|--------------|-----------------|-------------|
| chain | ch | chain.svg |
| sc | sc | sc.svg |
| hdc | hdc | hdc.svg |
| dc | dc | dc.svg |
| tr | tr | tr.svg |
| dtr | dtr | dtr.svg |
| slip-stitch | sl | slip-stitch.svg |
| sc-inc | scinc | sc-inc.svg |
| sc-dec | scdec | sc-dec.svg |
| hdc-inc | hdcinc | hdc-inc.svg |
| hdc-dec | hdcdec | hdc-dec.svg |
| dc-inc | dcinc | dc-inc.svg |
| dc-dec | dcdec | dc-dec.svg |
| front-post-dc | fpdc | front-post-dc.svg |

### App Integration

- **`onnxruntime-web`** added as dependency, Vite configured (assetsInclude .onnx, optimizeDeps exclude, WASM files copied via vite-plugin-static-copy)
- **`services/stitchClassificationService.js`** — composable: lazy model load, batched inference via Web Worker, progress callback, confidence threshold (0.5)
- **`workers/classificationWorker.js`** — Web Worker: loads ONNX model, preprocesses cells (resize to 64×64, normalize, CHW format), runs batched inference (batch size 64), softmax + argmax postprocessing
- **`chartProcessingService.js`** — modified to convert `cv.Mat` cells to plain RGBA pixel data (`{ width, height, data: Uint8ClampedArray }`) for worker serialization
- **`FileUploader.vue`** — classification runs after direction selection, non-fatal (emits without predictions if it fails)

### Performance

- Batched inference (64 cells per batch) via WASM Web Worker
- UI remains responsive during classification
- ~4,400 cells classified in seconds (vs minutes with naive per-cell approach)

### Security

- ONNX model is a static file of learned weights — no secrets, no user data, no API keys
- Inference runs entirely client-side via WASM (sandboxed in browser)
- Training dataset stays local — never committed to repo
- Model + class names are safe public static assets

---

## Files Changed

| File | Action |
|------|--------|
| `scripts/train_stitch_model.py` | NEW — local Python training script (not deployed) |
| `public/models/stitch-classifier.onnx` | NEW — trained ONNX model with dynamic batch (5.6MB static asset) |
| `public/models/stitch-classes.json` | NEW — class index → { datasetName, stitchType } mapping |
| `src/services/stitchClassificationService.js` | NEW — composable: lazy model load, batched classification, progress, confidence threshold |
| `src/workers/classificationWorker.js` | NEW — Web Worker: ONNX inference off main thread |
| `src/services/chartProcessingService.js` | MODIFY — convert cv.Mat cells to RGBA pixel data for worker serialization |
| `vite.config.js` | MODIFY — assetsInclude .onnx, exclude onnxruntime-web from optimizeDeps, static-copy WASM files |
| `package.json` | MODIFY — add onnxruntime-web dependency |
| `src/components/FileUploader.vue` | MODIFY — call classification after direction selection, show progress |

---

## Acceptance Criteria

### Training
- [x] YOLOv8n-cls model trained on stitch dataset (96.8% top-1 accuracy)
- [x] Dataset auto-split into train/val (80/20)
- [x] Model exported to ONNX format with dynamic batch size
- [x] Class names mapping saved alongside model
- [x] Model + class names copied to `vue-project/public/models/`

### Integration
- [x] `onnxruntime-web` installed and Vite configured (ONNX assets + WASM files)
- [x] ONNX model loads in browser (lazy, cached after first load)
- [x] Classification service converts cell images to batched tensors (batch size 64)
- [x] Batched inference returns stitchType + confidence per cell
- [x] Progress callback reports batch progress
- [x] Cells below confidence threshold marked as "unknown"
- [x] Inference runs in a Web Worker (UI stays responsive)
- [x] Classification wired into FileUploader after direction selection
- [x] Model file deploys with `firebase deploy` as static asset
