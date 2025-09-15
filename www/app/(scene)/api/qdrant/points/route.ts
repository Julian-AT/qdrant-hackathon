import { NextRequest, NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/qdrant-js";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const collection = searchParams.get("collection") || "furniture_images";
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000"), 1500);
    const sample = searchParams.get("sample") === "true";

    if (!process.env.QDRANT_URL) {
      return NextResponse.json(
        { error: "Qdrant not configured" },
        { status: 500 },
      );
    }

    const collectionInfo = await qdrant.getCollection(collection);
    if (!collectionInfo) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 },
      );
    }

    let points;

    if (sample) {
      const randomOffset = Math.floor(
        Math.random() *
          Math.max(0, (collectionInfo.vectors_count || 0) - limit),
      );
      const scrollResult = await qdrant.scroll(collection, {
        limit,
        offset: randomOffset,
        with_vector: true,
        with_payload: true,
      });
      points = scrollResult.points;
    } else {
      const scrollResult = await qdrant.scroll(collection, {
        limit,
        offset: 0,
        with_vector: true,
        with_payload: true,
      });
      points = scrollResult.points;
    }

    const processedPoints = points;

    const response = NextResponse.json({
      points: processedPoints,
      total: collectionInfo.vectors_count || 0,
      collection: collection,
    });

    response.headers.set("Cache-Control", "public, max-age=300");
    return response;
  } catch (error) {
    console.error("Error fetching points:", error);
    return NextResponse.json(
      { error: "Failed to fetch points" },
      { status: 500 },
    );
  }
}
