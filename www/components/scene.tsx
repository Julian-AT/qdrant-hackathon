"use client";

import React, { useMemo, useEffect, useCallback } from "react";
// @ts-ignore
import { Pannellum } from "pannellum-react";
import { SceneHeader } from "./scene-header";
import { useScene } from "@/hooks/use-scene";
import { Conversation, ConversationContent } from "./conversation";
import { useMessages } from "@/hooks/use-messages";
import { UseChatHelpers } from "@ai-sdk/react";
import { ChatMessage, SceneResult } from "@/lib/types";
import { Vote } from "@/lib/db/schema";
import { base64ToBlobUrl, cn, isValidBase64Image } from "@/lib/utils";
import { GenerationProgress } from "./generation-progress";
import { usePathname } from "next/navigation";
import { AlertCircleIcon, GithubIcon, Home12Icon } from "hugeicons-react";
import Link from "next/link";
import { buttonVariants } from "./ui/button";

interface SceneProps {
  sceneId: string;
  status: UseChatHelpers<ChatMessage>["status"];
  votes: Array<Vote> | undefined;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  isArtifactVisible: boolean;
}

const Scene = ({
  sceneId,
  status,
  votes,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  isArtifactVisible,
}: SceneProps) => {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  } = useMessages({
    sceneId,
    status,
  });

  const { scene } = useScene();
  const pathname = usePathname();

  const allMessageParts = messages.flatMap((message) => message.parts);
  const sceneResults: SceneResult[] = allMessageParts
    .filter((part) => part.type === "data-sceneResult")
    .map((part) => part.data as SceneResult)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());


  const imageUrl = useMemo(() => {
    if (!sceneResults || sceneResults.length === 0) {
      console.log("No scene image available");
      return null;
    }

    try {
      const latestSceneImage = sceneResults[0];
      const blobUrl = base64ToBlobUrl(latestSceneImage.image);
      console.log(
        "Successfully converted image to blob URL:",
        blobUrl.substring(0, 50) + "..."
      );
      return blobUrl;
    } catch (error) {
      console.error("Error converting image:", error);
      return null;
    }
  }, [messages]);

  // useEffect(() => {
  //   return () => {
  //     if (imageUrl && imageUrl.startsWith("blob:")) {
  //       console.log("revoking image url", imageUrl);
  //       URL.revokeObjectURL(imageUrl);
  //     }
  //   };
  // }, [imageUrl]);

  const handlePanoramaLoad = useCallback(() => {
    console.log("panorama loaded");
  }, []);

  const handlePanoramaError = useCallback((err: any) => {
    console.log("Error", err);
  }, []);

  const handlePanoramaErrorCleared = useCallback(() => {
    console.log("Error Cleared");
  }, []);

  const handleHotspotClick = useCallback((evt: any, args: any) => {
    console.log(args.name);
  }, []);

  if (typeof window === "undefined" || !pathname.startsWith("/scene/")) {
    console.log("window is undefined or pathname does not start with /scene/");
    return null;
  }
  if (!scene || scene.id === "init" && !imageUrl) return null;

  console.log("Scene state:", {
    id: scene.id,
    progress: scene.progress,
    hasImage: !!scene.image,
    isLoading: scene.isLoading,
    error: scene.error,
    statusMessage: scene.statusMessage,
  });

  console.log("scene.ui", scene.ui);


  if ((scene.isLoading || scene.error) && !imageUrl) {
    return (
      <div className="w-full h-full">
        <GenerationProgress
          progress={scene.progress}
          statusMessage={scene.statusMessage}
          error={scene.error}
          ui={scene.ui}
        />
      </div>
    );
  }

  if (!imageUrl && !scene.isLoading) {
    return (
      <div className="flex items-center justify-center h-full z-10">
        <div className="text-center max-w-md">
          <div className="flex items-center justify-center">
            <AlertCircleIcon className="size-8 " />
          </div>
          <h3 className="text-lg font-semibold text-secondary-foreground mt-5">
            No panorama available
          </h3>
          <p className="text-muted-foreground text-sm mb-5">
            Please try again later or report the issue.
          </p>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline" }), "mx-1.5")}
          >
            <Home12Icon className="size-4" />
            Back Home
          </Link>
          <Link
            href="https://github.com/julian-at/qdrant-hackathon"
            className={cn(buttonVariants({ variant: "default" }), "mx-1.5")}
          >
            <GithubIcon className="size-4" />
            Report Issue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={messagesContainerRef}
      className="overflow-hidden absolute w-screen h-screen"
    >
      test
      <Conversation className="flex flex-col w-full h-full relative">
        <ConversationContent className="flex flex-col w-full h-full p-0">
          <Pannellum
            width="100%"
            height="100%"
            image={imageUrl}
            pitch={0}
            yaw={0}
            hfov={128}
            maxHfov={128}
            minHfov={64}
            autoLoad
            orientationOnByDefault={false}
            draggable
            keyboardZoom
            mouseZoom
            preview=""
            previewAuthor=""
            previewTitle=""
            hotspotDebug={false}
            onLoad={handlePanoramaLoad}
            onError={handlePanoramaError}
            onErrorcleared={handlePanoramaErrorCleared}
          />
        </ConversationContent>
      </Conversation>
    </div>
  );
};

export default Scene;
