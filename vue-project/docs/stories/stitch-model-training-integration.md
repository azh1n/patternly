# Story: Stitch Classification Model — Training & App Integration

**Status:** Not Started
**Priority:** High
**Depends on:** Roboflow dataset downloaded (done)
**Blocks:** Stitch Classification & Pattern Assembly

---

## Problem

We have a Roboflow-annotated dataset of crochet stitch symbols ready to train. We need to train a classification model, export it to a browser-compatible format, and integrate it into the app so cells extracted from chart images can be classified into stitch types — entirely client-side, no API calls, no ongoing cost.

---

## Architecture

```
Training (one-time, local)
  ├─ ultralytics YOLOv8n-cls trained on exported dataset
  └─ Export to ONNX format → single .onnx file

App integration (runs in user's browser)
  ├─ .onnx file served as static asset from public/models/
  ├─ onnxruntime-web loads model on first use (cached by browser)
  ├─ stitchClassificationService.js converts cell cv.Mat → tensor → prediction
  └─ No backend, no API calls, no Firebase Functions
```

No Firestore functions or server-side code needed. The model is a static file (~2-5MB) served by Firebase Hosting alongside the rest of the app, like an image or font.

---

## Phase 1: Train the Model Locally

**Prerequisites:** Python 3.8+, pip

```bash
pip install ultralytics
```

**Training:**
```python
from ultralytics import YOLO

# Load nano classification base model (smallest, fastest)
model = YOLO("yolov8n-cls.pt")

# Train on the exported Roboflow dataset
# Dataset should be in folder structure: dataset/train/{class_name}/*.png
model.train(
    data="path/to/dataset",
    epochs=50,
    imgsz=32,          # Match cell size (~17x19, padded to 32)
    batch=64,
    patience=10,        # Early stopping
    project="stitch-model",
    name="v1"
)
```

**Validation:**
```python
# Check accuracy on validation set
metrics = model.val()
print(f"Top-1 accuracy: {metrics.top1}")
print(f"Top-5 accuracy: {metrics.top5}")
```

**Goal:** Top-1 accuracy > 80% is usable (legend-based correction handles the rest). > 90% is good.

Can also train on Google Colab (free GPU) if local training is too slow.

---

## Phase 2: Export to ONNX

```python
from ultralytics import YOLO

model = YOLO("stitch-model/v1/weights/best.pt")
model.export(format="onnx", imgsz=32, simplify=True)
# Produces: stitch-model/v1/weights/best.onnx
```

Copy the `.onnx` file to the app:
```bash
cp stitch-model/v1/weights/best.onnx vue-project/public/models/stitch-classifier.onnx
```

Also save the class names list (order matters — must match model output indices):
```bash
# From the dataset's class order during training
# e.g., ["ch", "dc", "dec", "dtr", "hdc", "inc", "sc", "sl", "tr"]
# Save as JSON alongside the model
echo '["ch","dc","dec","dtr","hdc","inc","sc","sl","tr"]' > vue-project/public/models/stitch-classes.json
```

---

## Phase 3: App Dependencies

```bash
cd vue-project
npm install onnxruntime-web
```

**Vite config changes** (`vite.config.js`):
```js
export default defineConfig({
  // ... existing config
  assetsInclude: ['**/*.onnx'],
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  }
})
```

**WASM files:** `onnxruntime-web` needs `.wasm` files accessible at runtime. These are in `node_modules/onnxruntime-web/dist/`. Options:
- Use `vite-plugin-static-copy` (already a devDependency) to copy them to `public/`
- Or configure Vite to serve them from `node_modules` during dev

---

## Phase 4: Classification Service

**New file:** `src/services/stitchClassificationService.js`

Responsibilities:
- Load the ONNX model (lazy, cached after first load)
- Load the class names JSON
- Convert a cell image (cv.Mat or canvas) to the input tensor format
- Run inference, return `{ stitchType, confidence }` per cell
- Batch classify an array of cells with progress callback

**Input:** `cv.Mat` (from `extractGridCells`) or canvas `ImageData`
**Output:** `{ stitchType: "sc", confidence: 0.92 }`

**Preprocessing per cell:**
1. Convert cv.Mat to canvas (or use existing pixel data)
2. Resize to model input size (32x32)
3. Normalize pixel values to 0-1
4. Reshape to `[1, 3, 32, 32]` (batch, channels, height, width)
5. Create `ort.Tensor`

**Postprocessing:**
1. Model outputs raw logits (array of floats, one per class)
2. Apply softmax to get probabilities
3. Find argmax → index into class names array
4. Return class name + probability as confidence

---

## Phase 5: Hook Into the App Flow

**Where it connects** — after `confirmGridLines()` returns cells, before `processing-complete` is emitted:

```
User confirms grid lines
  → confirmGridLines() returns { gridCells, gridDimensions }
  → [NEW] classifyCells(gridCells) runs inference on each cell
  → Each cell gets { stitchType, confidence } attached
  → Results passed to stitch confirmation UI (separate story)
```

**Files modified:**
- `FileUploader.vue` — call classification service in `onGridConfirm` after cells are extracted
- `chartProcessingService.js` — no changes (cell extraction stays as-is)

**No backend changes.** No Firestore rules changes. No Firebase Functions. The model file deploys with `firebase deploy` as part of the static assets in `vue-project/dist`.

---

## File Structure After Integration

```
vue-project/
├── public/
│   └── models/
│       ├── stitch-classifier.onnx    # Trained model (~2-5MB)
│       └── stitch-classes.json        # Class name mapping
├── src/
│   └── services/
│       └── stitchClassificationService.js  # NEW
└── vite.config.js                     # MODIFIED (onnx + wasm config)
```

---

## Files Changed

| File | Action |
|------|--------|
| `public/models/stitch-classifier.onnx` | NEW — trained ONNX model (static asset) |
| `public/models/stitch-classes.json` | NEW — class names array |
| `src/services/stitchClassificationService.js` | NEW — model loading, inference, batch classification |
| `vite.config.js` | MODIFY — add assetsInclude for .onnx, exclude onnxruntime-web from optimizeDeps |
| `package.json` | MODIFY — add onnxruntime-web dependency |
| `src/components/FileUploader.vue` | MODIFY — call classification after grid confirmation |

---

## Acceptance Criteria

### Training
- [ ] YOLOv8n-cls model trained on stitch dataset
- [ ] Top-1 validation accuracy documented
- [ ] Model exported to ONNX format
- [ ] Class names list saved alongside model

### Integration
- [ ] `onnxruntime-web` installed and Vite configured
- [ ] ONNX model loads in browser (lazy, cached)
- [ ] Classification service converts cell images to tensors
- [ ] Inference returns stitchType + confidence per cell
- [ ] Batch classification with progress callback
- [ ] Cells below confidence threshold marked as "unknown"
- [ ] Classification wired into FileUploader after grid confirmation
- [ ] Model file deploys with `firebase deploy` as static asset

### Performance
- [ ] Model loads in < 3 seconds on first page visit
- [ ] Per-cell inference < 50ms
- [ ] Full chart (2500 cells) classified in < 30 seconds

---

## Notes

- **Model versioning:** When retraining, bump the filename (e.g., `stitch-classifier-v2.onnx`) to bust browser cache
- **Model size:** YOLOv8n-cls ONNX is typically 2-5MB — acceptable for a web app
- **Fallback:** If model fails to load (network error, unsupported browser), show a message asking the user to manually classify via the legend UI
- **Future:** If classification accuracy is insufficient with YOLOv8n-cls, can upgrade to YOLOv8s-cls (small) or YOLOv8m-cls (medium) — same ONNX export process, just larger model file
