import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateFriendlyUUID, generateUUID } from '@/lib/utils';
import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { friendlyWords } from "friendlier-words"
import AnimatedGradientBackground from '@/components/animated-gradient-background';
import CommunityScenes from '@/components/community-scenes';

export default async function Page() {
    const session = await auth();

    if (!session) {
        redirect('/api/auth/guest');
    }

    const id = generateUUID();

    const cookieStore = await cookies();
    const modelIdFromCookie = cookieStore.get('chat-model');

    if (!modelIdFromCookie) {
        return (
            <div className='relative bg-background/70'>
                <Chat
                    key={id}
                    id={id}
                    initialMessages={[]}
                    initialChatModel={DEFAULT_CHAT_MODEL}
                    initialVisibilityType="private"
                    isReadonly={false}
                    session={session}
                    autoResume={false}
                />
                <DataStreamHandler />
            </div>
        );
    }

    return (
        <>
            <Chat
                key={id}
                id={id}
                initialMessages={[]}
                initialChatModel={modelIdFromCookie.value}
                initialVisibilityType="private"
                isReadonly={false}
                session={session}
                autoResume={false}
            />
            <DataStreamHandler />
        </>
    );
}