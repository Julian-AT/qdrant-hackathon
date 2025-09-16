import { z } from "zod";
import type { UIMessage } from "ai";
import type { ReactNode } from "react";
import type { SceneGenerationResult } from "./scene";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type CustomUIDataTypes = {
  textDelta: string;
  sceneProgress: {
    progress: number;
    message: string;
    isComplete?: boolean;
    ui?: ReactNode;
  };
  sceneResult: SceneGenerationResult;
  sceneError: {
    message: string;
    code?: string;
  };
  test: string;
  appendMessage: string;
  id: string;
  title: string;
  clear: null;
  finish: null;
};

export type ChatMessage = UIMessage<MessageMetadata, CustomUIDataTypes>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}

// IKEA Product Schema
export const productSchema = z.object({
  product_id: z.string(),
  product_number: z.string(),
  product_name: z.string(),
  category_name: z.string(),
  subcategory_name: z.string(),
  description: z.string(),
  price: z.number(),
  currency: z.string(),
  url: z.string().url(),
  main_image_url: z.string().url(),
  main_image_alt: z.string(),
  rating_info: z
    .object({
      rating: z.number().nullable().optional(),
      review_count: z.number().nullable().optional(),
      rating_percentage: z.number().nullable().optional(),
    })
    .optional(),
  quick_facts: z.array(z.string()).optional(),
  variants: z.array(z.unknown()).optional(),
  text: z.string(),
});

export type Product = z.infer<typeof productSchema>;

// IKEA Furniture Schema
export const ikeaFurnitureSchema = z.object({
  furniture: z.array(
    z.object({
      name: z
        .string()
        .describe(
          "Type or name of the furniture item, e.g., 'sofa', 'dining table'",
        ),
      description: z
        .string()
        .describe("Short natural language description of the item"),
      location: z.object({
        area: z
          .string()
          .describe(
            "General area of the apartment, e.g., 'living_room', 'dining_left'",
          ),
        pitch: z
          .number()
          .describe("Vertical angle of the item in the panoramic view"),
        yaw: z
          .number()
          .describe("Horizontal angle of the item in the panoramic view"),
      }),
      suggestion: productSchema,
    }),
  ),
});

export type IkeaFurniture = z.infer<typeof ikeaFurnitureSchema>;

// Progress tracking types
export interface SceneProgress {
  progress: number;
  message: string;
  isComplete?: boolean;
}

export interface SceneResult {
  id: string;
  title: string;
  prompt: string;
  image: string;
  isComplete: boolean;
  createdAt: string;
}

export interface SceneError {
  message: string;
  code: string;
}
