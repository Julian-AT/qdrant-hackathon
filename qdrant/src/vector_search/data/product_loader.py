"""Product data loading and processing utilities."""

import json
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class ProductLoader:
    @staticmethod
    def load_from_json(file_path: str) -> List[Dict[str, Any]]:
        try:
            logger.info(f"Loading products from {file_path}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            all_products = []
            
            if 'results' in data:
                logger.info(f"Found 'results' key with {len(data['results'])} categories")
                
                for category in data['results']:
                    if 'products' in category and category['products']:
                        category_name = category.get('category_name', '')
                        subcategory_name = category.get('subcategory_name', '')
                        
                        for product in category['products']:
                            product['category_name'] = category_name
                            product['subcategory_name'] = subcategory_name
                            all_products.append(product)
            else:
                logger.warning("No 'results' key found in JSON data")
                return []
            
            logger.info(f"Successfully loaded {len(all_products)} products")
            return all_products
            
        except FileNotFoundError:
            logger.error(f"File not found: {file_path}")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in {file_path}: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error loading products: {e}")
            return []
    
    @staticmethod
    def load_from_qdrant(qdrant_manager, collection_name: str) -> List[Dict[str, Any]]:
        try:
            logger.info(f"Loading products from Qdrant collection: {collection_name}")
            products = qdrant_manager.get_all_points(collection_name)
            logger.info(f"Successfully loaded {len(products)} products from Qdrant")
            return products
        except Exception as e:
            logger.error(f"Failed to load products from Qdrant: {e}")
            return []
    
    @staticmethod
    def filter_products_with_images(products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        filtered = []
        
        for product in products:
            image_url = product.get('main_image_url')
            if image_url and image_url.startswith(('http://', 'https://')):
                filtered.append(product)
        
        logger.info(f"Filtered to {len(filtered)} products with valid images")
        return filtered
    
    @staticmethod
    def clean_image_urls(products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        cleaned = []
        
        for product in products:
            cleaned_product = product.copy()
            image_url = product.get('main_image_url', '')
            
            if image_url.endswith('?f=xxs'):
                cleaned_product['main_image_url'] = image_url[:-6]
            
            cleaned.append(cleaned_product)
        
        return cleaned
