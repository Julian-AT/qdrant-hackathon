import { QdrantClient } from "@qdrant/qdrant-js";
import { generateObject, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import type { FurnitureAnalysis, IkeaProduct } from "./types";
import { IkeaIntegrationError } from "./types";

export class IkeaService {
  private qdrant: QdrantClient;
  private readonly collectionName = "ikea_products";

  private normalizeFurnitureTerms(items: string[]): string[] {
    const synonymMap: Record<string, string> = {
      "television unit": "tv bench",
      "tv unit": "tv bench",
      "tv stand": "tv bench",
      "tv table": "tv bench",
      couch: "sofa",
      sofas: "sofa",
      tables: "table",
      chairs: "chair",
      "arm chair": "armchair",
      "end table": "side table",
      "coffee table": "coffee table",
      ottomans: "ottoman",
    };

    const normalized = new Set<string>();
    for (const raw of items) {
      const term = raw.toLowerCase().trim();
      const mapped = synonymMap[term] ?? term;
      normalized.add(mapped);
    }
    return Array.from(normalized);
  }

  constructor() {
    if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
      throw new Error(
        "Qdrant configuration is required (QDRANT_URL and QDRANT_API_KEY)"
      );
    }

    this.qdrant = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }

  async analyzeFurniture(imageData: string): Promise<FurnitureAnalysis> {
    try {
      const { object: analysis } = await generateObject({
        model: myProvider.languageModel("chat-model"),
        schema: z.object({
          items: z
            .array(z.string())
            .describe("Furniture items visible in the image."),
          confidence: z
            .number()
            .min(0)
            .max(1)
            .describe("Confidence level of the analysis."),
          roomType: z.string().optional().describe("Type of room detected."),
        }),
        system: `Analyze the image and identify furniture items. Return a plain JSON object instance — not a JSON Schema. Do not include keys like "type" or "properties". The object must contain only: items (string array), confidence (number 0-1), and optionally roomType (string).

Instructions:
- Identify 2-5 main furniture pieces
- Use standard furniture terms (sofa, table, chair, bed, desk, bookshelf, etc.)
- Focus on items that could realistically be replaced with IKEA products
- Provide a confidence score based on image clarity and furniture visibility
- Determine the room type to help with context

Be specific but avoid overly detailed descriptions.`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this room image and identify the main furniture items.",
              },
              {
                type: "image",
                image: imageData,
              },
            ],
          },
        ],
      });

      if (!analysis.items || analysis.items.length === 0) {
        return { items: [], confidence: 0 };
      }

      return {
        items: analysis.items,
        confidence: analysis.confidence || 0.8,
      };
    } catch (error) {
      // Attempt to recover if the model mistakenly returned a JSON Schema-like object
      try {
        // Extract raw text from common error shapes produced by the AI SDK
        const rawText =
          (error as any)?.text ||
          (error as any)?.cause?.text ||
          (error as any)?.response?.text ||
          (error as any)?.cause?.response?.text ||
          undefined;

        if (typeof rawText === "string" && rawText.trim().length > 0) {
          let parsed: any | undefined;

          // Try to parse the raw text directly; if it fails, attempt to extract the first JSON object substring
          try {
            parsed = JSON.parse(rawText);
          } catch {
            const match = rawText.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                parsed = JSON.parse(match[0]);
              } catch {
                // ignore; will fall through to rethrow
              }
            }
          }

          if (parsed && typeof parsed === "object") {
            // If the model produced a JSON Schema-like object, extract its properties
            const candidate =
              parsed.properties && typeof parsed.properties === "object"
                ? parsed.properties
                : parsed;

            const recoverySchema = z.object({
              items: z.array(z.string()),
              confidence: z.number().min(0).max(1).optional(),
              roomType: z.string().optional(),
            });

            const result = recoverySchema.safeParse(candidate);
            if (result.success) {
              const items = result.data.items ?? [];
              const confidence = result.data.confidence ?? 0.8;
              return { items, confidence } satisfies FurnitureAnalysis;
            }
          }
        }
      } catch {
        // If recovery fails, fall through to throw the integration error below
      }

      throw new IkeaIntegrationError(
        "Failed to analyze furniture in image",
        error as Error
      );
    }
  }

  async searchProducts(furnitureItems: string[]): Promise<IkeaProduct[]> {
    if (furnitureItems.length === 0) {
      return [];
    }

    try {
      const terms = this.normalizeFurnitureTerms(furnitureItems);

      const { embeddings } = await embedMany({
        model: openai.textEmbeddingModel("text-embedding-3-small"),
        values: terms,
      });

      const initialThreshold = 0.45;
      const relaxedThreshold = 0.3;
      const perQueryLimit = 5;

      const searchParams = (threshold: number) => ({
        searches: embeddings.map((embedding) => ({
          vector: embedding,
          limit: perQueryLimit,
          score_threshold: threshold,
          with_payload: true,
        })),
      });

      let searchResults = await this.qdrant.searchBatch(
        this.collectionName,
        searchParams(initialThreshold)
      );

      const productMap = new Map<string, IkeaProduct>();

      const considerResult = (result: any, minScore: number) => {
        if (!result?.payload) return;
        const score: number =
          typeof result.score === "number" ? result.score : 0;

        const payload = result.payload as any;
        const productId = payload.product_id;
        if (!productId) return;

        const payloadText: string = String(payload.text || "").toLowerCase();
        const keywordHit = terms.some((t) => payloadText.includes(t));

        if (score >= minScore || keywordHit) {
          if (!productMap.has(productId)) {
            productMap.set(productId, {
              id: productId,
              name: payload.product_name || "Unknown Product",
              description: payload.description || "",
              price: payload.price || 0,
              currency: payload.currency || "USD",
              imageUrl: payload.main_image_url || "",
              category: payload.category_name || "furniture",
            });
          }
        }
      };

      for (const batch of searchResults) {
        for (const result of batch as any[]) {
          considerResult(result, initialThreshold);
        }
      }

      // If nothing found, relax threshold and retry
      if (productMap.size === 0) {
        searchResults = await this.qdrant.searchBatch(
          this.collectionName,
          searchParams(relaxedThreshold)
        );
        for (const batch of searchResults) {
          for (const result of batch as any[]) {
            considerResult(result, relaxedThreshold);
          }
        }
      }

      // Debug logging for observability
      if (productMap.size === 0) {
        console.log("IKEA search: no matches for terms", terms);
      } else {
        console.log(
          "IKEA search: matched products",
          Array.from(productMap.values())
            .slice(0, 5)
            .map((p) => ({ id: p.id, name: p.name, category: p.category }))
        );
      }

      return Array.from(productMap.values()).slice(0, 5);
    } catch (error) {
      throw new IkeaIntegrationError(
        "Failed to search IKEA products",
        error as Error
      );
    }
  }

  generateEnhancementPrompt(
    furnitureItems: string[],
    ikeaProducts: IkeaProduct[]
  ): string {
    if (furnitureItems.length === 0 || ikeaProducts.length === 0) {
      return "";
    }

    const furnitureDescriptions = ikeaProducts
      .map(
        (product) =>
          `${product.name} (${product.category}): ${product.description}`
      )
      .join(", ");

    return `Replace the furniture in this room with these exact IKEA products by name: ${furnitureDescriptions}.
    Maintain the exact same room layout, camera position, perspective, and lighting.
    Keep all architectural elements unchanged (walls, floors, ceiling, windows).
    Only update the furniture to match the specified IKEA products' style, proportions, and materials.
    Ensure realistic scale, placement, and shadows so the result looks like a professional interior design photo featuring IKEA furniture.`;
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
      throw new IkeaIntegrationError(
        "Failed to get collection information",
        error as Error
      );
    }
  }
}
