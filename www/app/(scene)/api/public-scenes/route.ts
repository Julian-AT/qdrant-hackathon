import { getPublicScenes } from "@/lib/db/queries";
import { Scene } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");

  if (!page) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter page is required.",
    ).toResponse();
  }

  const pageNumber = parseInt(page);
  if (isNaN(pageNumber) || pageNumber < 0) {
    return new ChatSDKError(
      "bad_request:api",
      "Invalid page parameter. Must be a non-negative number.",
    ).toResponse();
  }

  try {
    const publicScenes = await getPublicScenes({ page: pageNumber, limit: 12 });

    const hasMore = publicScenes.length === 12;
    const nextPage = hasMore ? pageNumber + 1 : null;
    const previousPage = pageNumber > 0 ? pageNumber - 1 : null;

    return Response.json(
      {
        publicScenes,
        hasMore,
        nextPage,
        previousPage,
      } as {
        publicScenes: Scene[];
        hasMore: boolean;
        nextPage: number | null;
        previousPage: number | null;
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching public scenes:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to fetch public scenes.",
    ).toResponse();
  }
}
