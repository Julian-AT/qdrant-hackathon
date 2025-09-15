import Replicate from "replicate";
import { generateText, convertToModelMessages } from "ai";
import { myProvider } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/types";
import type { IkeaProduct, ImageGenerationOptions } from "./types";
import { ImageGenerationError } from "./types";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import sharp from "sharp";

interface ReplicateResult {
  url: () => string;
}

export interface SegmentationResult {
  "<OD>": {
    bboxes: number[][];
    labels: string[];
  };
  img: ReadableStream | string;
}

export class ImageService {
  private replicate: Replicate;
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN is required");
    }
    this.replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new ImageGenerationError(
        "Missing required R2 environment variables",
        new Error(
          "CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, and CLOUDFLARE_R2_BUCKET_NAME are required",
        ),
      );
    }

    this.bucketName = bucketName;
    this.publicUrl =
      publicUrl ||
      `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`;

    const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    this.s3Client = new S3Client({
      region: "auto",
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
      requestHandler: {
        requestTimeout: 30000,
        connectionTimeout: 10000,
      },
    });
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
        error as Error,
      );
    }
  }

  async generatePanorama(
    description: string,
    options: Partial<ImageGenerationOptions> = {},
  ): Promise<{
    imageUrl: string;
    r2Url: string;
  }> {
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
        },
      )) as unknown as ReplicateResult[];

      const tempImageUrl = result[0].url();
      const image = await fetch(tempImageUrl);
      const imageBuffer = await image.arrayBuffer();

      const uploadResult = await this.uploadImageBuffer(
        Buffer.from(imageBuffer),
        "image/png",
        "panoramas",
      );

      return {
        imageUrl: tempImageUrl,
        r2Url: uploadResult.url,
      };
    } catch (error) {
      throw new ImageGenerationError(
        "Failed to generate panoramic image",
        error as Error,
      );
    }
  }

  async drawBoundingBoxes(
    imageBuffer: Buffer,
    segmentationResult: SegmentationResult,
  ): Promise<Buffer> {
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();

    if (!width || !height) {
      throw new Error("Could not get image dimensions");
    }

    const bboxes = segmentationResult["<OD>"].bboxes;
    const labels = segmentationResult["<OD>"].labels;

    const svgElements: string[] = [];

    for (let i = 0; i < bboxes.length; i++) {
      const [x1, y1, x2, y2] = bboxes[i];
      const label = labels[i];

      const rectWidth = x2 - x1;
      const rectHeight = y2 - y1;

      svgElements.push(`
        <rect x="${x1}" y="${y1}" width="${rectWidth}" height="${rectHeight}" 
              fill="none" stroke="red" stroke-width="2"/>
        <text x="${x1}" y="${y1 - 5}" font-family="Arial" font-size="14" fill="red">${label}</text>
      `);
    }

    const svg = `
      <svg width="${width}" height="${height}">
        ${svgElements.join("")}
      </svg>
    `;

    const resultImage = await image
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .toBuffer();

    return resultImage;
  }

  async segmentImage(imageUrl: string): Promise<SegmentationResult> {
    try {
      const result = (await this.replicate.run(
        "lucataco/florence-2-large:da53547e17d45b9cfb48174b2f18af8b83ca020fa76db62136bf9c6616762595",
        {
          input: {
            image: imageUrl,
            task_input: "Object Detection",
          },
        },
      )) as any;

      console.log(result);

      if (!result.text) {
        throw new Error("No result text");
      }

      const resultJSON = result.text.replace(/'/g, '"');
      const segmentationResult = JSON.parse(resultJSON) as SegmentationResult;

      if (typeof segmentationResult.img === "string") {
        return {
          ...segmentationResult,
          img: "",
        };
      }

      // const chunks: Uint8Array[] = [];
      // const reader = segmentationResult.img.getReader();

      // while (true) {
      //   const { done, value } = await reader.read();
      //   if (done) break;
      //   chunks.push(value);
      // }

      // const imageBuffer = Buffer.concat(chunks);
      // const image = imageBuffer.toString('utf8');

      return {
        ...segmentationResult,
        img: "",
      };
    } catch (error) {
      console.log(error);
      throw new ImageGenerationError("Failed to segment image", error as Error);
    }
  }

  async injectIkeaProducts(
    baseImageUrl: string,
    ikeaProducts: IkeaProduct[],
  ): Promise<string> {
    try {
      const baseImageResponse = await fetch(baseImageUrl);
      const baseImageBuffer = await baseImageResponse.arrayBuffer();

      const result = (await this.replicate.run("google/nano-banana", {
        input: {
          prompt:
            "Inject the ikea products into the fully furnished panorama image. Make the scene natural. ",
          image_input: [
            Buffer.from(baseImageBuffer),
            ...ikeaProducts.map((product) => product.imageUrl),
          ],
          output_format: "jpg",
        },
      })) as unknown as ReplicateResult[];

      const tempImageUrl = result[0].url();
      const image = await fetch(tempImageUrl);
      const imageBuffer = await image.arrayBuffer();

      const uploadResult = await this.uploadImageBuffer(
        Buffer.from(imageBuffer),
        "image/jpeg",
        "panoramas",
      );

      return uploadResult.url;
    } catch (error) {
      console.log(error);
      throw new ImageGenerationError(
        "Failed to inject IKEA products into image",
        error as Error,
      );
    }
  }

  async upscaleImage(baseImageUrl: string): Promise<string> {
    try {
      const baseImageResponse = await fetch(baseImageUrl);
      const baseImageBuffer = await baseImageResponse.arrayBuffer();

      const result: ReplicateResult[] = (await this.replicate.run(
        "philz1337x/clarity-upscaler:dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e",
        {
          input: {
            seed: 1337,
            image: Buffer.from(baseImageBuffer),
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
        },
      )) as unknown as ReplicateResult[];

      const tempImageUrl = result[0].url();
      const image = await fetch(tempImageUrl);
      const imageBuffer = await image.arrayBuffer();

      const uploadResult = await this.uploadImageBuffer(
        Buffer.from(imageBuffer),
        "image/png",
        "panoramas",
      );

      return uploadResult.url;
    } catch (error) {
      console.log(error);
      throw new ImageGenerationError(
        "Failed to enhance image with furniture",
        error as Error,
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
        error as Error,
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

  private async uploadImageBuffer(
    imageBuffer: Buffer,
    contentType: string = "image/jpeg",
    folder: string = "images",
  ): Promise<{ url: string; key: string }> {
    try {
      const key = this.generateImageKey(folder, contentType);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000",
      });

      await this.s3Client.send(command);
      const publicUrl = await this.getPublicUrl(key);

      return { url: publicUrl, key };
    } catch (error) {
      throw new ImageGenerationError(
        "Failed to upload image to R2",
        error as Error,
      );
    }
  }

  private async getSignedUrl(
    key: string,
    expiresIn: number = 86400,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });
      return signedUrl;
    } catch (error) {
      throw new ImageGenerationError(
        "Failed to generate signed URL",
        error as Error,
      );
    }
  }

  private async getPublicUrl(key: string): Promise<string> {
    return `${this.publicUrl}/${key}`;
  }

  private generateImageKey(folder: string, contentType: string): string {
    const extension = this.getExtensionFromContentType(contentType);
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    return `${folder}/${timestamp}-${randomId}.${extension}`;
  }

  private getExtensionFromContentType(contentType: string): string {
    switch (contentType) {
      case "image/jpeg":
        return "jpg";
      case "image/png":
        return "png";
      case "image/webp":
        return "webp";
      case "image/gif":
        return "gif";
      default:
        return "jpg";
    }
  }

  async testR2Connection(): Promise<boolean> {
    try {
      const testKey = `test/${Date.now()}-connection-test.txt`;
      const testBuffer = Buffer.from("test", "utf-8");

      const putCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: testKey,
        Body: testBuffer,
        ContentType: "text/plain",
      });

      await this.s3Client.send(putCommand);

      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: testKey,
      });

      await this.s3Client.send(deleteCommand);

      return true;
    } catch (error) {
      console.error("R2 connection test failed:", error);
      return false;
    }
  }
}
