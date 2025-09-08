"""Vector search engine for IKEA products using Qdrant and CLIP/OpenAI embeddings."""

from .core.search_engine import VectorSearchEngine
from .core.embedders import CLIPEmbedder, OpenAIEmbedder
from .core.qdrant_client import QdrantManager
from .data.product_loader import ProductLoader
from .utils.config import Config
from .utils.logger import setup_logger

__version__ = "1.0.0"
__all__ = [
    "VectorSearchEngine",
    "CLIPEmbedder", 
    "OpenAIEmbedder",
    "QdrantManager",
    "ProductLoader",
    "Config",
    "setup_logger"
]
