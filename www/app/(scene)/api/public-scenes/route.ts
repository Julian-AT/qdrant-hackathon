import { getPublicScenes } from "@/lib/db/queries";
import { Scene } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');

    if (!page) {
        return new ChatSDKError(
            'bad_request:api',
            'Parameter page is required.',
        ).toResponse();
    }

    const publicScenes = await getPublicScenes({ page: parseInt(page), limit: 12 });

    if (publicScenes.length === 0) {
        return new ChatSDKError(
            'not_found:api',
            'No public scenes found.',
        ).toResponse();
    }

    const hasMore = publicScenes.length === 12;
    const nextPage = hasMore ? parseInt(page) + 1 : null;
    const previousPage = parseInt(page) > 0 ? parseInt(page) - 1 : null;


    return Response.json({ publicScenes, hasMore, nextPage, previousPage } as { publicScenes: Scene[], hasMore: boolean, nextPage: number | null, previousPage: number | null }, { status: 200 });
}