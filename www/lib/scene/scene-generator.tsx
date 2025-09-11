import type { ChatMessage, SceneResult } from '@/lib/types';
import { ImageService } from './image-service';
import { IkeaService } from './ikea-service';
import type {
    SceneGenerationConfig,
    SceneGenerationResult,
    ProgressCallback,
} from './types';
import { SceneGenerationError } from './types';

export class SceneGenerator {
    private imageService: ImageService;
    private ikeaService: IkeaService | null = null;

    constructor() {
        this.imageService = new ImageService();

        try {
            this.ikeaService = new IkeaService();
        } catch (error) {
            console.warn('IKEA service not available:', (error as Error).message);
        }
    }

    async generateScene(
        messages: ChatMessage[],
        sceneId: string,
        sceneTitle: string,
        config: SceneGenerationConfig,
        onProgress?: ProgressCallback
    ): Promise<SceneGenerationResult> {
        const startTime = Date.now();
        const steps: string[] = [];
        let furnitureItemsFound = 0;
        let ikeaProductsUsed = 0;

        try {
            onProgress?.(10, 'Getting things ready...');
            steps.push('Started room description generation');

            const roomDescription = await this.imageService.generateRoomDescription(messages);
            steps.push(`Generated room description: ${roomDescription.slice(0, 100)}...`);

            onProgress?.(25, 'Generating panoramic image...');
            steps.push('Started panoramic image generation');

            const {
                imageData: baseImage,
                imageUrl,
            } = await this.imageService.generatePanorama(roomDescription, {
                width: config.imageWidth,
                height: config.imageHeight,
                guidanceScale: config.guidanceScale,
                inferenceSteps: config.inferenceSteps,
            });
            steps.push('Generated base panoramic image');

            let finalImage = baseImage;

            if (config.includeIkeaFurniture && this.ikeaService) {
                try {
                    onProgress?.(30, 'Analyzing furniture in the image...');
                    steps.push('Started IKEA furniture integration');

                    onProgress?.(35, 'Converting image for analysis...');
                    const imageData = await this.imageService.ensureBase64Image(baseImage);
                    steps.push('Image converted to base64 format');

                    onProgress?.(45, 'Detecting objects in the scene...');
                    const segmentationResult = await this.imageService.segmentImage(imageUrl);
                    console.log(segmentationResult);


                    furnitureItemsFound = segmentationResult['<OD>'].bboxes.length;
                    steps.push(`Detected ${furnitureItemsFound} objects in the scene`);

                    if (furnitureItemsFound === 0) {
                        steps.push('No objects detected in the scene, skipping IKEA integration');

                        if (config.enableUpscaling) {
                            onProgress?.(95, 'Enhancing image quality...');
                            steps.push('Started image upscaling');

                            try {
                                finalImage = await this.imageService.upscaleImage(baseImage);
                                steps.push('Image upscaled successfully');
                            } catch (error) {
                                console.warn('Image upscaling failed, using original image:', error);
                                steps.push(`Image upscaling failed: ${(error as Error).message}`);
                            }
                        } else {
                            steps.push('Image upscaling skipped (disabled)');
                        }

                        onProgress?.(100, 'Scene generation complete!');
                        return {
                            scene: {
                                id: sceneId,
                                title: sceneTitle,
                                prompt: roomDescription,
                                image: finalImage,
                                isComplete: true,
                                createdAt: new Date().toISOString(),
                            },
                            metadata: {
                                processingTime: Date.now() - startTime,
                                steps,
                                furnitureItemsFound: 0,
                                ikeaProductsUsed: 0,
                            },
                        };
                    }

                    onProgress?.(55, 'Extracting furniture segments...');
                    const segments = await this.ikeaService.getSegments(segmentationResult, baseImage);
                    steps.push(`Extracted ${segments.length} furniture segments`);

                    onProgress?.(65, 'Filtering furniture for IKEA compatibility...');
                    const filteredSegments = await this.ikeaService.filterSegmentsLLM(segments, baseImage);
                    steps.push(`Filtered to ${filteredSegments.length} IKEA-compatible furniture items`);

                    if (filteredSegments.length === 0) {
                        steps.push('No IKEA-compatible furniture found, using base image');

                        if (config.enableUpscaling) {
                            onProgress?.(95, 'Enhancing image quality...');
                            steps.push('Started image upscaling');

                            try {
                                finalImage = await this.imageService.upscaleImage(baseImage);
                                steps.push('Image upscaled successfully');
                            } catch (error) {
                                console.warn('Image upscaling failed, using original image:', error);
                                steps.push(`Image upscaling failed: ${(error as Error).message}`);
                            }
                        } else {
                            steps.push('Image upscaling skipped (disabled)');
                        }

                        onProgress?.(100, 'Scene generation complete!');
                        return {
                            scene: {
                                id: sceneId,
                                title: sceneTitle,
                                prompt: roomDescription,
                                image: finalImage,
                                isComplete: true,
                                createdAt: new Date().toISOString(),
                            },
                            metadata: {
                                processingTime: Date.now() - startTime,
                                steps,
                                furnitureItemsFound,
                                ikeaProductsUsed: 0,
                            },
                        };
                    }

                    onProgress?.(75, 'Searching for matching IKEA products...');
                    const ikeaProducts = await this.ikeaService.searchIkeaProducts(filteredSegments);
                    ikeaProductsUsed = ikeaProducts.filter(product => product !== null).length;
                    steps.push(`Found ${ikeaProductsUsed} matching IKEA products`);


                    onProgress?.(85, `Integrating ${ikeaProductsUsed} IKEA products into scene...`);
                    finalImage = await this.imageService.injectIkeaProducts(baseImage, ikeaProducts);
                    steps.push('IKEA products integrated into scene');

                    if (ikeaProductsUsed > 0) {
                        steps.push(`Successfully integrated ${ikeaProductsUsed} IKEA products`);
                        console.log('IKEA products found:', ikeaProducts.filter(p => p !== null).map(p => p?.name));
                    } else {
                        steps.push('No suitable IKEA products found, using base image');
                    }
                } catch (error) {
                    const errorMessage = (error as Error).message;
                    console.warn('IKEA integration failed, using base image:', error);
                    steps.push(`IKEA integration failed: ${errorMessage}`);

                    if (errorMessage.includes('Qdrant') || errorMessage.includes('REPLICATE')) {
                        steps.push('Service configuration issue detected - check API keys');
                    } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
                        steps.push('Network timeout - retry may be needed');
                    }
                }
            } else {
                steps.push('IKEA integration skipped (disabled or unavailable)');
            }

            if (config.enableUpscaling) {
                onProgress?.(95, 'Enhancing image quality...');
                steps.push('Started image upscaling');

                try {
                    finalImage = await this.imageService.upscaleImage(finalImage);
                    steps.push('Image upscaled successfully');
                } catch (error) {
                    console.warn('Image upscaling failed, using original image:', error);
                    steps.push(`Image upscaling failed: ${(error as Error).message}`);
                }
            } else {
                steps.push('Image upscaling skipped (disabled)');
            }

            onProgress?.(100, 'Scene generation complete!');
            steps.push('Scene generation completed successfully');

            const processingTime = Date.now() - startTime;

            const scene: SceneResult = {
                id: sceneId,
                title: sceneTitle,
                prompt: roomDescription,
                image: finalImage,
                isComplete: true,
                createdAt: new Date().toISOString(),
            };

            return {
                scene,
                metadata: {
                    processingTime,
                    steps,
                    furnitureItemsFound,
                    ikeaProductsUsed,
                },
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            steps.push(`Generation failed: ${(error as Error).message}`);

            throw new SceneGenerationError(
                'Scene generation failed',
                'GENERATION_FAILED',
                error as Error
            );
        }
    }

    async generateBasicScene(
        messages: ChatMessage[],
        sceneId: string,
        sceneTitle: string,
        onProgress?: ProgressCallback
    ): Promise<SceneGenerationResult> {
        const config: SceneGenerationConfig = {
            includeIkeaFurniture: false,
            enableUpscaling: false,
            maxRetries: 1,
            imageWidth: 1440,
            imageHeight: 720,
            guidanceScale: 7.5,
            inferenceSteps: 20,
        };

        return this.generateScene(messages, sceneId, sceneTitle, config, onProgress);
    }

    getServiceStatus() {
        return {
            imageService: true,
            ikeaService: this.ikeaService !== null,
        };
    }

    static getDefaultConfig(): SceneGenerationConfig {
        return {
            includeIkeaFurniture: true,
            enableUpscaling: true,
            maxRetries: 3,
            imageWidth: 1440,
            imageHeight: 720,
            guidanceScale: 7.5,
            inferenceSteps: 20,
        };
    }

    static validateConfig(config: Partial<SceneGenerationConfig>): SceneGenerationConfig {
        const defaults = SceneGenerator.getDefaultConfig();

        return {
            includeIkeaFurniture: config.includeIkeaFurniture ?? defaults.includeIkeaFurniture,
            enableUpscaling: config.enableUpscaling ?? defaults.enableUpscaling,
            maxRetries: Math.max(1, Math.min(config.maxRetries ?? defaults.maxRetries, 5)),
            imageWidth: Math.max(720, Math.min(config.imageWidth ?? defaults.imageWidth, 1440)),
            imageHeight: Math.max(360, Math.min(config.imageHeight ?? defaults.imageHeight, 720)),
            guidanceScale: Math.max(1, Math.min(config.guidanceScale ?? defaults.guidanceScale, 20)),
            inferenceSteps: Math.max(10, Math.min(config.inferenceSteps ?? defaults.inferenceSteps, 50)),
        };
    }
}