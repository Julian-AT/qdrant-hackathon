"use client";

import { useEffect, useCallback, useState, useMemo, memo } from "react";
// @ts-expect-error
import { Pannellum } from "pannellum-react";
import { useScene } from "@/hooks/use-scene";
import { Conversation, ConversationContent } from "./conversation";
import { useMessages } from "@/hooks/use-messages";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage, } from "@/lib/types";
import type { Vote } from "@/lib/db/schema";
import { base64ToBlobUrl, cn, isValidBase64Image } from "@/lib/utils";
import { GenerationProgress } from "./generation-progress";
import { usePathname } from "next/navigation";
import { AlertCircleIcon, GithubIcon, Home12Icon } from "hugeicons-react";
import Link from "next/link";
import { buttonVariants } from "./ui/button";
import SceneControlls from "./scene-controlls";
import type { IkeaProduct, SceneGenerationResult } from "@/lib/scene";
import { Session } from "next-auth";

interface SceneProps {
  sceneId: string;
  status: UseChatHelpers<ChatMessage>["status"];
  votes: Array<Vote> | undefined;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  session: Session;
}

const imageCache = new Map<string, string>();

const Scene = memo(({
  sceneId,
  status,
  votes,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  isArtifactVisible,
  session,
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ikeaFurniture, setIkeaFurniture] = useState<IkeaProduct[]>([]);

  const allMessageParts = useMemo(() =>
    messages.flatMap((message) => message.parts),
    [messages]
  );

  const sceneResults: SceneGenerationResult[] = useMemo(() =>
    allMessageParts
      .filter((part) => part.type === "data-sceneResult")
      .map((part) => part.data as SceneGenerationResult)
      .sort((a, b) => new Date(b.scene.createdAt).getTime() - new Date(a.scene.createdAt).getTime()),
    [allMessageParts]
  );

  const processImage = useCallback(async (sceneResults: SceneGenerationResult[]) => {
    if (!sceneResults || sceneResults.length === 0) {
      setImageUrl(null);
      return;
    }

    try {
      const latestSceneImage = sceneResults[0];
      setIkeaFurniture(latestSceneImage.metadata.ikeaProductsUsed);

      const imageData = latestSceneImage.scene.image;

      if (imageCache.has(imageData)) {
        setImageUrl(imageCache.get(imageData)!);
        return;
      }

      if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        imageCache.set(imageData, imageData);
        setImageUrl(imageData);
        return;
      }

      if (isValidBase64Image(imageData)) {
        const blobUrl = base64ToBlobUrl(imageData);
        console.log(
          "Successfully converted base64 image to blob URL:",
          `${blobUrl.substring(0, 50)}...`
        );
        imageCache.set(imageData, blobUrl);
        setImageUrl(blobUrl);
        return;
      }

      console.error("Invalid image format:", imageData.substring(0, 50));
      setImageUrl(null);
    } catch (error) {
      console.error("Error processing image:", error);
      setImageUrl(null);
    }
  }, []);

  useEffect(() => {
    processImage(sceneResults);
  }, [sceneResults, processImage]);

  const handlePanoramaLoad = useCallback(() => {
    console.log("panorama loaded");
  }, []);

  const handlePanoramaError = useCallback((err: any) => {
    console.log("Error", err);
  }, []);

  const handlePanoramaErrorCleared = useCallback(() => {
    console.log("Error Cleared");
  }, []);

  const _handleHotspotClick = useCallback((_evt: any, args: any) => {
    console.log(args.name);
  }, []);

  const shouldRenderScene = useMemo(() => {
    return typeof window !== "undefined" && pathname.startsWith("/scene/");
  }, [pathname]);

  const shouldShowLoading = useMemo(() => {
    return (scene.isLoading || scene.error || scene.isLoading) && !imageUrl;
  }, [scene.isLoading, scene.error, scene.isLoading, imageUrl]);

  const shouldShowNoImage = useMemo(() => {
    return !imageUrl && !scene.isLoading;
  }, [imageUrl, scene.isLoading]);

  if (!shouldRenderScene) {
    console.log("window is undefined or pathname does not start with /scene/");
    return null;
  }

  if (!scene || scene.id === "init" && !imageUrl) return null;

  if (shouldShowLoading || scene.isLoading) {
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

  if (shouldShowNoImage) {
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

  if (!imageUrl) {
    return null;
  }

  return (
    <div
      ref={messagesContainerRef}
      className="overflow-hidden absolute w-screen h-screen"
    >
      <SceneControlls ikeaFurniture={ikeaFurniture} messages={messages} session={session} />
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
            showControls={false}
            onLoad={handlePanoramaLoad}
            onError={handlePanoramaError}
            onErrorcleared={handlePanoramaErrorCleared}
          />
        </ConversationContent>
      </Conversation>
    </div>
  );
});

Scene.displayName = "Scene";

export default Scene;
