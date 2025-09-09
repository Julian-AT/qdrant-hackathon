"""Configuration management for the vector search engine."""

import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Qdrant settings
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_API_KEY: Optional[str] = os.getenv("QDRANT_API_KEY")
    
    # OpenAI settings
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "text-embedding-3-small")
    
    # CLIP settings
    CLIP_MODEL: str = os.getenv("CLIP_MODEL", "openai/clip-vit-large-patch14")
    
    # Collection names
    TEXT_COLLECTION: str = os.getenv("TEXT_COLLECTION", "ikea_products")
    IMAGE_COLLECTION: str = os.getenv("IMAGE_COLLECTION", "furniture_images")
    
    # Processing settings
    BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", "32"))
    VECTOR_SIZE_TEXT: int = int(os.getenv("VECTOR_SIZE_TEXT", "1536"))
    VECTOR_SIZE_IMAGE: int = int(os.getenv("VECTOR_SIZE_IMAGE", "768"))
    
    # Search settings
    DEFAULT_LIMIT: int = int(os.getenv("DEFAULT_LIMIT", "10"))
    DEFAULT_THRESHOLD: float = float(os.getenv("DEFAULT_THRESHOLD", "0.7"))
    
    @classmethod
    def validate(cls) -> bool:
        required_vars = ["QDRANT_URL"]
        missing = [var for var in required_vars if not getattr(cls, var)]
        
        if missing:
            raise ValueError(f"Missing required environment variables: {missing}")
        
        return True
