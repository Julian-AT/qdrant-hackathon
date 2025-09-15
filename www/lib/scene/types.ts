import type { ChatMessage, IkeaFurniture, SceneResult } from '@/lib/types';
import React, { ReactNode } from 'react';

export interface SceneGenerationConfig {
    includeIkeaFurniture: boolean;
    enableUpscaling: boolean;
    maxRetries: number;
    imageWidth: number;
    imageHeight: number;
    guidanceScale: number;
    inferenceSteps: number;
}

export type ProgressCallback = (progress: number, message: string, ui?: ReactNode) => void;

export interface SceneGenerationResult {
    scene: SceneResult;
    metadata: {
        processingTime: number;
        steps: string[];
        furnitureItemsFound: number;
        ikeaProductsUsed: IkeaProduct[];
    };
}

export interface FurnitureAnalysis {
    items: string[];
    confidence: number;
}

export interface IkeaProduct {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    imageUrl: string;
    category: string;
}

export interface ImageGenerationOptions {
    prompt: string;
    width: number;
    height: number;
    guidanceScale: number;
    inferenceSteps: number;
    scheduler?: string;
}

export class SceneGenerationError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly cause?: Error
    ) {
        super(message);
        this.name = 'SceneGenerationError';
    }
}

export class IkeaIntegrationError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = 'IkeaIntegrationError';
    }
}

export class ImageGenerationError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = 'ImageGenerationError';
    }
}