import { auth } from '@/app/(auth)/auth';
import { getSceneById, getVotesBySceneId, voteMessage } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
        return new ChatSDKError(
            'bad_request:api',
            'Parameter chatId is required.',
        ).toResponse();
    }

    const session = await auth();

    if (!session?.user) {
        return new ChatSDKError('unauthorized:vote').toResponse();
    }

    const chat = await getSceneById({ id: chatId });

    if (!chat) {
        return new ChatSDKError('not_found:chat').toResponse();
    }

    if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:vote').toResponse();
    }

    const votes = await getVotesBySceneId({ id: chatId });

    return Response.json(votes, { status: 200 });
}

export async function PATCH(request: Request) {
    const {
        sceneId,
        messageId,
        type,
    }: { sceneId: string; messageId: string; type: 'up' | 'down' } =
        await request.json();

    if (!sceneId || !messageId || !type) {
        return new ChatSDKError(
            'bad_request:api',
            'Parameters chatId, messageId, and type are required.',
        ).toResponse();
    }

    const session = await auth();

    if (!session?.user) {
        return new ChatSDKError('unauthorized:vote').toResponse();
    }

    const chat = await getSceneById({ id: sceneId });

    if (!chat) {
        return new ChatSDKError('not_found:vote').toResponse();
    }

    if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:vote').toResponse();
    }

    await voteMessage({
        sceneId,
        messageId,
        type: type,
    });

    return new Response('Message voted', { status: 200 });
}