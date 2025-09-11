import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { Chat } from '@/components/chat';
import { getSceneById, getMessagesBySceneId } from '@/lib/db/queries';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { convertToUIMessages } from '@/lib/utils';
import NoiseBackground from '@/components/noise-background';

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    const chat = await getSceneById({ id });

    if (!chat) {
        notFound();
    }

    const session = await auth();

    if (!session) {
        redirect('/api/auth/guest');
    }

    if (chat.visibility === 'private') {
        if (!session.user) {
            return notFound();
        }

        if (session.user.id !== chat.userId) {
            return notFound();
        }
    }

    const messagesFromDb = await getMessagesBySceneId({
        id,
    });

    const uiMessages = convertToUIMessages(messagesFromDb);

    const cookieStore = await cookies();
    const chatModelFromCookie = cookieStore.get('chat-model');

    if (!chatModelFromCookie) {
        return (
            <>
                <NoiseBackground />
                <Chat
                    id={chat.id}
                    initialMessages={uiMessages}
                    initialChatModel={DEFAULT_CHAT_MODEL}
                    initialVisibilityType={chat.visibility}
                    isReadonly={session?.user?.id !== chat.userId}
                    session={session}
                    autoResume={true}
                />
                <DataStreamHandler />
            </>
        );
    }

    return (
        <>
            <Chat
                id={chat.id}
                initialMessages={uiMessages}
                initialChatModel={chatModelFromCookie.value}
                initialVisibilityType={chat.visibility}
                isReadonly={session?.user?.id !== chat.userId}
                session={session}
                autoResume={true}
            />
            <DataStreamHandler />
        </>
    );
}