"""Main search engine combining Qdrant operations with embedding generation."""

import logging
from typing import List, Dict, Any, Optional, Union
from tqdm import tqdm

from .qdrant_client import QdrantManager
from .embedders import CLIPEmbedder, OpenAIEmbedder, BaseEmbedder

logger = logging.getLogger(__name__)


class VectorSearchEngine:
    def __init__(
        self, 
        qdrant_url: str, 
        qdrant_api_key: Optional[str] = None,
        openai_api_key: Optional[str] = None
    ):
        self.qdrant = QdrantManager(qdrant_url, qdrant_api_key)
        
        self.clip_embedder = CLIPEmbedder()
        self.openai_embedder = OpenAIEmbedder(openai_api_key) if openai_api_key else None
        logger.info("Vector search engine initialized")
    
    def build_text_embeddings(
        self, 
        products: List[Dict[str, Any]], 
        collection_name: str = "ikea_products",
        batch_size: int = 32
    ) -> int:
        if not self.openai_embedder:
            raise ValueError("OpenAI API key required for text embeddings")
        
        points = []
        processed_count = 0
        failed_count = 0
        
        logger.info(f"Processing {len(products)} products for text embeddings...")
        
        for i, product in enumerate(tqdm(products, desc="Processing products")):
            text = self._create_text_representation(product)
            if not text.strip():
                failed_count += 1
                continue
            
            embedding = self.openai_embedder.get_embedding(text)
            if not embedding:
                failed_count += 1
                continue
            
            point = self._create_point(product, embedding, text)
            points.append(point)
            processed_count += 1
            
            if len(points) >= batch_size:
                if self.qdrant.upsert_points(collection_name, points):
                    points = []
                else:
                    points = []
        
        if points:
            self.qdrant.upsert_points(collection_name, points)
        
        logger.info(f"Text embedding process completed: {processed_count} successful, {failed_count} failed")
        return processed_count
    
    def build_image_embeddings(
        self, 
        products: List[Dict[str, Any]], 
        collection_name: str = "furniture_images",
        batch_size: int = 32
    ) -> int:
        points = []
        processed_count = 0
        failed_count = 0
        
        logger.info(f"Processing {len(products)} products for image embeddings...")
        
        for i, product in enumerate(tqdm(products, desc="Processing products")):
            image_url = product.get("main_image_url")
            if not image_url:
                logger.warning(f"Product {product.get('product_id', 'unknown')} has no image URL")
                failed_count += 1
                continue
            
            if image_url.endswith('?f=xxs'):
                image_url = image_url[:-6]
            
            embedding = self.clip_embedder.get_image_embedding(image_url)
            if not embedding:
                failed_count += 1
                continue
            
            point = self._create_point(
                product, 
                embedding, 
                text=None,
                additional_payload={"clip_image_url": image_url}
            )
            points.append(point)
            processed_count += 1
            
            if len(points) >= batch_size:
                if self.qdrant.upsert_points(collection_name, points):
                    points = []
                else:
                    points = []
        
        if points:
            self.qdrant.upsert_points(collection_name, points)
        
        logger.info(f"Image embedding process completed: {processed_count} successful, {failed_count} failed")
        return processed_count
    
    def search_by_text(
        self, 
        query_text: str, 
        collection_name: str,
        limit: int = 10,
        score_threshold: float = 0.7,
        use_clip: bool = False
    ) -> List[Dict[str, Any]]:
        embedder = self.clip_embedder if use_clip else self.openai_embedder
        
        if not embedder:
            raise ValueError(f"Embedder not available for {'CLIP' if use_clip else 'OpenAI'} search")
        
        if use_clip:
            query_embedding = embedder.get_text_embedding(query_text)
        else:
            query_embedding = embedder.get_embedding(query_text)
        
        if not query_embedding:
            logger.error("Failed to generate query embedding")
            return []
        
        results = self.qdrant.search(
            collection_name=collection_name,
            query_vector=query_embedding,
            limit=limit,
            score_threshold=score_threshold
        )
        
        return self._format_search_results(results)
    
    def search_by_image(
        self, 
        query_image_url: str, 
        collection_name: str,
        limit: int = 10,
        score_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        query_embedding = self.clip_embedder.get_image_embedding(query_image_url)
        
        if not query_embedding:
            logger.error("Failed to generate query embedding")
            return []
        
        results = self.qdrant.search(
            collection_name=collection_name,
            query_vector=query_embedding,
            limit=limit,
            score_threshold=score_threshold
        )
        
        return self._format_search_results(results)
    
    def _create_text_representation(self, product: Dict[str, Any]) -> str:
        text_parts = []
        
        if product.get('product_name'):
            text_parts.append(f"Product: {product['product_name']}")
        
        if product.get('category_name'):
            text_parts.append(f"Category: {product['category_name']}")
        
        if product.get('subcategory_name'):
            text_parts.append(f"Subcategory: {product['subcategory_name']}")
        
        if product.get('description'):
            text_parts.append(f"Description: {product['description']}")
        
        if product.get('price'):
            text_parts.append(f"Price: {product['price']} {product.get('currency', '')}")
        
        if product.get('rating_info'):
            rating = product['rating_info']
            if rating.get('rating'):
                text_parts.append(f"Rating: {rating['rating']}/5")
            if rating.get('review_count'):
                text_parts.append(f"Reviews: {rating['review_count']}")
        
        return " ".join(text_parts)
    
    def _create_point(
        self, 
        product: Dict[str, Any], 
        embedding: List[float], 
        text: Optional[str] = None,
        additional_payload: Optional[Dict] = None
    ) -> Any:
        from qdrant_client.models import PointStruct
        
        payload = {
            'product_id': product.get('product_id'),
            'product_number': product.get('product_number'),
            'product_name': product.get('product_name'),
            'category_name': product.get('category_name'),
            'subcategory_name': product.get('subcategory_name'),
            'description': product.get('description'),
            'price': product.get('price'),
            'currency': product.get('currency'),
            'url': product.get('url'),
            'main_image_url': product.get('main_image_url'),
            'main_image_alt': product.get('main_image_alt'),
            'rating_info': product.get('rating_info'),
            'quick_facts': product.get('quick_facts'),
            'variants': product.get('variants'),
        }
        
        if text:
            payload['text'] = text
        
        if additional_payload:
            payload.update(additional_payload)
        
        # Generate a valid UUID for Qdrant
        import uuid
        point_id = str(uuid.uuid4())
        
        return PointStruct(
            id=point_id,
            vector=embedding,
            payload=payload
        )
    
    def _format_search_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        formatted_results = []
        
        for result in results:
            if result.get('payload'):
                formatted_results.append({
                    "product_id": result['payload'].get("product_id"),
                    "product_name": result['payload'].get("product_name"),
                    "category": result['payload'].get("category_name"),
                    "description": result['payload'].get("description"),
                    "price": result['payload'].get("price"),
                    "currency": result['payload'].get("currency"),
                    "image_url": result['payload'].get("clip_image_url") or result['payload'].get("main_image_url"),
                    "similarity_score": result['score']
                })
        
        return formatted_results
