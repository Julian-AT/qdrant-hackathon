import { QdrantClient } from "@qdrant/qdrant-js";
import { generateObject, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import type { FurnitureAnalysis, IkeaProduct } from "./types";
import { IkeaIntegrationError } from "./types";
import { SegmentationResult } from "./image-service";
import { generateUUID } from "../utils";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";

interface Segment {
  id: string;
  bbox: number[];
  label: string;
  imageSegment: string;
}

export class IkeaService {
  private qdrant: QdrantClient;
  private replicate: Replicate;
  private readonly collectionName = "furniture_images";

  constructor() {
    if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
      throw new Error(
        "Qdrant configuration is required (QDRANT_URL and QDRANT_API_KEY)",
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN is required");
    }

    this.replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    this.qdrant = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }

  async getSegment(bbox: number[], baseImage: string): Promise<string> {
    let imageBuffer: Buffer;

    if (baseImage.startsWith("data:image/")) {
      imageBuffer = Buffer.from(baseImage.split(",")[1], "base64");
    } else if (
      baseImage.startsWith("http://") ||
      baseImage.startsWith("https://")
    ) {
      const response = await fetch(baseImage);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error("Invalid image format. Expected base64 or URL.");
    }

    const [x_min, y_min, x_max, y_max] = bbox;

    const width = x_max - x_min;
    const height = y_max - y_min;

    const segmentBuffer = await sharp(imageBuffer)
      .extract({
        left: Math.round(x_min),
        top: Math.round(y_min),
        width: Math.round(width),
        height: Math.round(height),
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    return `data:image/jpeg;base64,${segmentBuffer.toString("base64")}`;
  }

  async getSegments(
    segmentationResult: SegmentationResult,
    baseImage: string,
  ): Promise<Segment[]> {
    const segments = [];

    for (let i = 0; i < segmentationResult["<OD>"].bboxes.length; i++) {
      const bbox = segmentationResult["<OD>"].bboxes[i];
      const label = segmentationResult["<OD>"].labels[i];

      const imageSegment = await this.getSegment(bbox, baseImage);
      const segmentId = generateUUID();

      segments.push({
        id: segmentId,
        bbox,
        label,
        imageSegment,
      });
    }

    return segments;
  }

  async filterSegmentsLLM(
    segments: Segment[],
    baseImage: string,
  ): Promise<Segment[]> {
    const possibleIds = segments.map((segment) => segment.id) as string[] as [
      string,
      ...string[],
    ];

    const { object } = await generateObject({
      model: myProvider.languageModel("chat-model"),
      schema: z.object({
        ids: z.array(
          z
            .enum(possibleIds)
            .describe(
              "The ids of the segments that are filtered to be included in the final image.",
            ),
        ),
      }),
      system: `You are a helpful assistant that filters segments to only include the ones that are furniture.
      Narrow those segments down to only include labels that are available as Ikea products. e.g. "bed", "chair", "table", "sofa" etc. Do not include labels like "wall", "floor", "ceiling", "window", "door", "lamp", etc..`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Here are the segments: \n\n${segments.map((segment) => `ID: ${segment.id}, Label: ${segment.label}`).join("\n")}`,
            },
            {
              type: "image",
              image: baseImage,
            },
          ],
        },
      ],
    });

    if (!object.ids) {
      throw new IkeaIntegrationError(
        "Failed to filter segments",
        new Error("No segments returned"),
      );
    }

    const filteredSegments = segments.filter((segment) =>
      object.ids.includes(segment.id),
    );
    return filteredSegments;
  }

  async searchIkeaProducts(segments: Segment[]): Promise<IkeaProduct[]> {
    try {
      const ikeaProductsPromises = segments.map(async (segment) => {
        const imageData = Buffer.from(
          segment.imageSegment.split(",")[1],
          "base64",
        );

        const output = (await this.replicate.run(
          "krthr/clip-embeddings:1c0371070cb827ec3c7f2f28adcdde54b50dcd239aa6faea0bc98b174ef03fb4",
          {
            input: {
              image: imageData,
              text: segment.label,
            },
          },
        )) as any;

        const embedding = output.embedding as number[];
        const ikeaProduct = await this.qdrant.search(this.collectionName, {
          vector: embedding,
          limit: 1,
        });

        return ikeaProduct[0];
      });

      const ikeaProducts = await Promise.all(ikeaProductsPromises);
      console.log(ikeaProducts);

      return ikeaProducts as unknown as IkeaProduct[];
    } catch (error) {
      console.log(error);
      throw new IkeaIntegrationError(
        "Failed to search Ikea products",
        error as Error,
      );
    }
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
        error as Error,
      );
    }
  }
}
