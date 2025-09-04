import { QdrantClient } from '@qdrant/qdrant-js';
import { generateObject, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { myProvider } from '@/lib/ai/providers';
import type { FurnitureAnalysis, IkeaProduct } from './types';
import { IkeaIntegrationError } from './types';

export class IkeaService {
    private qdrant: QdrantClient;
    private readonly collectionName = 'ikea_products';

    constructor() {
        if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
            throw new Error('Qdrant configuration is required (QDRANT_URL and QDRANT_API_KEY)');
        }

        this.qdrant = new QdrantClient({
            url: process.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY,
        });
    }

    async analyzeFurniture(imageData: string): Promise<FurnitureAnalysis> {
        try {
            const { object: analysis } = await generateObject({
                model: myProvider.languageModel('chat-model'),
                schema: z.object({
                    items: z.array(z.string()).describe('Furniture items visible in the image'),
                    confidence: z.number().min(0).max(1).describe('Confidence level of the analysis'),
                    roomType: z.string().describe('Type of room detected'),
                }),
                system: `Analyze the image and identify furniture items.

Instructions:
- Identify 2-5 main furniture pieces
- Use standard furniture terms (sofa, table, chair, bed, desk, bookshelf, etc.)
- Focus on items that could realistically be replaced with IKEA products
- Provide a confidence score based on image clarity and furniture visibility
- Determine the room type to help with context

Be specific but avoid overly detailed descriptions.`,
                messages: [{
                    role: 'user',
                    content: [{
                        type: 'text',
                        text: 'Analyze this room image and identify the main furniture items.'
                    }, {
                        type: 'image',
                        image: imageData
                    }]
                }]
            });

            if (!analysis.items || analysis.items.length === 0) {
                return { items: [], confidence: 0 };
            }

            return {
                items: analysis.items,
                confidence: analysis.confidence || 0.8,
            };
        } catch (error) {
            throw new IkeaIntegrationError('Failed to analyze furniture in image', error as Error);
        }
    }

    async searchProducts(furnitureItems: string[]): Promise<IkeaProduct[]> {
        if (furnitureItems.length === 0) {
            return [];
        }

        try {
            const { embeddings } = await embedMany({
                model: openai.textEmbeddingModel('text-embedding-3-small'),
                values: furnitureItems
            });

            const searchResults = await this.qdrant.searchBatch(this.collectionName, {
                searches: embeddings.map(embedding => ({
                    vector: embedding,
                    limit: 2,
                    score_threshold: 0.7,
                }))
            });

            const productMap = new Map<string, IkeaProduct>();

            for (const batch of searchResults) {
                for (const result of batch) {
                    if (result.payload && result.score && result.score > 0.7) {
                        const payload = result.payload as any;
                        const productId = payload.product_id;

                        if (!productMap.has(productId)) {
                            productMap.set(productId, {
                                id: productId,
                                name: payload.product_name || 'Unknown Product',
                                description: payload.description || '',
                                price: payload.price || 0,
                                currency: payload.currency || 'USD',
                                imageUrl: payload.main_image_url || '',
                                category: payload.category_name || 'furniture',
                            });
                        }
                    }
                }
            }

            return Array.from(productMap.values()).slice(0, 5);
        } catch (error) {
            throw new IkeaIntegrationError('Failed to search IKEA products', error as Error);
        }
    }

    generateEnhancementPrompt(furnitureItems: string[], ikeaProducts: IkeaProduct[]): string {
        if (furnitureItems.length === 0 || ikeaProducts.length === 0) {
            return '';
        }

        const furnitureDescriptions = ikeaProducts.map(product =>
            `${product.name} (${product.category}): ${product.description}`
        ).join(', ');

        return `Replace the furniture in this room with these specific IKEA products: ${furnitureDescriptions}. 
    Maintain the exact same room layout, lighting, and perspective. 
    Keep all architectural elements unchanged (walls, floors, ceiling, windows). 
    Only update the furniture to match the IKEA products' style and design. 
    Ensure the furniture placement looks natural and functional in the space.
    The result should look like a professional interior design photo featuring IKEA furniture.`;
    }

    isAvailable(): boolean {
        return !!(process.env.QDRANT_URL && process.env.QDRANT_API_KEY);
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.qdrant.getCollections();
            return true;
        } catch {
            return false;
        }
    }

    async getCollectionInfo() {
        try {
            return await this.qdrant.getCollection(this.collectionName);
        } catch (error) {
            throw new IkeaIntegrationError('Failed to get collection information', error as Error);
        }
    }
}