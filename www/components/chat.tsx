"use client";

import { useEffect } from "react";
import { useState } from "react";
import { cn, fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Attachment, ChatMessage } from "@/lib/types";
import { VisibilityType } from "./visibility-selector";
import { Session } from "next-auth";
import { useSceneVisibility } from "@/hooks/use-chat-visibility";
import useSWR, { useSWRConfig } from "swr";
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from "ai";
import { useDataStream } from "./data-stream-provider";
import { unstable_serialize } from "swr/infinite";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Vote } from "@/lib/db/schema";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { getSceneHistoryPaginationKey } from "./sidebar-history";
import { ChatSDKError } from "@/lib/errors";
import { MultimodalInput } from "./multimodal-input";
import Scene from "@/components/scene";
import CommunityScenes from "./community-scenes";
import { Navbar } from "./navbar";
import Image from "next/image";
import GrainImage from "@/public/grain.png"
import { useTheme } from "next-themes";
import { HeroPill } from "./hero-pill";
import { HomeIcon } from "lucide-react";
import { Home01Icon, Sofa01Icon } from "hugeicons-react"
import { Footer } from "./footer";

export function Chat({
    id,
    initialMessages,
    initialChatModel,
    initialVisibilityType,
    isReadonly,
    session,
    autoResume,
}: {
    id: string;
    initialMessages: ChatMessage[];
    initialChatModel: string;
    initialVisibilityType: VisibilityType;
    isReadonly: boolean;
    session: Session;
    autoResume: boolean;
}) {


    const { theme } = useTheme();
    const { visibilityType } = useSceneVisibility({
        sceneId: id,
        initialVisibilityType,
    });

    const { mutate } = useSWRConfig();
    const { setDataStream, dataStream } = useDataStream();

    const [input, setInput] = useState<string>('');

    const {
        messages,
        setMessages,
        sendMessage,
        status,
        stop,
        regenerate,
        resumeStream,
    } = useChat<ChatMessage>({
        id,
        messages: initialMessages,
        experimental_throttle: 100,
        generateId: generateUUID,
        transport: new DefaultChatTransport({
            api: '/api/scene',
            fetch: fetchWithErrorHandlers,
            prepareSendMessagesRequest({ messages, id, body }) {
                return {
                    body: {
                        id,
                        message: messages.at(-1),
                        selectedChatModel: initialChatModel,
                        selectedVisibilityType: visibilityType,
                        ...body,
                    },
                };
            },
        }),
        onData: (dataPart) => {
            setDataStream((ds) => (ds ? [...ds, dataPart] : []));
        },
        onFinish: () => {
            mutate(unstable_serialize(getSceneHistoryPaginationKey));
        },
        onError: (error) => {
            if (error instanceof ChatSDKError) {
                toast.error(error.message);
            }
        },
    });

    const searchParams = useSearchParams();
    const query = searchParams.get('query');

    const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

    useEffect(() => {
        if (query && !hasAppendedQuery) {
            sendMessage({
                role: 'user' as const,
                parts: [{ type: 'text', text: query }],
            });

            setHasAppendedQuery(true);
            window.history.replaceState({}, '', `/scene/${id}`);
        }
    }, [query, sendMessage, hasAppendedQuery, id]);

    const { data: votes } = useSWR<Array<Vote>>(
        messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
        fetcher,
    );

    const [attachments, setAttachments] = useState<Array<Attachment>>([]);

    useAutoResume({
        autoResume,
        initialMessages,
        resumeStream,
        setMessages,
    });

    return (
        <>
            {theme === "dark" && (
                <div className="absolute inset-0 w-full h-full opacity-50 pointer-events-none " style={{ backgroundImage: `url(${GrainImage.src})`, backgroundRepeat: 'repeat' }} />
            )}
            <div className="flex flex-col min-w-0 h-full">
                <Scene
                    sceneId={id}
                    status={status}
                    votes={votes}
                    messages={messages}
                    setMessages={setMessages}
                    regenerate={regenerate}
                    isReadonly={isReadonly}
                    isArtifactVisible={false}
                />

                {/* <div className="flex flex-col items-end absolute left-0 right-0 -top-10 blur-xl z-0 ">

                    <div className="h-[10rem] rounded-full w-[60rem] z-1 bg-gradient-to-b blur-[6rem] from-purple-600 to-sky-600"></div>
                    <div className="h-[10rem] rounded-full w-[90rem] z-1 bg-gradient-to-b blur-[6rem] from-pink-900 to-yellow-400"></div>
                    <div className="h-[10rem] rounded-full w-[60rem] z-1 bg-gradient-to-b blur-[6rem] from-yellow-600 to-sky-500"></div>
                </div> */}
                <div className={cn("relative items-center flex flex-col gap-2 px-3 mx-auto w-full bg-transparent md:pb-48 md:max-w-4xl z-[1] border-t-0 justify-center ",
                    messages.length > 0 && "absolute left-0 right-0 bottom-0 flex items-center md:pb-6"
                )}>
                    {messages.length === 0 && (
                        <div className="container mx-auto mt-12 px-4 text-center mb-12">
                            <HeroPill text="16k+ Ikea Products Qdrant DB" icon={<Home01Icon className="size-4" />} className="opacity-90" />
                            <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight text-secondary-foreground">
                                Generate your dream Home
                            </h1>
                            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                                Generate interactive and customizable 360° home scenes. Powered by QDrant.
                            </p>
                        </div>
                    )}
                    {!isReadonly && (
                        <MultimodalInput
                            sceneId={id}
                            input={input}
                            setInput={setInput}
                            status={status}
                            stop={stop}
                            attachments={attachments}
                            setAttachments={setAttachments}
                            messages={messages}
                            setMessages={setMessages}
                            sendMessage={sendMessage}
                            selectedVisibilityType={visibilityType}
                            selectedModelId={initialChatModel}
                        />
                    )}
                </div>
                {messages.length === 0 && <CommunityScenes />}
            </div>
        </>
    );
}
