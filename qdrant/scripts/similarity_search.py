#!/usr/bin/env python3
"""
Simple similarity search script for Qdrant vector database.

This script demonstrates how to:
1. Connect to Qdrant
2. Search for similar vectors
3. Display search results
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import SearchRequest

load_dotenv()

def connect_to_qdrant():
    """Connect to Qdrant database."""
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")
    
    if not qdrant_url:
        print("QDRANT_URL environment variable is required")
        sys.exit(1)
    
    try:
        if qdrant_api_key:
            client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        else:
            client = QdrantClient(url=qdrant_url)
        
        collections = client.get_collections()
        print(f"Connected to Qdrant. Found {len(collections.collections)} collections")
        return client
    except Exception as e:
        print(f"Failed to connect to Qdrant: {e}")
        sys.exit(1)

def list_collections(client):
    """List available collections."""
    try:
        collections = client.get_collections()
        if not collections.collections:
            print("No collections found in the database.")
            return []
        
        print("\nAvailable collections:")
        for i, collection in enumerate(collections.collections, 1):
            info = client.get_collection(collection.name)
            print(f"  {i}. {collection.name} ({info.vectors_count} vectors)")
        
        return [col.name for col in collections.collections]
    except Exception as e:
        print(f"Error listing collections: {e}")
        return []

def search_similar_vectors(client, collection_name, query_vector, limit=5):
    """Search for similar vectors in the specified collection."""
    try:
        print(f"\nSearching for similar vectors in '{collection_name}'...")
        print(f"Query vector dimensions: {len(query_vector)}")
        
        results = client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=limit
        )
        
        print(f"Found {len(results)} similar vectors:")
        print("-" * 60)
        
        for i, result in enumerate(results, 1):
            print(f"{i}. Score: {result.score:.4f}")
            print(f"   ID: {result.id}")
            
            if result.payload:
                print("   Payload:")
                for key, value in result.payload.items():
                    if key == 'text' and len(str(value)) > 100:
                        print(f"     {key}: {str(value)[:100]}...")
                    else:
                        print(f"     {key}: {value}")
            print()
        
        return results
    except Exception as e:
        print(f"Search failed: {e}")
        return []

def search_by_text(client, collection_name, text, limit=5):
    """Search for similar vectors using text (requires OpenAI API key)."""
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        print("OpenAI API key not found. Cannot generate embeddings from text.")
        print("   Please set OPENAI_API_KEY environment variable or provide a vector directly.")
        return []
    
    try:
        import openai
        
        print(f"Generating embedding for text: '{text[:50]}{'...' if len(text) > 50 else ''}'")
        
        response = openai.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        query_vector = response.data[0].embedding
        
        print(f"Generated {len(query_vector)}-dimensional embedding")
        
        return search_similar_vectors(client, collection_name, query_vector, limit)
        
    except ImportError:
        print("OpenAI package not installed. Install with: pip install openai")
        return []
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return []

def main():
    """Main function."""
    print("Qdrant Similarity Search")
    print("=" * 40)
    
    client = connect_to_qdrant()
    
    collections = list_collections(client)
    if not collections:
        print("No collections available for search.")
        return
    
    if len(collections) == 1:
        collection_name = collections[0]
        print(f"Using collection: {collection_name}")
    else:
        print("\nSelect a collection to search in:")
        for i, name in enumerate(collections, 1):
            print(f"  {i}. {name}")
        
        try:
            choice = int(input("\nEnter collection number: ")) - 1
            if 0 <= choice < len(collections):
                collection_name = collections[choice]
            else:
                print("Invalid choice. Using first collection.")
                collection_name = collections[0]
        except (ValueError, KeyboardInterrupt):
            print("\nUsing first collection.")
            collection_name = collections[0]
    
    print(f"\nSearching in collection: {collection_name}")
    
    print("\nSearch options:")
    print("1. Search by text (will generate embedding)")
    print("2. Search by vector (provide comma-separated numbers)")
    
    try:
        choice = input("\nEnter choice (1 or 2): ").strip()
        
        if choice == "1":
            text = input("Enter search text: ").strip()
            if text:
                limit = int(input("Enter number of results (default 5): ") or "5")
                search_by_text(client, collection_name, text, limit)
            else:
                print("No text provided.")
        
        elif choice == "2":
            vector_input = input("Enter vector (comma-separated numbers): ").strip()
            if vector_input:
                try:
                    query_vector = [float(x.strip()) for x in vector_input.split(",")]
                    limit = int(input("Enter number of results (default 5): ") or "5")
                    search_similar_vectors(client, collection_name, query_vector, limit)
                except ValueError:
                    print("Invalid vector format. Please enter comma-separated numbers.")
            else:
                print("No vector provided.")
        
        else:
            print("Invalid choice.")
    
    except KeyboardInterrupt:
        print("\n\nSearch cancelled.")
    except Exception as e:
        print(f"Error during search: {e}")

if __name__ == "__main__":
    main()
