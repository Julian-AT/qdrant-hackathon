"use client";

import { useEffect } from "react";
import { useState } from "react";
import { cn, fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Attachment, ChatMessage } from "@/lib/types";
import { VisibilityType } from "./visibility-selector";
import { Session } from "next-auth";
import { useSceneVisibility } from "@/hooks/use-chat-visibility";
import useSWR, { useSWRConfig } from "swr";
import { useChat } from "@ai-sdk/react";
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
import { HeroPill } from "./hero-pill";
import { Home01Icon } from "hugeicons-react";
import NoiseBackground from "./noise-background";
import CommunityScenes from "./community-scenes";
import PersonalScenes from "./personal-scenes";

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
  const { visibilityType } = useSceneVisibility({
    sceneId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>("");

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
      api: "/api/scene",
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
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/scene/${id}`);
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
      <div className="relative flex flex-col min-w-0 h-full overflow-hidden max-w-dvw">
        {messages.length > 0 && (
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
        )}

        <>
          <div
            className={cn(
              "relative items-center flex flex-col gap-2 px-3 mx-auto w-full bg-transparent md:pb-48 md:max-w-4xl z-[3] border-t-0 justify-center mt-32",
              messages.length > 0 &&
                "absolute left-0 right-0 bottom-0 flex items-center md:pb-6 z-20",
            )}
          >
            {messages.length === 0 && (
              <>
                <div className="container mx-auto mt-12 px-4 text-center mb-12">
                  <HeroPill
                    text="16k+ Ikea Products Qdrant DB"
                    icon={<Home01Icon className="size-4" />}
                    className="opacity-90"
                  />
                  <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight text-secondary-foreground">
                    Generate your dream Home
                  </h1>
                  <p className="mx-auto max-w-2xl text-lg text-primary/75">
                    Generate interactive and customizable 360° home scenes.
                    Powered by Qdrant.
                  </p>
                </div>
              </>
            )}
            {!isReadonly && status !== "submitted" && (
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
          {messages.length === 0 && (
            <>
              <div className="absolute inset-0 pointer-events-none max-h-dvh z-[1]">
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-64 translate-y-1/2 animate-fade-in-up">
                  <div className="w-[125rem] h-[125rem] rounded-full bg-gradient-to-t from-pink-500 to-sky-500/90 blur-[100px] absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                  <div className="w-[100rem] h-[100rem] rounded-full bg-gradient-to-t from-purple-600 to-orange-500/90 blur-[70px] absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                  <div className="w-[60rem] h-[60rem] rounded-full bg-gradient-to-t from-purple-700/40 to-pink-700 blur-[50px] absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                  <div className="w-[45rem] h-[45rem] rounded-full bg-gradient-to-t from-purple-800/50 to-orange-800/50 blur-[30px] absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                </div>
              </div>
              <div className="relative z-[3] p-3 flex flex-col gap-3">
                <PersonalScenes isMinified />
                <CommunityScenes isMinified />
              </div>
            </>
          )}
        </>
      </div>
    </>
  );
}
