# Knitting Chart Processing Components

This directory contains components and services for processing and displaying knitting charts using computer vision and machine learning.

## Components

### PatternFileUploader.vue

A file uploader component specifically designed for knitting chart images. It handles file selection, preview, and processing.

#### Features
- Drag and drop support
- Image preview
- Automatic processing of knitting charts
- Progress indicators
- Error handling
- Responsive design

#### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| autoProcess | Boolean | true | Whether to automatically process the image after upload |
| maxSizeMB | Number | 10 | Maximum file size in MB |
| showChartPreview | Boolean | true | Whether to show the chart preview |

#### Events
| Event | Payload | Description |
|-------|---------|-------------|
| file-change | File | Emitted when a file is selected or removed |
| processing-complete | Object | Emitted when processing is complete with results |
| error | String | Emitted when an error occurs |

#### Methods
| Method | Parameters | Description |
|--------|------------|-------------|
| processChart | - | Manually trigger chart processing |
| removeFile | - | Remove the current file and reset the component |

### ChartPreview.vue

A component that displays and processes knitting chart images using OpenCV and Roboflow.

#### Features
- Interactive chart display
- Stitch detection and classification
- Grid detection
- Zoom and pan support
- Mobile-friendly touch controls

#### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| imageUrl | String | - | URL of the image to process |
| autoProcess | Boolean | true | Whether to automatically process the image |

#### Events
| Event | Payload | Description |
|-------|---------|-------------|
| processing-complete | Object | Emitted when processing is complete |
| error | Error | Emitted when an error occurs |

### StitchGrid.vue (Planned)

A component for displaying and editing detected stitches in a grid format.

## Services

### chartProcessingService.js

A service that handles the image processing pipeline using OpenCV and Roboflow.

#### Methods
- `processChart(imageElement)`: Processes a knitting chart image and returns the detected stitches
- `detectGrid(imageData)`: Detects the grid structure of a knitting chart
- `classifyStitches(imageData, grid)`: Classifies each cell in the grid as a specific stitch type

## Usage Example

```vue
<template>
  <PatternFileUploader
    @processing-complete="handleProcessingComplete"
    @error="handleError"
  />
</template>

<script setup>
import { ref } from 'vue';
import PatternFileUploader from '@/components/pattern/PatternFileUploader.vue';

const handleProcessingComplete = (result) => {
  console.log('Processing complete:', result);
  // Handle the processed chart data
};

const handleError = (error) => {
  console.error('Error:', error);
  // Handle the error
};
</script>
```

## Dependencies

- OpenCV.js: For image processing and grid detection
- Roboflow: For stitch classification
- Vue 3: Frontend framework
- Font Awesome: For icons

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS 12+)
- Chrome for Android

## License

MIT
