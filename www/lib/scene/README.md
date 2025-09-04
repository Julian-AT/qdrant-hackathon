# Scene Generation Module

Enterprise-ready scene generation with IKEA furniture integration for panoramic interior design visualization.

## Architecture

The module follows clean architecture principles with proper separation of concerns:

```
├── types.ts           # Type definitions and error classes
├── image-service.ts   # Image generation and processing
├── ikea-service.ts    # IKEA product search and integration
├── scene-generator.ts # Main orchestration logic
└── index.ts          # Public API exports
```

## Key Features

### 🏗️ **Enterprise Architecture**
- **Clean separation of concerns** - Each service has a single responsibility
- **Dependency injection** - Services are loosely coupled
- **Comprehensive error handling** - Custom error types with proper context
- **Type safety** - Full TypeScript coverage with strict typing
- **Configurable** - Flexible configuration with validation

### 🎨 **Scene Generation**
- **Room description generation** - AI-powered room analysis from chat context
- **360° panoramic rendering** - High-quality equirectangular interior images
- **Configurable image parameters** - Width, height, guidance scale, inference steps
- **Retry logic** - Automatic retry with exponential backoff

### 🪑 **IKEA Integration**
- **Furniture analysis** - Computer vision-based furniture detection
- **Product search** - Vector similarity search in IKEA product database
- **Smart enhancement** - Context-aware furniture replacement
- **Graceful fallbacks** - Continues without IKEA if unavailable

## Usage

### Basic Scene Generation

```typescript
import { SceneGenerator } from '@/lib/scene';

const generator = new SceneGenerator();

const result = await generator.generateScene(
  messages,           // Chat messages for context
  sceneId,           // Unique scene identifier
  sceneTitle,        // Scene title
  config,            // Generation configuration
  onProgress         // Progress callback
);
```

### Configuration

```typescript
import { SceneGenerator } from '@/lib/scene';

const config = SceneGenerator.validateConfig({
  includeIkeaFurniture: true,
  maxRetries: 3,
  imageWidth: 1024,
  imageHeight: 512,
  guidanceScale: 7.5,
  inferenceSteps: 20,
});
```

### Service Status

```typescript
const generator = new SceneGenerator();
const status = generator.getServiceStatus();

console.log(status);
// {
//   imageService: true,
//   ikeaService: false  // If Qdrant not configured
// }
```

## Services

### ImageService

Handles all image generation and processing:

- **Room description generation** from chat context
- **Panoramic image generation** using Stable Diffusion XL
- **Image enhancement** with furniture using img2img
- **Format conversion** between URLs and base64

### IkeaService

Manages IKEA product integration:

- **Furniture analysis** using computer vision
- **Product search** via vector similarity in Qdrant
- **Enhancement prompt generation** for realistic furniture replacement
- **Connection testing** and health checks

### SceneGenerator

Main orchestration service:

- **End-to-end scene generation** workflow
- **Service coordination** and error handling
- **Progress tracking** and user feedback
- **Configuration management** and validation

## Error Handling

Custom error types provide detailed context:

```typescript
try {
  const result = await generator.generateScene(...);
} catch (error) {
  if (error instanceof SceneGenerationError) {
    console.log(`Generation failed: ${error.message}`);
    console.log(`Error code: ${error.code}`);
    console.log(`Cause:`, error.cause);
  }
}
```

### Error Types

- **SceneGenerationError** - Main generation process failures
- **ImageGenerationError** - Image processing failures  
- **IkeaIntegrationError** - IKEA service failures

## Environment Variables

Required for full functionality:

```env
# Required for image generation
REPLICATE_API_TOKEN=your_replicate_token

# Required for IKEA integration (optional)
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key

# Required for AI models
OPENAI_API_KEY=your_openai_key
```

## Performance

### Optimization Features

- **Smart fallbacks** - Graceful degradation when services unavailable
- **Efficient image handling** - Optimal format conversions
- **Caching opportunities** - Service instances can be reused
- **Progress tracking** - Real-time user feedback

### Typical Processing Times

- Room description: ~2-3 seconds
- Base panorama: ~15-20 seconds  
- Furniture analysis: ~3-5 seconds
- IKEA search: ~2-3 seconds
- Image enhancement: ~15-20 seconds

**Total: ~40-50 seconds** (with IKEA integration)

## Monitoring

The module provides comprehensive logging and metrics:

```typescript
const result = await generator.generateScene(...);

console.log(result.metadata);
// {
//   processingTime: 45000,
//   steps: ["Started room description generation", ...],
//   furnitureItemsFound: 3,
//   ikeaProductsUsed: 2
// }
```

## Testing

Services include health check methods:

```typescript
const ikeaService = new IkeaService();
const isHealthy = await ikeaService.testConnection();

const imageService = new ImageService();
const isValid = imageService.isValidImage(imageUrl);
```
