#!/usr/bin/env python3
"""Migration script to help transition from old structure to new modular structure."""

import json
import sys
from pathlib import Path

def migrate_products():
    print("🔄 Migrating products to new structure...")
    
    products_file = Path("out/ikea_products.json")
    if not products_file.exists():
        print("❌ Products file not found at out/ikea_products.json")
        return False
    
    try:
        with open(products_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"✅ Found {data.get('total_products', 'unknown')} products")
        print("✅ Products file is ready for use with new structure")
        return True
        
    except Exception as e:
        print(f"❌ Error loading products: {e}")
        return False

def show_migration_commands():
    print("\n📋 Migration Commands:")
    print("=" * 50)
    
    print("\n1. Build text embeddings (old → new):")
    print("   OLD: python src/qdrant/main.py")
    print("   NEW: poetry run vector-search build-text --source json --input-file out/ikea_products.json")
    
    print("\n2. Build image embeddings (old → new):")
    print("   OLD: python scripts/clip-image-embeddings.py --action build")
    print("   NEW: poetry run vector-search build-image --source qdrant --source-collection ikea_products")
    
    print("\n3. Search by text (old → new):")
    print("   OLD: python scripts/similarity_search.py")
    print("   NEW: poetry run vector-search search-text --query 'your query'")
    
    print("\n4. Search by image (old → new):")
    print("   OLD: python scripts/clip-image-embeddings.py --action search-image --query-image 'url'")
    print("   NEW: poetry run vector-search search-image --query 'url'")

def main():
    print("🚀 Vector Search Engine Migration")
    print("=" * 40)
    
    if not Path("pyproject.toml").exists():
        print("❌ Please run this script from the qdrant directory")
        return 1
    
    if not migrate_products():
        return 1
    
    show_migration_commands()
    
    print("\n✅ Migration guide completed!")
    print("\nNext steps:")
    print("1. Install dependencies: poetry install")
    print("2. Set up environment variables in .env file")
    print("3. Use the new commands shown above")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
