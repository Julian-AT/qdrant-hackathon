"""
Generates embeddings for ikea products and stores them in qdrant.
"""

import json
import os
import asyncio
import uuid
from pathlib import Path
from typing import List, Dict, Any
from dotenv import load_dotenv
import openai
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    CollectionInfo,
    OptimizersConfigDiff,
    HnswConfigDiff
)
from tqdm import tqdm

load_dotenv()

class IKEAProductEmbedder:
    def __init__(self):
        """Initialize the IKEA Product Embedder with OpenAI and Qdrant clients."""
        print("Checking environment variables...")
        
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            print("OPENAI_API_KEY environment variable is missing")
            raise ValueError("OPENAI_API_KEY environment variable is required")
        print("OPENAI_API_KEY found")
        
        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        if not qdrant_url:
            print("QDRANT_URL environment variable is missing")
            raise ValueError("QDRANT_URL environment variable is required")
        print(f"QDRANT_URL found: {qdrant_url}")
        
        if qdrant_api_key:
            print("QDRANT_API_KEY found")
            self.qdrant_client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        else:
            print("⚠️  QDRANT_API_KEY not found, connecting without authentication")
            self.qdrant_client = QdrantClient(url=qdrant_url)
        
        print("Testing Qdrant connection...")
        try:
            collections = self.qdrant_client.get_collections()
            print(f"Successfully connected to Qdrant. Found {len(collections.collections)} collections")
        except Exception as e:
            print(f"❌ Failed to connect to Qdrant: {e}")
            raise
        
        self.collection_name = "ikea_products"
        self.embedding_model = "text-embedding-3-small"
        self.vector_size = 1536
        
        print("✓ IKEA Product Embedder initialization completed")  
        
    def load_products(self, file_path: str) -> List[Dict[str, Any]]:
        """Load IKEA products from JSON file."""
        try:
            print(f"Opening file: {file_path}")
            with open(file_path, 'r', encoding='utf-8') as f:
                print("Reading JSON data...")
                data = json.load(f)
                print(f"JSON loaded successfully. File size: {len(str(data))} characters")
            
            print("Parsing JSON structure...")
            all_products = []
            total_products = 0
            
            if 'results' in data:
                print(f"Found 'results' key with {len(data['results'])} items")
                for i, category in enumerate(data['results']):
                    if 'products' in category and category['products']:
                        print(f"Category {i+1}: '{category.get('category_name', 'Unknown')}' has {len(category['products'])} products")
                        for product in category['products']:
                            product['category_name'] = category.get('category_name', '')
                            product['subcategory_name'] = category.get('subcategory_name', '')
                            all_products.append(product)
                        total_products += len(category['products'])
                    else:
                        print(f"Category {i+1}: '{category.get('category_name', 'Unknown')}' has no products")
            else:
                print("No 'results' key found in JSON data")
                print(f"Available keys: {list(data.keys())}")
                return []
            
            print(f"Successfully loaded {len(all_products)} products from {file_path}")
            print(f"Total products in data: {data.get('total_products', 'unknown')}")
            print(f"Categories: {data.get('total_categories', 'unknown')}")
            print(f"Subcategories: {data.get('total_subcategories', 'unknown')}")
            
            return all_products
        except FileNotFoundError:
            print(f"Error: File {file_path} not found")
            return []
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in {file_path}: {e}")
            return []
        except Exception as e:
            print(f"Unexpected error loading products: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def create_text_for_embedding(self, product: Dict[str, Any]) -> str:
        """Create a text representation of the product for embedding generation."""
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
        
        if product.get('quick_facts'):
            if isinstance(product['quick_facts'], list):
                text_parts.append(f"Features: {', '.join(product['quick_facts'])}")
            else:
                text_parts.append(f"Features: {product['quick_facts']}")
        
        if product.get('variants'):
            variant_count = len(product['variants'])
            if variant_count > 1:
                text_parts.append(f"Available in {variant_count} variants")
        
        if product.get('main_image_alt'):
            alt_text = product['main_image_alt']
            if '"' in alt_text:
                import re
                dim_match = re.search(r'(\d+(?:\s*\d*/\d*)?)\s*x\s*(\d+(?:\s*\d*/\d*)?)\s*x\s*(\d+(?:\s*\d*/\d*)?)', alt_text)
                if dim_match:
                    width, depth, height = dim_match.groups()
                    text_parts.append(f"Dimensions: {width}\" x {depth}\" x {height}\"")
        
        return " ".join(text_parts)
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for the given text using OpenAI."""
        try:
            response = openai.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return None
    
    def create_collection(self):
        """Create the collection in Qdrant if it doesn't exist."""
        try:
            collections = self.qdrant_client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if self.collection_name not in collection_names:
                print(f"Creating collection: {self.collection_name}")
                
                self.qdrant_client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.vector_size,
                        distance=Distance.COSINE
                    ),
                    optimizers_config=OptimizersConfigDiff(
                        memmap_threshold=20000
                    ),
                    hnsw_config=HnswConfigDiff(
                        m=16,
                        ef_construct=100
                    )
                )
                print(f"Collection '{self.collection_name}' created")
            else:
                print(f"Collection '{self.collection_name}' already exists")
                
        except Exception as e:
            print(f"Error creating collection: {e}")
            raise
    
    def delete_collection(self):
        """Delete the collection if it exists."""
        try:
            collections = self.qdrant_client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if self.collection_name in collection_names:
                print(f"Deleting collection: {self.collection_name}")
                self.qdrant_client.delete_collection(self.collection_name)
                print(f"Collection '{self.collection_name}' deleted")
            else:
                print(f"Collection '{self.collection_name}' does not exist")
                
        except Exception as e:
            print(f"Error deleting collection: {e}")
    
    async def process_products(self, products: List[Dict[str, Any]], batch_size: int = 10):
        """Process products in batches to generate embeddings and store in Qdrant."""
        points = []
        
        print(f"Processing {len(products)} products in batches of {batch_size}")
        
        for i in tqdm(range(0, len(products), batch_size), desc="Processing batches"):
            batch = products[i:i + batch_size]
            batch_points = []
            
            for product in batch:
                text = self.create_text_for_embedding(product)
                if not text.strip():
                    continue
                
                embedding = await self.generate_embedding(text)
                if embedding is None:
                    continue
                
                point_id = str(uuid.uuid4())
                
                main_image_url = product.get('main_image_url', '')
                if main_image_url and main_image_url.endswith('?f=xxs'):
                    main_image_url = main_image_url[:-6]  
                
                point = PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        'product_id': product.get('product_id'),
                        'product_number': product.get('product_number'),
                        'product_name': product.get('product_name'),
                        'category_name': product.get('category_name'),
                        'subcategory_name': product.get('subcategory_name'),
                        'description': product.get('description'),
                        'price': product.get('price'),
                        'currency': product.get('currency'),
                        'url': product.get('url'),
                        'main_image_url': main_image_url,
                        'main_image_alt': product.get('main_image_alt'),
                        'rating_info': product.get('rating_info'),
                        'quick_facts': product.get('quick_facts'),
                        'variants': product.get('variants'),
                        'text': text  
                    }
                )
                batch_points.append(point)
            
            if batch_points:
                try:
                    self.qdrant_client.upsert(
                        collection_name=self.collection_name,
                        points=batch_points
                    )
                    points.extend(batch_points)
                except Exception as e:
                    print(f"Error storing batch {i//batch_size + 1}: {e}")
            
            await asyncio.sleep(0.1)
        
        print(f"Successfully processed {len(points)} products")
        return points
    
    def get_collection_info(self) -> CollectionInfo:
        """Get information about the collection."""
        try:
            return self.qdrant_client.get_collection(self.collection_name)
        except Exception as e:
            print(f"Error getting collection info: {e}")
            return None

async def main():
    """Main function to run the IKEA product embedding process."""
    print("Starting IKEA products embedding process...")
    
    try:
        print("Initializing IKEA Product Embedder...")
        embedder = IKEAProductEmbedder()
        print("✓ IKEA Product Embedder initialized successfully")
        
        script_dir = Path(__file__).parent.parent.parent
        products_file = script_dir / "scripts" / "out" / "ikea_products.json"

        print(f"Looking for products file at: {products_file}")
        print(f"Current working directory: {os.getcwd()}")
        print(f"Script directory: {script_dir}")
        print(f"Products file exists: {products_file.exists()}")
        
        if not products_file.exists():
            print(f"Error: Products file not found at {products_file}")
            print("Please ensure the file exists at the expected path.")
            return
        
        print("Loading products from JSON file...")
        products = embedder.load_products(str(products_file))
        if not products:
            print("No products loaded. Exiting.")
            return
        
        print(f"Loaded {len(products)} products")
        
        print("Creating Qdrant collection...")
        embedder.create_collection()
        print("Collection created/verified")
        
        print("Processing products and generating embeddings...")
        await embedder.process_products(products)
        print("Products processed successfully")
        
        print("Getting collection information...")
        collection_info = embedder.get_collection_info()
        if collection_info:
            print(f"\nCollection '{embedder.collection_name}' info:")
            print(f"Vector count: {collection_info.vectors_count}")
            print(f"Vector size: {collection_info.config.params.vectors.size}")
            print(f"Distance: {collection_info.config.params.vectors.distance}")
        
        print("products embedding process completed successfully!")
        
    except Exception as e:
        print(f"Error in main process: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    asyncio.run(main())
