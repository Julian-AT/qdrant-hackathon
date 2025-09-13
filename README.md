
<div align="center">
  <a href="https://nextjs.org">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./assets/cover.png">
      <img alt="Interiorly logo" src="./assets/cover.png" width="100%">
    </picture>
  </a>
  <h1>Interiorly</h1>
  <p>Generate your dream home with natural language. Powered by Qdrant.</p>
<a href="#"><img alt="Website" src="https://img.shields.io/badge/Website-Interiorly-purple?style=for-the-badge&labelColor=000000&logo=nextdotjs"></a>
<a href="#"><img alt="AI Model" src="https://img.shields.io/badge/Huggingface-Interiorly%20Panorama-yellow?style=for-the-badge&labelColor=000000&logo=huggingface"></a>
<a href="#license"><img alt="License" src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge&labelColor=000000&logo=github"></a>
</div>

## What is Interiorly?

Interiorly demonstrates the power of Qdrant vector search by combining natural language interior design with intelligent furniture matching. You describe your dream room in plain English, get a 360° panoramic view, and discover real IKEA products that match what's in your generated scene.

Built specifically for the Qdrant hackathon, this project showcases visual vector search to bridge the gap between AI-generated imagery and real-world shopping.

## How it works

The project is split into three main parts:

**Frontend (`www/`)**  
A Next.js web app where users chat with AI to describe their room ideas. The system primarily uses Mistral 8B for analyzing user inputs and directing the workflow, with support for GPT-5 as well. The AI generates 360° panoramic images that you can explore interactively. You can save scenes, browse what others have created, and get furniture suggestions.

**Qdrant Vector Pipeline (`qdrant/`)**  
The heart of the system - a specialized Qdrant database that makes furniture discovery intelligent:

*Visual Search Database (CLIP embeddings)*: Each product image is processed through CLIP to create visual embeddings. When computer vision identifies a chair in a generated panorama, the system can do reverse image search to find the most visually similar IKEA products. It's like Google Lens but specifically for furniture matching.

The system also includes a text search database with OpenAI embeddings for future semantic search capabilities, but the current workflow focuses on the visual pipeline for precise furniture identification and replacement.

The visual pipeline works like this: [Florence-2-Large](https://replicate.com/lucataco/florence-2-large) segments furniture pieces from the generated panoramas, those segments get queried against the CLIP vector database to find similar IKEA products, then [SeedDream-4](https://replicate.com/bytedance/seedream-4) injects the actual IKEA furniture back into the panoramic image - giving you a photorealistic room with real products you can actually buy.

**Custom Model (`model/`)**  
Training code for the specialized 360° interior panorama generation model. Most AI image models struggle with equirectangular projections needed for panoramic views, so this model was fine-tuned specifically for interior spaces.

The Qdrant visual search pipeline:

1. **Panorama Generation**: Custom model creates a 360° interior scene from user description
2. **Furniture Segmentation**: Florence-2-Large identifies and segments individual furniture pieces in the panorama
3. **Vector Search**: Each furniture segment gets embedded using CLIP and queried against the Qdrant image database to find visually similar IKEA products
4. **Furniture Injection**: SeedDream-4 replaces the AI-generated furniture with actual IKEA products, maintaining the room's lighting and perspective

![Pipeline Diagram](./assets/architecture.png)

This approach demonstrates Qdrant's strength in visual similarity search - the CLIP embeddings enable precise furniture matching that feels natural and contextually appropriate. The vector database performance allows real-time querying during the segmentation and injection process.

## Technology

**Frontend**: Next.js with React Three Fiber for 3D panorama viewing, Tailwind for styling  
**Backend**: PostgreSQL database, Cloudflare R2 for image storage  
**AI Models**: Custom panorama generation, Mistral 8B (primary) + GPT-5 support for chat, CLIP for embeddings, Florence-2-Large for segmentation, SeedDream-4 for furniture injection  
**Vector Search**: Qdrant database with CLIP image embeddings for visual furniture similarity matching (additional text embedding database available for future features)  
**Data**: Python scripts using BeautifulSoup and Selenium for scraping IKEA catalog

## License

MIT License - see [LICENSE](LICENSE) file for details.
