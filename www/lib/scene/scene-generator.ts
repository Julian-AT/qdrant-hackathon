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
            onProgress?.(20, 'Creating detailed room description...');
            steps.push('Started room description generation');

            const roomDescription = await this.imageService.generateRoomDescription(messages);
            steps.push(`Generated room description: ${roomDescription.slice(0, 100)}...`);

            onProgress?.(40, 'Generating base panoramic image...');
            steps.push('Started panoramic image generation');

            const baseImage = await this.imageService.generatePanorama(roomDescription, {
                width: config.imageWidth,
                height: config.imageHeight,
                guidanceScale: config.guidanceScale,
                inferenceSteps: config.inferenceSteps,
            });
            steps.push('Generated base panoramic image');

            let finalImage = baseImage;

            if (config.includeIkeaFurniture && this.ikeaService) {
                try {
                    onProgress?.(60, 'Analyzing furniture in the image...');
                    steps.push('Started IKEA furniture integration');

                    const imageData = await this.imageService.ensureBase64Image(baseImage);

                    const furnitureAnalysis = await this.ikeaService.analyzeFurniture(imageData);
                    furnitureItemsFound = furnitureAnalysis.items.length;

                    if (furnitureAnalysis.items.length > 0 && furnitureAnalysis.confidence > 0.6) {
                        steps.push(`Analyzed furniture: ${furnitureAnalysis.items.join(', ')}`);

                        onProgress?.(70, 'Searching IKEA product database...');

                        const ikeaProducts = await this.ikeaService.searchProducts(furnitureAnalysis.items);
                        ikeaProductsUsed = ikeaProducts.length;

                        if (ikeaProducts.length > 0) {
                            steps.push(`Found ${ikeaProducts.length} matching IKEA products`);

                            onProgress?.(80, 'Integrating IKEA furniture into the scene...');

                            const enhancementPrompt = this.ikeaService.generateEnhancementPrompt(
                                furnitureAnalysis.items,
                                ikeaProducts
                            );

                            const enhancedImage = await this.imageService.enhanceWithFurniture(
                                baseImage,
                                enhancementPrompt,
                                0.6
                            );

                            finalImage = enhancedImage;
                            steps.push('Successfully integrated IKEA furniture');
                        } else {
                            steps.push('No matching IKEA products found');
                        }
                    } else {
                        steps.push(`Furniture analysis inconclusive (confidence: ${furnitureAnalysis.confidence})`);
                    }
                } catch (error) {
                    console.warn('IKEA integration failed, using base image:', error);
                    steps.push(`IKEA integration failed: ${(error as Error).message}`);
                }
            } else {
                steps.push('IKEA integration skipped (disabled or unavailable)');
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
            maxRetries: 1,
            imageWidth: 1024,
            imageHeight: 512,
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
            maxRetries: 3,
            imageWidth: 1024,
            imageHeight: 512,
            guidanceScale: 7.5,
            inferenceSteps: 20,
        };
    }

    static validateConfig(config: Partial<SceneGenerationConfig>): SceneGenerationConfig {
        const defaults = SceneGenerator.getDefaultConfig();

        return {
            includeIkeaFurniture: config.includeIkeaFurniture ?? defaults.includeIkeaFurniture,
            maxRetries: Math.max(1, Math.min(config.maxRetries ?? defaults.maxRetries, 5)),
            imageWidth: Math.max(512, Math.min(config.imageWidth ?? defaults.imageWidth, 2048)),
            imageHeight: Math.max(256, Math.min(config.imageHeight ?? defaults.imageHeight, 1024)),
            guidanceScale: Math.max(1, Math.min(config.guidanceScale ?? defaults.guidanceScale, 20)),
            inferenceSteps: Math.max(10, Math.min(config.inferenceSteps ?? defaults.inferenceSteps, 50)),
        };
    }
}