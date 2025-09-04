import Replicate from 'replicate';
import { generateText, convertToModelMessages } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/types';
import type { ImageGenerationOptions } from './types';
import { ImageGenerationError } from './types';

export class ImageService {
    private replicate: Replicate;

    constructor() {
        if (!process.env.REPLICATE_API_TOKEN) {
            throw new Error('REPLICATE_API_TOKEN is required');
        }
        this.replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    }

    async generateRoomDescription(messages: ChatMessage[]): Promise<string> {
        try {
            const { text } = await generateText({
                model: myProvider.languageModel('chat-model'),
                system: `Create detailed room descriptions for 360° panoramic visualization.

Include:
- Room type and function
- Architectural elements (walls, flooring, ceiling, windows, doors)
- Lighting setup (natural and artificial)
- Spatial layout and flow
- Basic furniture placement
- Color scheme and materials
- Design style and atmosphere

Be specific for accurate visualization, focus on 360° view elements, use professional terminology.`,
                messages: convertToModelMessages(messages),
            });

            if (!text.trim()) {
                throw new Error('Generated room description is empty');
            }

            return text;
        } catch (error) {
            throw new ImageGenerationError('Failed to generate room description', error as Error);
        }
    }

    async generatePanorama(description: string, options: Partial<ImageGenerationOptions> = {}): Promise<string> {
        const config: ImageGenerationOptions = {
            prompt: `360-degree equirectangular panoramic interior view: ${description}. 
        Professional architectural photography, seamless edges, realistic lighting, 
        high-quality interior design, photorealistic rendering, wide-angle perspective.`,
            width: options.width || 1024,
            height: options.height || 512,
            guidanceScale: options.guidanceScale || 7.5,
            inferenceSteps: options.inferenceSteps || 20,
            scheduler: options.scheduler || 'K_EULER',
        };

        try {
            const result = await this.replicate.run(
                "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                {
                    input: {
                        prompt: config.prompt,
                        width: config.width,
                        height: config.height,
                        num_outputs: 1,
                        scheduler: config.scheduler,
                        num_inference_steps: config.inferenceSteps,
                        guidance_scale: config.guidanceScale,
                    }
                }
            );

            console.log(result);

            const imageUrl = Array.isArray(result) ? result[0] : (result as unknown as string);

            if (!imageUrl || typeof imageUrl !== 'string') {
                throw new Error('Invalid image generation result');
            }

            return imageUrl;
        } catch (error) {
            throw new ImageGenerationError('Failed to generate panoramic image', error as Error);
        }
    }

    async enhanceWithFurniture(baseImage: string, enhancementPrompt: string, strength = 0.7): Promise<string> {
        try {
            const imageData = await this.ensureBase64Image(baseImage);

            const result = await this.replicate.run(
                "stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478",
                {
                    input: {
                        image: imageData,
                        prompt: enhancementPrompt,
                        strength,
                        guidance_scale: 7.5,
                        num_inference_steps: 20,
                    }
                }
            );

            const enhancedUrl = Array.isArray(result) ? result[0] : (result as unknown as string);

            if (!enhancedUrl || typeof enhancedUrl !== 'string') {
                throw new Error('Invalid image enhancement result');
            }

            return await this.ensureBase64Image(enhancedUrl);
        } catch (error) {
            throw new ImageGenerationError('Failed to enhance image with furniture', error as Error);
        }
    }

    async ensureBase64Image(image: string): Promise<string> {
        if (image.startsWith('data:')) {
            return image;
        }

        try {
            const response = await fetch(image);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const mimeType = response.headers.get('content-type') || 'image/jpeg';

            return `data:${mimeType};base64,${base64}`;
        } catch (error) {
            throw new ImageGenerationError('Failed to convert image to base64', error as Error);
        }
    }

    isValidImage(image: string): boolean {
        return image.startsWith('data:image/') || image.startsWith('http://') || image.startsWith('https://');
    }
}