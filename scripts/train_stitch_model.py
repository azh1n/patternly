#!/usr/bin/env python3
"""
Train a YOLOv8n-cls stitch classification model and export to ONNX.

Usage:
    pip install ultralytics
    python scripts/train_stitch_model.py

Dataset: ~/Documents/patternly/crochet-classification-2.folder.zip
Output:  vue-project/public/models/stitch-classifier.onnx
         vue-project/public/models/stitch-classes.json
"""

import json
import os
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

# Dataset folder name → app stitch abbreviation
CLASS_NAME_MAP = {
    "chain": "ch",
    "dc": "dc",
    "dc-dec": "dcdec",
    "dc-inc": "dcinc",
    "dtr": "dtr",
    "front-post-dc": "fpdc",
    "hdc": "hdc",
    "hdc-dec": "hdcdec",
    "hdc-inc": "hdcinc",
    "sc": "sc",
    "sc-dec": "scdec",
    "sc-inc": "scinc",
    "slip-stitch": "sl",
    "tr": "tr",
}

# Paths
DATASET_ZIP = Path.home() / "Documents" / "patternly" / "crochet-classification-2.folder.zip"
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
OUTPUT_DIR = REPO_ROOT / "vue-project" / "public" / "models"


def extract_and_split_dataset(zip_path, dest_dir, val_ratio=0.2):
    """Extract the zip and create a train/val split (the export has no val set)."""
    import random

    print(f"Extracting dataset from {zip_path}...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest_dir)

    train_dir = Path(dest_dir) / "train"
    val_dir = Path(dest_dir) / "val"
    val_dir.mkdir(exist_ok=True)

    if not train_dir.exists():
        print(f"ERROR: Expected train/ directory in {dest_dir}")
        sys.exit(1)

    # Split each class
    random.seed(42)
    total_train = 0
    total_val = 0

    for class_dir in sorted(train_dir.iterdir()):
        if not class_dir.is_dir():
            continue

        images = sorted([f for f in class_dir.iterdir() if f.is_file()])
        random.shuffle(images)

        n_val = max(1, int(len(images) * val_ratio))
        val_images = images[:n_val]
        train_images = images[n_val:]

        # Create val class directory and move images
        val_class_dir = val_dir / class_dir.name
        val_class_dir.mkdir(exist_ok=True)

        for img in val_images:
            shutil.move(str(img), str(val_class_dir / img.name))

        total_train += len(train_images)
        total_val += len(val_images)
        print(f"  {class_dir.name}: {len(train_images)} train, {len(val_images)} val")

    print(f"Total: {total_train} train, {total_val} val")
    return str(dest_dir)


def train_model(dataset_path):
    """Train YOLOv8n-cls and return the trained model."""
    try:
        from ultralytics import YOLO
    except ImportError:
        print("ERROR: ultralytics not installed. Run: pip install ultralytics")
        sys.exit(1)

    print("\nLoading YOLOv8n-cls base model...")
    model = YOLO("yolov8n-cls.pt")

    print("Starting training...")
    model.train(
        data=dataset_path,
        epochs=50,
        imgsz=64,
        batch=64,
        patience=10,
        project=str(SCRIPT_DIR / "stitch-model"),
        name="v1",
        exist_ok=True,
        verbose=True,
    )

    return model


def validate_model(model):
    """Run validation and print metrics."""
    print("\nRunning validation...")
    metrics = model.val()
    top1 = metrics.top1
    top5 = metrics.top5
    print(f"\n{'='*40}")
    print(f"Top-1 accuracy: {top1:.4f} ({top1*100:.1f}%)")
    print(f"Top-5 accuracy: {top5:.4f} ({top5*100:.1f}%)")
    print(f"{'='*40}")

    if top1 < 0.8:
        print("WARNING: Top-1 accuracy below 80%. Model may need more data or tuning.")
    elif top1 >= 0.9:
        print("Model accuracy is good (>90%).")
    else:
        print("Model accuracy is usable (>80%). Legend-based correction will handle the rest.")

    return top1, top5


def export_onnx(model):
    """Export model to ONNX format."""
    print("\nExporting to ONNX...")
    model.export(format="onnx", imgsz=64, simplify=True)

    # Find the exported file
    best_pt = Path(model.trainer.best) if hasattr(model, "trainer") else None
    if best_pt and best_pt.exists():
        onnx_path = best_pt.with_suffix(".onnx")
    else:
        # Search for it
        model_dir = SCRIPT_DIR / "stitch-model" / "v1" / "weights"
        onnx_path = model_dir / "best.onnx"

    if not onnx_path.exists():
        print(f"ERROR: ONNX file not found at {onnx_path}")
        sys.exit(1)

    print(f"ONNX model exported: {onnx_path} ({onnx_path.stat().st_size / 1024:.0f} KB)")
    return onnx_path


def save_class_names(model, output_dir):
    """Save the class names mapping as JSON."""
    # Get class names from the trained model (in training order)
    if hasattr(model, "names"):
        model_names = model.names  # dict: {0: 'chain', 1: 'dc', ...}
    elif hasattr(model, "trainer") and hasattr(model.trainer, "data"):
        model_names = model.trainer.data.get("names", {})
    else:
        print("WARNING: Could not extract class names from model, using sorted CLASS_NAME_MAP keys")
        model_names = {i: name for i, name in enumerate(sorted(CLASS_NAME_MAP.keys()))}

    # Build the mapping: model output index → app abbreviation
    class_mapping = {}
    for idx in sorted(model_names.keys()):
        dataset_name = model_names[idx]
        app_name = CLASS_NAME_MAP.get(dataset_name)
        if app_name is None:
            print(f"WARNING: Dataset class '{dataset_name}' has no mapping to app abbreviation")
            app_name = dataset_name
        class_mapping[str(idx)] = {
            "datasetName": dataset_name,
            "stitchType": app_name,
        }

    # Save as JSON
    output_path = output_dir / "stitch-classes.json"
    with open(output_path, "w") as f:
        json.dump(class_mapping, f, indent=2)

    print(f"Class names saved: {output_path}")
    print(f"  Classes ({len(class_mapping)}): {', '.join(v['stitchType'] for v in class_mapping.values())}")
    return output_path


def copy_to_app(onnx_path, output_dir):
    """Copy model to vue-project/public/models/."""
    output_dir.mkdir(parents=True, exist_ok=True)
    dest = output_dir / "stitch-classifier.onnx"
    shutil.copy2(str(onnx_path), str(dest))
    print(f"Model copied to: {dest}")
    return dest


def main():
    # Check dataset exists
    if not DATASET_ZIP.exists():
        print(f"ERROR: Dataset not found at {DATASET_ZIP}")
        sys.exit(1)

    # Extract and split
    with tempfile.TemporaryDirectory(prefix="stitch-train-") as tmp_dir:
        dataset_path = extract_and_split_dataset(DATASET_ZIP, tmp_dir)

        # Train
        model = train_model(dataset_path)

        # Validate
        top1, top5 = validate_model(model)

        # Export
        onnx_path = export_onnx(model)

        # Save class names
        save_class_names(model, OUTPUT_DIR)

        # Copy model to app
        copy_to_app(onnx_path, OUTPUT_DIR)

    print(f"\nDone! Model and class names are in {OUTPUT_DIR}")
    print("Next: npm install onnxruntime-web && npm run build")


if __name__ == "__main__":
    main()
