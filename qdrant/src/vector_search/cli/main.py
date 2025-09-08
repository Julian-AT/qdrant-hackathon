"""Main CLI interface for the vector search engine."""

import argparse
import sys
from pathlib import Path

from ..core.search_engine import VectorSearchEngine
from ..data.product_loader import ProductLoader
from ..utils.config import Config
from ..utils.logger import setup_logger

logger = setup_logger()


def build_text_embeddings(args):
    try:
        Config.validate()
        
        search_engine = VectorSearchEngine(
            qdrant_url=Config.QDRANT_URL,
            qdrant_api_key=Config.QDRANT_API_KEY,
            openai_api_key=Config.OPENAI_API_KEY
        )
        
        if args.source == "json":
            products = ProductLoader.load_from_json(args.input_file)
        else:
            products = ProductLoader.load_from_qdrant(
                search_engine.qdrant, args.source_collection
            )
        
        if not products:
            logger.error("No products loaded")
            return 1
        
        search_engine.qdrant.recreate_collection(
            args.collection, 
            Config.VECTOR_SIZE_TEXT
        )
        
        processed_count = search_engine.build_text_embeddings(
            products, 
            args.collection, 
            args.batch_size
        )
        
        logger.info(f"Successfully processed {processed_count} products")
        return 0
        
    except Exception as e:
        logger.error(f"Error building text embeddings: {e}")
        return 1


def build_image_embeddings(args):
    try:
        Config.validate()
        
        search_engine = VectorSearchEngine(
            qdrant_url=Config.QDRANT_URL,
            qdrant_api_key=Config.QDRANT_API_KEY,
            openai_api_key=Config.OPENAI_API_KEY
        )
        
        if args.source == "json":
            products = ProductLoader.load_from_json(args.input_file)
        else:
            products = ProductLoader.load_from_qdrant(
                search_engine.qdrant, args.source_collection
            )
        
        if not products:
            logger.error("No products loaded")
            return 1
        
        products = ProductLoader.filter_products_with_images(products)
        products = ProductLoader.clean_image_urls(products)
        
        search_engine.qdrant.recreate_collection(
            args.collection, 
            Config.VECTOR_SIZE_IMAGE
        )
        
        processed_count = search_engine.build_image_embeddings(
            products, 
            args.collection, 
            args.batch_size
        )
        
        logger.info(f"Successfully processed {processed_count} products")
        return 0
        
    except Exception as e:
        logger.error(f"Error building image embeddings: {e}")
        return 1


def search_text(args):
    try:
        Config.validate()
        
        search_engine = VectorSearchEngine(
            qdrant_url=Config.QDRANT_URL,
            qdrant_api_key=Config.QDRANT_API_KEY,
            openai_api_key=Config.OPENAI_API_KEY
        )
        
        results = search_engine.search_by_text(
            query_text=args.query,
            collection_name=args.collection,
            limit=args.limit,
            score_threshold=args.threshold,
            use_clip=args.use_clip
        )
        
        print(f"\nFound {len(results)} results for '{args.query}':")
        print("-" * 60)
        
        for i, result in enumerate(results, 1):
            print(f"{i}. {result['product_name']} (Score: {result['similarity_score']:.3f})")
            print(f"   Category: {result['category']}")
            print(f"   Price: ${result['price']} {result['currency']}")
            print(f"   Image: {result['image_url']}")
            print()
        
        return 0
        
    except Exception as e:
        logger.error(f"Error searching by text: {e}")
        return 1


def search_image(args):
    try:
        Config.validate()
        
        search_engine = VectorSearchEngine(
            qdrant_url=Config.QDRANT_URL,
            qdrant_api_key=Config.QDRANT_API_KEY,
            openai_api_key=Config.OPENAI_API_KEY
        )
        
        results = search_engine.search_by_image(
            query_image_url=args.query,
            collection_name=args.collection,
            limit=args.limit,
            score_threshold=args.threshold
        )
        
        print(f"\nFound {len(results)} similar images:")
        print("-" * 60)
        
        for i, result in enumerate(results, 1):
            print(f"{i}. {result['product_name']} (Score: {result['similarity_score']:.3f})")
            print(f"   Category: {result['category']}")
            print(f"   Price: ${result['price']} {result['currency']}")
            print(f"   Image: {result['image_url']}")
            print()
        
        return 0
        
    except Exception as e:
        logger.error(f"Error searching by image: {e}")
        return 1


def list_collections(args):
    try:
        Config.validate()
        
        search_engine = VectorSearchEngine(
            qdrant_url=Config.QDRANT_URL,
            qdrant_api_key=Config.QDRANT_API_KEY
        )
        
        collections = search_engine.qdrant.get_collections()
        
        if not collections:
            print("No collections found")
            return 0
        
        print("Available collections:")
        print("-" * 40)
        
        for collection_name in collections:
            info = search_engine.qdrant.get_collection_info(collection_name)
            if info:
                print(f"{collection_name}: {info.vectors_count} vectors")
            else:
                print(f"{collection_name}: (info unavailable)")
        
        return 0
        
    except Exception as e:
        logger.error(f"Error listing collections: {e}")
        return 1


def main():
    parser = argparse.ArgumentParser(
        description="Vector Search Engine for IKEA Products",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Build text embeddings from JSON file
  python -m vector_search.cli build-text --source json --input-file products.json

  # Build image embeddings from Qdrant collection
  python -m vector_search.cli build-image --source qdrant --source-collection ikea_products

  # Search by text
  python -m vector_search.cli search-text --query "modern white sofa"

  # Search by image
  python -m vector_search.cli search-image --query "https://example.com/sofa.jpg"

  # List collections
  python -m vector_search.cli list-collections
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Build text embeddings command
    build_text_parser = subparsers.add_parser("build-text", help="Build text embeddings")
    build_text_parser.add_argument("--source", choices=["json", "qdrant"], default="json",
                                 help="Source of products")
    build_text_parser.add_argument("--input-file", help="Input JSON file (for json source)")
    build_text_parser.add_argument("--source-collection", default="ikea_products",
                                 help="Source collection (for qdrant source)")
    build_text_parser.add_argument("--collection", default="ikea_products",
                                 help="Target collection name")
    build_text_parser.add_argument("--batch-size", type=int, default=Config.BATCH_SIZE,
                                 help="Batch size for processing")
    
    # Build image embeddings command
    build_image_parser = subparsers.add_parser("build-image", help="Build image embeddings")
    build_image_parser.add_argument("--source", choices=["json", "qdrant"], default="json",
                                  help="Source of products")
    build_image_parser.add_argument("--input-file", help="Input JSON file (for json source)")
    build_image_parser.add_argument("--source-collection", default="ikea_products",
                                  help="Source collection (for qdrant source)")
    build_image_parser.add_argument("--collection", default="furniture_images",
                                  help="Target collection name")
    build_image_parser.add_argument("--batch-size", type=int, default=Config.BATCH_SIZE,
                                  help="Batch size for processing")
    
    # Search text command
    search_text_parser = subparsers.add_parser("search-text", help="Search by text")
    search_text_parser.add_argument("--query", required=True, help="Search query")
    search_text_parser.add_argument("--collection", default=Config.TEXT_COLLECTION,
                                  help="Collection to search")
    search_text_parser.add_argument("--limit", type=int, default=Config.DEFAULT_LIMIT,
                                  help="Number of results")
    search_text_parser.add_argument("--threshold", type=float, default=Config.DEFAULT_THRESHOLD,
                                  help="Similarity threshold")
    search_text_parser.add_argument("--use-clip", action="store_true",
                                  help="Use CLIP instead of OpenAI for text search")
    
    # Search image command
    search_image_parser = subparsers.add_parser("search-image", help="Search by image")
    search_image_parser.add_argument("--query", required=True, help="Image URL")
    search_image_parser.add_argument("--collection", default=Config.IMAGE_COLLECTION,
                                   help="Collection to search")
    search_image_parser.add_argument("--limit", type=int, default=Config.DEFAULT_LIMIT,
                                   help="Number of results")
    search_image_parser.add_argument("--threshold", type=float, default=Config.DEFAULT_THRESHOLD,
                                   help="Similarity threshold")
    
    # List collections command
    subparsers.add_parser("list-collections", help="List available collections")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    if args.command == "build-text":
        return build_text_embeddings(args)
    elif args.command == "build-image":
        return build_image_embeddings(args)
    elif args.command == "search-text":
        return search_text(args)
    elif args.command == "search-image":
        return search_image(args)
    elif args.command == "list-collections":
        return list_collections(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
