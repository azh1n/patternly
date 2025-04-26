<template>
  <div class="crochet-3d-view">
    <div class="view-header">
      <h4>3D Crochet Visualization</h4>
      <div class="view-controls">
        <button 
          @click="toggleRotation" 
          :class="{ active: autoRotate }"
          title="Toggle auto-rotation"
        >
          <span v-if="autoRotate">Stop Rotation</span>
          <span v-else>Auto Rotate</span>
        </button>
        <button 
          @click="resetCamera" 
          title="Reset camera position"
        >
          Reset View
        </button>
      </div>
    </div>
    
    <div class="render-container" ref="container"></div>
    
    <div class="row-controls">
      <button 
        @click="showAllRows = !showAllRows" 
        :class="{ active: showAllRows }"
        title="Toggle between showing all rows or just the current row"
      >
        {{ showAllRows ? 'Show Current Row' : 'Show All Rows' }}
      </button>
      
      <div v-if="!showAllRows" class="row-selector">
        <button 
          @click="previousRow" 
          :disabled="activeRowIndex <= 0"
          title="Previous row"
        >
          &lt;
        </button>
        <span class="row-indicator">Row {{ activeRow?.number || 1 }}</span>
        <button 
          @click="nextRow" 
          :disabled="activeRowIndex >= rows.length - 1"
          title="Next row"
        >
          &gt;
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const props = defineProps({
  rows: {
    type: Array,
    required: true
  }
});

// Refs
const container = ref(null);
const activeRowIndex = ref(0);
const showAllRows = ref(true);
const autoRotate = ref(true);

// Three.js objects
let scene, camera, renderer, controls;
let stitchObjects = [];

// Computed
const activeRow = computed(() => {
  return props.rows[activeRowIndex.value] || null;
});

// Methods
const initThreeJs = () => {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);
  
  // Create camera
  camera = new THREE.PerspectiveCamera(
    75, 
    container.value.clientWidth / container.value.clientHeight, 
    0.1, 
    1000
  );
  camera.position.set(0, 8, 12); // Position camera to look down at the circle
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.value.clientWidth, container.value.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.value.appendChild(renderer.domElement);
  
  // Add controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = autoRotate.value;
  controls.autoRotateSpeed = 1.0;
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);
  
  // Add a second light from another angle for better illumination
  const secondLight = new THREE.DirectionalLight(0xffffff, 0.4);
  secondLight.position.set(-5, 8, -7);
  scene.add(secondLight);
  
  // Add another directional light from below
  const bottomLight = new THREE.DirectionalLight(0xffffff, 0.3);
  bottomLight.position.set(-1, -1, 1);
  scene.add(bottomLight);
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  
  // Start animation loop
  animate();
};

const onWindowResize = () => {
  if (!container.value) return;
  
  camera.aspect = container.value.clientWidth / container.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.value.clientWidth, container.value.clientHeight);
};

const animate = () => {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};

const renderRows = () => {
  // Clear previous stitches
  stitchObjects.forEach(obj => scene.remove(obj));
  stitchObjects = [];
  
  // Determine which rows to render
  const rowsToRender = showAllRows.value ? props.rows : [props.rows[activeRowIndex.value]].filter(Boolean);
  
  // Calculate row radii - we'll use a fixed radius for all rows to create a perfect circle
  const radii = calculateRowRadii(rowsToRender);
  
  rowsToRender.forEach((row, rowIndex) => {
    if (!row || !row.stitches) return;
    
    // Use the fixed radius for this row
    const rowRadius = radii[rowIndex];
    // Use consistent height spacing for a clean circular look
    const rowHeight = rowIndex * 0.25;
    const stitches = getExpandedStitches(row);
    
    if (!stitches.length) return;
    
    // Create stitches for this row
    stitches.forEach((stitch, stitchIndex) => {
      const totalStitches = stitches.length;
      const angle = (stitchIndex / totalStitches) * Math.PI * 2;
      
      // Calculate position on the circle
      const x = rowRadius * Math.cos(angle);
      const y = rowHeight;
      const z = rowRadius * Math.sin(angle);
      
      // Create stitch mesh
      const mesh = createStitchMesh(stitch, rowIndex);
      mesh.position.set(x, y, z);
      
      // Rotate stitch to face outward from the center
      mesh.lookAt(new THREE.Vector3(x * 1.5, y, z * 1.5));
      
      scene.add(mesh);
      stitchObjects.push(mesh);
    });
  });
};

const getExpandedStitches = (row) => {
  if (!row.stitches) return [];
  
  // Handle repeated stitches
  if (row.stitches.repeated) {
    const beforeRepeat = row.stitches.beforeRepeat || [];
    const repeatedStitches = row.stitches.repeatedStitches || [];
    const afterRepeat = row.stitches.afterRepeat || [];
    const repeatCount = row.stitches.repeatCount || 1;
    
    // Expand the repeated section
    let expanded = [...beforeRepeat];
    for (let i = 0; i < repeatCount; i++) {
      expanded = expanded.concat([...repeatedStitches]);
    }
    expanded = expanded.concat([...afterRepeat]);
    
    return expanded;
  }
  
  // Regular array of stitches
  if (Array.isArray(row.stitches)) {
    return row.stitches;
  }
  
  return [];
};

const createStitchMesh = (stitch, rowIndex) => {
  // Extract stitch type and count
  const match = stitch.match(/^(\d+)?([a-zA-Z]+)/);
  const count = match && match[1] ? parseInt(match[1]) : 1;
  const type = match && match[2] ? match[2].toLowerCase() : stitch.toLowerCase();
  
  // Determine stitch color based on type
  const color = getStitchColor(type);
  
  // Create stitch mesh - use smaller stitches for a cleaner look
  const geometry = new THREE.SphereGeometry(0.15, 16, 16);
  const material = new THREE.MeshPhongMaterial({ 
    color,
    shininess: 70,
    specular: 0x111111
  });
  const mesh = new THREE.Mesh(geometry, material);
  
  // Scale mesh based on stitch type
  if (type === 'inc' || type.includes('inc')) {
    mesh.scale.set(mesh.scale.x * 1.3, mesh.scale.y * 1.3, mesh.scale.z * 1.3);
    material.color.set(0x00FF00); // Bright green for increases
  } else if (type === 'dec' || type.includes('dec')) {
    mesh.scale.set(mesh.scale.x * 1.2, mesh.scale.y * 1.2, mesh.scale.z * 1.2);
    material.color.set(0xFF3D00); // Orange-red for decreases
  }
  
  return mesh;
};

const calculateRowRadii = (rows) => {
  // Use a fixed radius for all rows to create a perfect circle
  const fixedRadius = 5;
  return Array(rows.length).fill(fixedRadius);
};

const getStitchColor = (type) => {
  const colors = {
    'sc': 0x4CAF50,  // Green
    'dc': 0x2196F3,  // Blue
    'hdc': 0x03A9F4, // Light Blue
    'tr': 0x9C27B0,  // Purple
    'dtr': 0x673AB7, // Deep Purple
    'ch': 0xFF9800,  // Orange
    'sl': 0x795548,  // Brown
    'inc': 0x8BC34A, // Light Green
    'dec': 0xF44336, // Red
    'ns': 0x9E9E9E   // Grey
  };
  
  return colors[type] || 0xCCCCCC;
};

const toggleRotation = () => {
  autoRotate.value = !autoRotate.value;
  if (controls) {
    controls.autoRotate = autoRotate.value;
  }
};

const resetCamera = () => {
  if (camera && controls) {
    camera.position.set(0, 8, 12);
    controls.target.set(0, 0, 0);
    controls.update();
  }
};

const previousRow = () => {
  if (activeRowIndex.value > 0) {
    activeRowIndex.value--;
    renderRows();
  }
};

const nextRow = () => {
  if (activeRowIndex.value < props.rows.length - 1) {
    activeRowIndex.value++;
    renderRows();
  }
};

// Watchers
watch(() => props.rows, () => {
  if (scene) renderRows();
}, { deep: true });

watch(showAllRows, () => {
  if (scene) renderRows();
});

watch(activeRowIndex, () => {
  if (!showAllRows.value && scene) renderRows();
});

// Lifecycle hooks
onMounted(() => {
  if (container.value) {
    initThreeJs();
    renderRows();
  }
});

onBeforeUnmount(() => {
  if (renderer) {
    renderer.dispose();
    container.value?.removeChild(renderer.domElement);
  }
  
  window.removeEventListener('resize', onWindowResize);
  
  // Clean up Three.js resources
  stitchObjects.forEach(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
});
</script>

<style scoped>
.crochet-3d-view {
  display: flex;
  flex-direction: column;
  background: var(--card-bg, #2a2a2a);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color, #444);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color, #444);
}

.view-header h4 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary, #fff);
}

.view-controls {
  display: flex;
  gap: 0.5rem;
}

.view-controls button {
  background: var(--button-bg, #333);
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, #444);
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-controls button:hover {
  background: var(--button-hover-bg, #444);
}

.view-controls button.active {
  background: var(--accent-color, #4CAF50);
  border-color: var(--accent-color, #4CAF50);
}

.render-container {
  width: 100%;
  height: 400px;
  position: relative;
}

.row-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid var(--border-color, #444);
}

.row-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.row-selector button {
  background: var(--button-bg, #333);
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, #444);
  width: 30px;
  height: 30px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.row-selector button:hover:not(:disabled) {
  background: var(--button-hover-bg, #444);
}

.row-selector button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.row-indicator {
  font-size: 0.875rem;
  color: var(--text-primary, #fff);
  padding: 0 0.5rem;
}

/* Light theme overrides */
:root.light .crochet-3d-view {
  background: #ffffff;
  border-color: #e0e0e0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

:root.light .view-header {
  border-bottom-color: #e0e0e0;
}

:root.light .view-header h4 {
  color: #333;
}

:root.light .view-controls button {
  background: #f5f5f5;
  color: #333;
  border-color: #e0e0e0;
}

:root.light .view-controls button:hover {
  background: #e0e0e0;
}

:root.light .view-controls button.active {
  background: #2979ff;
  border-color: #2979ff;
  color: white;
}

:root.light .row-controls {
  border-top-color: #e0e0e0;
}

:root.light .row-selector button {
  background: #f5f5f5;
  color: #333;
  border-color: #e0e0e0;
}

:root.light .row-selector button:hover:not(:disabled) {
  background: #e0e0e0;
}

:root.light .row-indicator {
  color: #333;
}
</style>
