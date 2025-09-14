# Vector Search Engine

A modular, production-ready vector search engine for IKEA products using Qdrant, CLIP, and OpenAI embeddings. Supports both text and image similarity search with a clean, extensible architecture.

## Features

- Text-to-text, image-to-image, and text-to-image search
- CLIP for images and text, OpenAI for text
- Clean separation of concerns with pluggable components
- Comprehensive error handling, logging, and configuration
- Command-line interface
- Efficient processing of large datasets
- Full integration with Qdrant vector database

## Architecture

```
src/vector_search/
├── core/                   # Core functionality
│   ├── search_engine.py    # Main search engine
│   ├── embedders.py        # CLIP and OpenAI embedders
│   └── qdrant_client.py    # Qdrant operations
├── data/                   # Data loading and processing
│   └── product_loader.py   # Product data utilities
├── utils/                  # Utilities
│   ├── config.py           # Configuration management
│   └── logger.py           # Logging setup
└── cli/                    # Command-line interface
    └── main.py             # CLI entry point
```

## Installation

### Using Poetry (Recommended)

```bash
cd qdrant
poetry install
```

### Using pip

```bash
cd qdrant
pip install -e .
```

### Optional: Scraping Dependencies

For web scraping functionality:

```bash
poetry install --extras scraping
```

## Configuration

Create a `.env` file in the project root:

```env
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key
OPENAI_API_KEY=your_openai_api_key
TEXT_COLLECTION=ikea_products
IMAGE_COLLECTION=furniture_images
BATCH_SIZE=32
DEFAULT_LIMIT=10
DEFAULT_THRESHOLD=0.7
```

## Usage

### CLI Interface

The main entry point is the `vector-search` command:

```bash
# Build text embeddings from JSON file
poetry run vector-search build-text --source json --input-file scripts/out/ikea_products.json

# Build image embeddings from existing Qdrant collection
poetry run vector-search build-image --source qdrant --source-collection ikea_products

# Search by text
poetry run vector-search search-text --query "modern white sofa"

# Search by image
poetry run vector-search search-image --query "https://example.com/sofa.jpg"

# List available collections
poetry run vector-search list-collections
```

### Python API

```python
from vector_search import VectorSearchEngine, ProductLoader

# Initialize search engine
search_engine = VectorSearchEngine(
    qdrant_url="http://localhost:6333",
    openai_api_key="your_key"
)

# Load products
products = ProductLoader.load_from_json("products.json")

# Build embeddings
search_engine.build_text_embeddings(products, "ikea_products")
search_engine.build_image_embeddings(products, "furniture_images")

# Search
results = search_engine.search_by_text("modern sofa", "ikea_products")
similar_images = search_engine.search_by_image("sofa.jpg", "furniture_images")
```

## Commands

### Build Commands

#### `build-text`
Build text embeddings using OpenAI or CLIP.

```bash
poetry run vector-search build-text [OPTIONS]

Options:
  --source {json,qdrant}     Source of products
  --input-file PATH          Input JSON file (for json source)
  --source-collection TEXT   Source collection (for qdrant source)
  --collection TEXT          Target collection name
  --batch-size INTEGER       Batch size for processing
```

#### `build-image`
Build image embeddings using CLIP.

```bash
poetry run vector-search build-image [OPTIONS]

Options:
  --source {json,qdrant}     Source of products
  --input-file PATH          Input JSON file (for json source)
  --source-collection TEXT   Source collection (for qdrant source)
  --collection TEXT          Target collection name
  --batch-size INTEGER       Batch size for processing
```

### Search Commands

#### `search-text`
Search using text queries.

```bash
poetry run vector-search search-text [OPTIONS]

Options:
  --query TEXT               Search query
  --collection TEXT          Collection to search
  --limit INTEGER            Number of results
  --threshold FLOAT          Similarity threshold
  --use-clip                 Use CLIP instead of OpenAI
```

#### `search-image`
Search using image URLs.

```bash
poetry run vector-search search-image [OPTIONS]

Options:
  --query TEXT               Image URL
  --collection TEXT          Collection to search
  --limit INTEGER            Number of results
  --threshold FLOAT          Similarity threshold
```

### Utility Commands

#### `list-collections`
List available Qdrant collections.

```bash
poetry run vector-search list-collections
```

## Development

### Project Structure

- **`core/`**: Core search engine functionality
- **`data/`**: Data loading and processing utilities
- **`utils/`**: Configuration and logging utilities
- **`cli/`**: Command-line interface

### Adding New Embedders

1. Create a new embedder class inheriting from `BaseEmbedder`
2. Implement the `get_embedding()` method
3. Add to the search engine initialization

### Adding New Data Sources

1. Add a new method to `ProductLoader`
2. Update the CLI to support the new source
3. Add appropriate validation

## Performance

- **Batch Processing**: Configurable batch sizes for optimal performance
- **GPU Support**: Automatic GPU detection for CLIP models
- **Memory Efficient**: Streaming data processing for large datasets
- **Parallel Processing**: Concurrent embedding generation where possible

## Troubleshooting

### Common Issues

1. **CUDA out of memory**: Reduce batch size or use CPU
2. **Image download failures**: Check image URLs and network connectivity
3. **Qdrant connection errors**: Verify QDRANT_URL and authentication
4. **Missing API keys**: Ensure required environment variables are set

### Debug Mode

Enable debug logging by setting the log level:

```python
import logging
logging.getLogger("vector_search").setLevel(logging.DEBUG)
```

## Examples

### Complete Workflow

```bash
# 1. Build text embeddings
poetry run vector-search build-text --source json --input-file data/products.json

# 2. Build image embeddings
poetry run vector-search build-image --source qdrant --source-collection ikea_products

# 3. Search by text
poetry run vector-search search-text --query "modern white sofa" --limit 5

# 4. Search by image
poetry run vector-search search-image --query "https://example.com/sofa.jpg" --limit 5
```

### Programmatic Usage

```python
from vector_search import VectorSearchEngine, ProductLoader, Config

# Load configuration
Config.validate()

# Initialize search engine
engine = VectorSearchEngine(
    qdrant_url=Config.QDRANT_URL,
    qdrant_api_key=Config.QDRANT_API_KEY,
    openai_api_key=Config.OPENAI_API_KEY
)

# Load and process products
products = ProductLoader.load_from_json("products.json")
products = ProductLoader.filter_products_with_images(products)

# Build embeddings
engine.build_text_embeddings(products, "ikea_products")
engine.build_image_embeddings(products, "furniture_images")

# Search
text_results = engine.search_by_text("modern sofa", "ikea_products")
image_results = engine.search_by_image("sofa.jpg", "furniture_images")
```