# IKEA Products Vector Database

## Setup

```bash
cd qdrant
poetry install
```

Create `.env` file:
```bash
OPENAI_API_KEY=your_openai_api_key_here
QDRANT_URL=https://your-cluster-id.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key_here
```

## Usage

### 1. Get Product Categories
```bash
poetry run python scripts/get-categories.py
```

### 2. Get Product Details
```bash
poetry run python scripts/get-product-details.py
```

### 3. Generate Embeddings & Store in Vector DB
```bash
poetry run python src/qdrant/main.py
```

## What It Does

- Loads all IKEA products from JSON (currently 16,059 products)
- Generates OpenAI embeddings w/ OpenAI (text-embedding-3-small)
- Stores vectors in Qdrant Cloud with metadata
- Processes in batches of 10 products (takes about 1.5 hrs)
