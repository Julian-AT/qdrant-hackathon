#!/usr/bin/env python3
"""Example script demonstrating the new vector search engine."""

import sys
from pathlib import Path

src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from vector_search import VectorSearchEngine, ProductLoader, Config, setup_logger

logger = setup_logger()

def main():
    print("🚀 Vector Search Engine Example")
    print("=" * 40)
    
    try:
        Config.validate()
        print("✅ Configuration validated")
        
        search_engine = VectorSearchEngine(
            qdrant_url=Config.QDRANT_URL,
            qdrant_api_key=Config.QDRANT_API_KEY,
            openai_api_key=Config.OPENAI_API_KEY
        )
        print("✅ Search engine initialized")
        
        products_file = Path("out/ikea_products.json")
        if products_file.exists():
            print(f"\n📦 Loading products from {products_file}")
            products = ProductLoader.load_from_json(str(products_file))
            print(f"✅ Loaded {len(products)} products")
            
            products_with_images = ProductLoader.filter_products_with_images(products)
            print(f"✅ {len(products_with_images)} products have valid images")
        else:
            print("❌ Products file not found. Please run the scraper first.")
            return 1
        
        print("\n📋 Available collections:")
        collections = search_engine.qdrant.get_collections()
        for collection in collections:
            info = search_engine.qdrant.get_collection_info(collection)
            if info:
                print(f"  - {collection}: {info.vectors_count} vectors")
            else:
                print(f"  - {collection}: (info unavailable)")
        
        if Config.TEXT_COLLECTION in collections:
            print(f"\n🔍 Searching by text in '{Config.TEXT_COLLECTION}':")
            results = search_engine.search_by_text(
                query_text="modern white sofa",
                collection_name=Config.TEXT_COLLECTION,
                limit=3
            )
            
            print(f"Found {len(results)} results:")
            for i, result in enumerate(results, 1):
                print(f"  {i}. {result['product_name']} (Score: {result['similarity_score']:.3f})")
        
        if Config.IMAGE_COLLECTION in collections:
            print(f"\n🖼️  Searching by image in '{Config.IMAGE_COLLECTION}':")
            sample_image = "https://www.ikea.com/us/en/images/products/ektorp-3-seat-sofa__0387760_pe559188_s5.jpg"
            results = search_engine.search_by_image(
                query_image_url=sample_image,
                collection_name=Config.IMAGE_COLLECTION,
                limit=3
            )
            
            print(f"Found {len(results)} similar images:")
            for i, result in enumerate(results, 1):
                print(f"  {i}. {result['product_name']} (Score: {result['similarity_score']:.3f})")
        
        print("\n✅ Example completed successfully!")
        print("\nTo build embeddings, run:")
        print("  poetry run vector-search build-text --source json --input-file out/ikea_products.json")
        print("  poetry run vector-search build-image --source qdrant --source-collection ikea_products")
        
        return 0
        
    except Exception as e:
        logger.error(f"Error in example: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
