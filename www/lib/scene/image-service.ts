import Replicate from "replicate";
import { generateText, convertToModelMessages } from "ai";
import { myProvider } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/types";
import type { ImageGenerationOptions } from "./types";
import { ImageGenerationError } from "./types";

interface ReplicateResult {
  url: () => string;
}

export class ImageService {
  private replicate: Replicate;

  constructor() {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN is required");
    }
    this.replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  }

  async generateRoomDescription(messages: ChatMessage[]): Promise<string> {
    try {
      const { text } = await generateText({
        model: myProvider.languageModel("chat-model"),
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
        throw new Error("Generated room description is empty");
      }

      return text;
    } catch (error) {
      throw new ImageGenerationError(
        "Failed to generate room description",
        error as Error
      );
    }
  }

  async generatePanorama(
    description: string,
    options: Partial<ImageGenerationOptions> = {}
  ): Promise<string> {
    try {
      const result: ReplicateResult[] = (await this.replicate.run(
        "govirtualuk/pegasus:c566ed7924f1b66556e64aa91bcff6ffc57fe9e92c94172bde04bf43cff33bd1",
        {
          input: {
            model: "dev",
            width: 1440,
            height: 720,
            prompt: `Eq360\n360-degree equirectangular panorama for VR viewing.\nx2 1:1 images side-by-side on a 16:9 canvas, stitched together showing 180° of the entire panorama.\n({ prompt: ${description} }).\nPhotorealistic, 8k, ultra-high detail. 1440x720.\nA full 360-degree view of the entire scene, as seen from all angles.\nAll boundaries of the image must be perfectly and seamless.\nThe left and right edge must be the same and merge into each other.`,
            go_fast: false,
            lora_scale: 1,
            megapixels: "1",
            num_outputs: 1,
            aspect_ratio: "custom",
            output_format: "png",
            guidance_scale: 3,
            output_quality: 100,
            prompt_strength: 1,
            extra_lora_scale: 1,
            num_inference_steps: 50,
          },
        }
      )) as unknown as ReplicateResult[];

      const imageUrl = result[0].url();
      const image = await fetch(imageUrl);
      const imageBuffer = await image.arrayBuffer();
      const base64 = Buffer.from(imageBuffer).toString("base64");
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      throw new ImageGenerationError(
        "Failed to generate panoramic image",
        error as Error
      );
    }
  }

  async enhanceWithFurniture(
    baseImage: string,
    enhancementPrompt: string,
    strength = 0.7
  ): Promise<string> {
    try {
      const imageData = await this.ensureBase64Image(baseImage);
      const imageDataBuffer = Buffer.from(imageData, "base64");

      const result: ReplicateResult[] = (await this.replicate.run(
        "philz1337x/clarity-upscaler:dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e",
        {
          input: {
            seed: 1337,
            image: imageDataBuffer,
            prompt:
              "masterpiece, best quality, highres, <lora:more_details:0.5> <lora:SDXLrender_v2.0:1>",
            dynamic: 6,
            handfix: "disabled",
            pattern: false,
            sharpen: 0,
            sd_model: "juggernaut_reborn.safetensors [338b85bc4f]",
            scheduler: "DPM++ 3M SDE Karras",
            creativity: 0.35,
            lora_links: "",
            downscaling: false,
            resemblance: 0.6,
            scale_factor: 2,
            tiling_width: 112,
            output_format: "png",
            tiling_height: 144,
            custom_sd_model: "",
            negative_prompt:
              "(worst quality, low quality, normal quality:2) JuggernautNegative-neg",
            num_inference_steps: 18,
            downscaling_resolution: 768,
          },
        }
      )) as unknown as ReplicateResult[];

      const imageUrl = result[0].url();
      const image = await fetch(imageUrl);
      const imageBuffer = await image.arrayBuffer();
      const base64 = Buffer.from(imageBuffer).toString("base64");
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      throw new ImageGenerationError(
        "Failed to enhance image with furniture",
        error as Error
      );
    }
  }

  async ensureBase64Image(image: string): Promise<string> {
    if (image.startsWith("data:")) {
      return image;
    }

    try {
      const response = await fetch(image);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = response.headers.get("content-type") || "image/jpeg";

      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      throw new ImageGenerationError(
        "Failed to convert image to base64",
        error as Error
      );
    }
  }

  isValidImage(image: string): boolean {
    return (
      image.startsWith("data:image/") ||
      image.startsWith("http://") ||
      image.startsWith("https://")
    );
  }
}
