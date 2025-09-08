"""Embedding generators using CLIP and OpenAI models."""

import logging
import requests
from typing import List, Optional
from PIL import Image
import io
import torch
from transformers import CLIPProcessor, CLIPModel
import openai
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseEmbedder(ABC):
    @abstractmethod
    def get_embedding(self, input_data: str) -> Optional[List[float]]:
        pass


class CLIPEmbedder(BaseEmbedder):
    def __init__(self, model_name: str = "openai/clip-vit-base-patch32"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        
        self.model_name = model_name
        logger.info(f"Loading CLIP model: {model_name}")
        self.model = CLIPModel.from_pretrained(model_name).to(self.device)
        self.processor = CLIPProcessor.from_pretrained(model_name)
        logger.info("CLIP model loaded successfully")
    
    def get_image_embedding(self, image_url: str) -> Optional[List[float]]:
        try:
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            image = Image.open(io.BytesIO(response.content)).convert("RGB")
            inputs = self.processor(images=image, return_tensors="pt").to(self.device)

            with torch.no_grad():
                embedding = self.model.get_image_features(**inputs)

            embedding /= embedding.norm(p=2, dim=-1, keepdim=True)
            return embedding.cpu().numpy().flatten().tolist()

        except Exception as e:
            logger.warning(f"Failed to process image '{image_url}': {e}")
            return None
    
    def get_text_embedding(self, text: str) -> Optional[List[float]]:
        try:
            inputs = self.processor(text=text, return_tensors="pt").to(self.device)
            
            with torch.no_grad():
                embedding = self.model.get_text_features(**inputs)
            
            embedding /= embedding.norm(p=2, dim=-1, keepdim=True)
            return embedding.cpu().numpy().flatten().tolist()
            
        except Exception as e:
            logger.warning(f"Failed to process text '{text}': {e}")
            return None
    
    def get_embedding(self, input_data: str) -> Optional[List[float]]:
        if input_data.startswith(('http://', 'https://')):
            return self.get_image_embedding(input_data)
        else:
            return self.get_text_embedding(input_data)


class OpenAIEmbedder(BaseEmbedder):
    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        self.api_key = api_key
        self.model = model
        openai.api_key = api_key
        logger.info(f"OpenAI embedder initialized with model: {model}")
    
    def get_embedding(self, text: str) -> Optional[List[float]]:
        try:
            response = openai.embeddings.create(
                model=self.model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate OpenAI embedding: {e}")
            return None
