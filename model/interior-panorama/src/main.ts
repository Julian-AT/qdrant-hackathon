/*
Qdrant Hackathon model finetuning for interior panorama generation
*/

import Replicate from "replicate";
import dotenv from "dotenv";

dotenv.config({
    path: ".env.local",
});

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const training = await replicate.trainings.create(
    "replicate",
    "qwen-image-lora-base",
    "7587d9a3db89eb00f3fb09a915cefbd059dff4e7bf6aeb8aa136d14686051e39",
    {
        // You need to create a model on Replicate that will be the destination for the trained version.
        destination: "julian-at/model-name",
        input: {
            steps: 1000,
            dataset: "https://",
            lora_rank: 64,
            learning_rate: 0.0002,
            default_caption: "A photo of a person named <>"
        }
    }
);