/**
 * Perceptual image hashing utilities.
 * Pure functions — no OpenCV or DOM dependency.
 * Operates on { width, height, data: Uint8ClampedArray } (RGBA pixel data).
 */

/**
 * Compute an average hash (aHash) for an image.
 * Binarizes to black/white first (removes gray/brightness noise),
 * then downsamples to 8×8, computes mean, returns 64-bit hash as BigInt.
 *
 * @param {{ width: number, height: number, data: Uint8ClampedArray }} image - RGBA pixel data
 * @returns {bigint} 64-bit perceptual hash
 */
export function averageHash(image) {
  const { width, height, data } = image;
  const SIZE = 8;

  // Downsample to 8×8 grayscale using nearest-neighbor, with binarization.
  // Binarization strips brightness/shade variation so the hash captures
  // only the shape of the symbol (black lines on white background).
  const pixels = new Float64Array(SIZE * SIZE);
  const scaleX = width / SIZE;
  const scaleY = height / SIZE;
  const BINARIZE_THRESHOLD = 128;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const srcX = Math.min(Math.floor(x * scaleX), width - 1);
      const srcY = Math.min(Math.floor(y * scaleY), height - 1);
      const idx = (srcY * width + srcX) * 4;

      // Convert to grayscale then binarize
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      pixels[y * SIZE + x] = gray >= BINARIZE_THRESHOLD ? 255 : 0;
    }
  }

  // Compute mean
  let sum = 0;
  for (let i = 0; i < pixels.length; i++) {
    sum += pixels[i];
  }
  const mean = sum / pixels.length;

  // Build hash: each bit = 1 if pixel > mean
  let hash = 0n;
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] > mean) {
      hash |= 1n << BigInt(i);
    }
  }

  return hash;
}

/**
 * Compute hamming distance between two 64-bit hashes.
 *
 * @param {bigint} a
 * @param {bigint} b
 * @returns {number} Number of differing bits (0-64)
 */
export function hammingDistance(a, b) {
  let xor = a ^ b;
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

/**
 * Group items by perceptual hash similarity.
 * Items within `maxDistance` hamming distance are placed in the same group.
 * Uses a greedy approach: each item joins the first group whose representative
 * hash is within the threshold.
 *
 * @param {{ hash: bigint, [key: string]: any }[]} items - Items with computed hashes
 * @param {number} maxDistance - Maximum hamming distance to consider similar (default 5)
 * @returns {{ representative: bigint, items: any[] }[]} Array of groups
 */
export function groupBySimilarity(items, maxDistance = 5) {
  const groups = [];

  for (const item of items) {
    let matched = false;

    for (const group of groups) {
      if (hammingDistance(item.hash, group.representative) <= maxDistance) {
        group.items.push(item);
        matched = true;
        break;
      }
    }

    if (!matched) {
      groups.push({
        representative: item.hash,
        items: [item],
      });
    }
  }

  return groups;
}
