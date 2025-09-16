import { createUIMessageStream, JsonToSseTransformStream } from "ai";
import { auth, type UserType } from "@/app/(auth)/auth";
import {
  deleteSceneById,
  getSceneById,
  getMessageCountByUserId,
  getMessagesBySceneId,
  saveScene,
  saveMessages,
} from "@/lib/db/queries";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "@/app/(scene)/actions";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { postRequestBodySchema, type PostRequestBody } from "./schema";
import { ChatSDKError } from "@/lib/errors";
import {
  SceneGenerator,
  SceneGenerationError,
  type SceneGenerationConfig,
} from "@/lib/scene";
import type { ReactNode } from "react";

export const maxDuration = 300;

export async function POST(request: Request) {
  let requestBody: PostRequestBody;
  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    console.error("Invalid request body:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const userType: UserType = session.user.type;

  try {
    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return new ChatSDKError("offline:chat").toResponse();
  }

  const { id, message, selectedVisibilityType } = requestBody;
  let scene;

  try {
    scene = await getSceneById({ id });

    if (!scene) {
      const title = await generateTitleFromUserMessage({ message });
      const newScene = {
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      };
      await saveScene(newScene);
      scene = { ...newScene, createdAt: new Date() };
    } else if (scene.userId !== session.user.id) {
      return new ChatSDKError("forbidden:chat").toResponse();
    }
  } catch (error) {
    console.error("Scene setup failed:", error);
    return new ChatSDKError("offline:chat").toResponse();
  }

  try {
    await saveMessages({
      messages: [
        {
          sceneId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });
  } catch (error) {
    console.error("Failed to save user message:", error);
    return new ChatSDKError("offline:chat").toResponse();
  }

  const sceneGenerator = new SceneGenerator();

  const config: SceneGenerationConfig = SceneGenerator.validateConfig({
    includeIkeaFurniture: true,
    maxRetries: 3,
    imageWidth: 1440,
    imageHeight: 720,
    guidanceScale: 7.5,
    inferenceSteps: 20,
  });

  const stream = createUIMessageStream({
    execute: async ({ writer: dataStream }) => {
      try {
        console.log(`Starting scene generation for scene ${scene.id}`);

        const messagesFromDb = await getMessagesBySceneId({ id });
        const allMessages = [...convertToUIMessages(messagesFromDb), message];

        const onProgress = (
          progress: number,
          message: string,
          ui?: ReactNode,
        ) => {
          dataStream.write({
            type: "data-sceneProgress",
            data: { progress, message, ui },
            transient: true,
          });
        };

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
          try {
            const result = await sceneGenerator.generateScene(
              allMessages,
              scene.id,
              scene.title,
              config,
              onProgress,
            );

            dataStream.write({
              type: "data-sceneResult",
              data: result,
              transient: false,
            });

            return;
          } catch (error) {
            lastError = error as Error;
            console.error(`Scene generation attempt ${attempt} failed:`, error);

            if (attempt < config.maxRetries) {
              onProgress(
                10,
                `Retrying scene generation (attempt ${attempt + 1}/${config.maxRetries})...`,
              );
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * attempt),
              );
            }
          }
        }

        throw (
          lastError || new Error("Scene generation failed after all retries")
        );
      } catch (error) {
        console.error("Scene generation failed:", error);

        const errorMessage =
          error instanceof SceneGenerationError
            ? error.message
            : "Scene generation failed unexpectedly";

        dataStream.write({
          type: "data-sceneError",
          data: {
            message: errorMessage,
            code:
              error instanceof SceneGenerationError
                ? error.code
                : "UNKNOWN_ERROR",
          },
          transient: false,
        });

        throw error;
      }
    },
    generateId: generateUUID,
    onFinish: async ({ messages }) => {
      try {
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            sceneId: id,
          })),
        });
      } catch (error) {
        console.error("Failed to save generated messages:", error);
      }
    },
    onError: (error) => {
      console.error("Stream error:", error);
      return "Scene generation encountered an error. Please try again.";
    },
  });

  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const scene = await getSceneById({ id });
    if (scene.userId !== session.user.id) {
      return new ChatSDKError("forbidden:chat").toResponse();
    }

    const deletedScene = await deleteSceneById({ id });
    return Response.json(deletedScene, { status: 200 });
  } catch (error) {
    console.error("Scene deletion failed:", error);
    return new ChatSDKError("offline:chat").toResponse();
  }
}
