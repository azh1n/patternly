import { ref } from 'vue';

// Load OpenCV.js dynamically
const loadOpenCV = () => {
  return new Promise((resolve) => {
    if (window.cv) {
      resolve(window.cv);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.5.5/opencv.js';
    script.async = true;
    script.onload = () => {
      // Wait for OpenCV to be ready
      const checkCV = setInterval(() => {
        if (window.cv) {
          clearInterval(checkCV);
          resolve(window.cv);
        }
      }, 100);
    };
    document.head.appendChild(script);
  });
};

export function useChartProcessing() {
  const progress = ref(0);
  const progressMessage = ref('');
  const isProcessing = ref(false);
  const error = ref(null);
  let cv = null;

  // Initialize OpenCV
  const initialize = async () => {
    if (cv) return true;
    
    try {
      progressMessage.value = 'Loading image processing engine...';
      cv = await loadOpenCV();
      progress.value = 20;
      return true;
    } catch (err) {
      console.error('Failed to load OpenCV:', err);
      error.value = 'Failed to load image processing engine';
      return false;
    }
  };

  // Process knitting chart image
  const processChart = async (imageElement) => {
    isProcessing.value = true;
    progress.value = 0;
    error.value = null;
    
    try {
      // Initialize OpenCV if not already done
      if (!(await initialize())) {
        throw new Error('Could not initialize image processing');
      }
      
      progress.value = 30;
      progressMessage.value = 'Processing chart image...';
      
      // Create a canvas to work with the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      ctx.drawImage(imageElement, 0, 0);
      
      // Convert to OpenCV format
      const src = cv.imread(canvas);
      const dst = new cv.Mat();
      
      // Convert to grayscale
      cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
      
      // Apply thresholding
      const threshold = new cv.Mat();
      cv.threshold(dst, threshold, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      
      // Find contours
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(threshold, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
      
      // Process contours to find grid cells (stitches)
      const gridCells = [];
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        
        // Filter contours by area to find stitch cells
        if (area > 50 && area < 10000) { // Adjust these values based on your chart
          const moments = cv.moments(contour, false);
          const cx = moments.m10 / moments.m00;
          const cy = moments.m01 / moments.m00;
          
          gridCells.push({
            x: cx,
            y: cy,
            area: area,
            contour: contour
          });
        }
      }
      
      // Sort cells into grid structure
      const sortedCells = sortCellsIntoGrid(gridCells);
      
      // Clean up
      src.delete();
      dst.delete();
      threshold.delete();
      contours.delete();
      hierarchy.delete();
      
      progress.value = 80;
      progressMessage.value = 'Identifying stitches...';
      
      // Process each cell with Roboflow (to be implemented)
      const processedCells = await processCellsWithRoboflow(canvas, sortedCells);
      
      progress.value = 100;
      progressMessage.value = 'Processing complete!';
      
      return {
        originalImage: canvas.toDataURL('image/png'),
        processedCells: processedCells,
        grid: sortedCells
      };
      
    } catch (err) {
      console.error('Error processing chart:', err);
      error.value = err.message || 'Failed to process chart';
      throw err;
    } finally {
      isProcessing.value = false;
    }
  };
  
  // Sort detected cells into a grid structure
  const sortCellsIntoGrid = (cells) => {
    if (cells.length === 0) return [];
    
    // Sort by y-coordinate first, then by x-coordinate
    const sorted = [...cells].sort((a, b) => {
      if (Math.abs(a.y - b.y) < 10) { // If y-coordinates are close, consider them in the same row
        return a.x - b.x;
      }
      return a.y - b.y;
    });
    
    // Group into rows
    const rows = [];
    let currentRow = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const cell = sorted[i];
      const lastCell = currentRow[currentRow.length - 1];
      
      // If y-coordinates are close, add to current row
      if (Math.abs(cell.y - lastCell.y) < 10) {
        currentRow.push(cell);
      } else {
        // Sort current row by x-coordinate
        currentRow.sort((a, b) => a.x - b.x);
        rows.push([...currentRow]);
        currentRow = [cell];
      }
    }
    
    // Add the last row
    if (currentRow.length > 0) {
      currentRow.sort((a, b) => a.x - b.x);
      rows.push(currentRow);
    }
    
    return rows;
  };
  
  // Process cells with Roboflow model
  const processCellsWithRoboflow = async (canvas, grid) => {
    // This function will be implemented to call the Roboflow API
    // For now, we'll return mock data
    const processedGrid = [];
    
    for (let row = 0; row < grid.length; row++) {
      const processedRow = [];
      
      for (let col = 0; col < grid[row].length; col++) {
        const cell = grid[row][col];
        
        // In a real implementation, we would:
        // 1. Extract the cell image
        // 2. Send to Roboflow API
        // 3. Get the stitch type
        
        // Mock response
        const stitchTypes = ['sc', 'dc', 'hdc', 'ch', 'sl', 'inc', 'dec'];
        const randomStitch = stitchTypes[Math.floor(Math.random() * stitchTypes.length)];
        
        processedRow.push({
          ...cell,
          stitchType: randomStitch,
          confidence: Math.random() * 0.5 + 0.5 // Random confidence between 0.5 and 1.0
        });
      }
      
      processedGrid.push(processedRow);
    }
    
    return processedGrid;
  };
  
  return {
    progress,
    progressMessage,
    isProcessing,
    error,
    processChart
  };
}
