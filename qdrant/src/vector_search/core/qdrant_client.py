"""Qdrant client wrapper for collection management and search."""

import logging
from typing import List, Dict, Any, Optional, Tuple
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, CollectionInfo,
    OptimizersConfigDiff, HnswConfigDiff, SearchRequest
)

logger = logging.getLogger(__name__)


class QdrantManager:
    """Manages Qdrant operations for collections, points, and searches."""
    
    def __init__(self, url: str, api_key: Optional[str] = None):
        self.url = url
        self.api_key = api_key
        
        if api_key:
            self.client = QdrantClient(url=url, api_key=api_key)
        else:
            self.client = QdrantClient(url=url)
        
        logger.info(f"Connected to Qdrant at {url}")
    
    def get_collections(self) -> List[str]:
        try:
            collections = self.client.get_collections()
            return [col.name for col in collections.collections]
        except Exception as e:
            logger.error(f"Failed to get collections: {e}")
            return []
    
    def collection_exists(self, collection_name: str) -> bool:
        return collection_name in self.get_collections()
    
    def get_collection_info(self, collection_name: str) -> Optional[CollectionInfo]:
        try:
            return self.client.get_collection(collection_name)
        except Exception as e:
            logger.error(f"Failed to get collection info for {collection_name}: {e}")
            return None
    
    def create_collection(
        self, 
        collection_name: str, 
        vector_size: int, 
        distance: Distance = Distance.COSINE
    ) -> bool:
        try:
            if self.collection_exists(collection_name):
                logger.warning(f"Collection {collection_name} already exists")
                return True
            
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=distance
                ),
                optimizers_config=OptimizersConfigDiff(
                    memmap_threshold=20000
                ),
                hnsw_config=HnswConfigDiff(
                    m=16,
                    ef_construct=100
                )
            )
            logger.info(f"Created collection {collection_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to create collection {collection_name}: {e}")
            return False
    
    def delete_collection(self, collection_name: str) -> bool:
        try:
            if not self.collection_exists(collection_name):
                logger.warning(f"Collection {collection_name} does not exist")
                return True
            
            self.client.delete_collection(collection_name)
            logger.info(f"Deleted collection {collection_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete collection {collection_name}: {e}")
            return False
    
    def recreate_collection(
        self, 
        collection_name: str, 
        vector_size: int, 
        distance: Distance = Distance.COSINE
    ) -> bool:
        self.delete_collection(collection_name)
        return self.create_collection(collection_name, vector_size, distance)
    
    def upsert_points(self, collection_name: str, points: List[PointStruct]) -> bool:
        try:
            self.client.upsert(collection_name=collection_name, points=points)
            logger.info(f"Upserted {len(points)} points to {collection_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to upsert points to {collection_name}: {e}")
            return False
    
    def search(
        self, 
        collection_name: str, 
        query_vector: List[float], 
        limit: int = 10,
        score_threshold: Optional[float] = None,
        filter_conditions: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        try:
            search_params = {
                "collection_name": collection_name,
                "query_vector": query_vector,
                "limit": limit
            }
            
            if score_threshold is not None:
                search_params["score_threshold"] = score_threshold
            
            if filter_conditions is not None:
                search_params["query_filter"] = filter_conditions
            
            results = self.client.search(**search_params)
            
            return [
                {
                    "id": result.id,
                    "score": result.score,
                    "payload": result.payload
                }
                for result in results
            ]
        except Exception as e:
            logger.error(f"Search failed in {collection_name}: {e}")
            return []
    
    def scroll_collection(
        self, 
        collection_name: str, 
        limit: int = 1000,
        offset: Optional[str] = None,
        with_payload: bool = True,
        with_vectors: bool = False
    ) -> Tuple[List[PointStruct], Optional[str]]:
        try:
            result = self.client.scroll(
                collection_name=collection_name,
                limit=limit,
                offset=offset,
                with_payload=with_payload,
                with_vectors=with_vectors
            )
            return result[0], result[1]  # points, next_offset
        except Exception as e:
            logger.error(f"Failed to scroll collection {collection_name}: {e}")
            return [], None
    
    def get_all_points(self, collection_name: str) -> List[Dict[str, Any]]:
        all_points = []
        offset = None
        
        while True:
            points, next_offset = self.scroll_collection(
                collection_name, 
                limit=1000, 
                offset=offset,
                with_payload=True,
                with_vectors=False
            )
            
            if not points:
                break
            
            for point in points:
                if point.payload:
                    all_points.append(point.payload)
            
            offset = next_offset
            if not offset:
                break
        
        logger.info(f"Retrieved {len(all_points)} points from {collection_name}")
        return all_points
