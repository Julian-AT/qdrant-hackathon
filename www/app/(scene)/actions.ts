"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import {
  deleteMessagesBySceneIdAfterTimestamp,
  getMessageById,
  updateSceneVisiblityById,
} from "@/lib/db/queries";
import type { VisibilityType } from "@/components/visibility-selector";
import { myProvider } from "@/lib/ai/providers";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel("title-model"),
    system: `\n
    - generate a short, engaging room description that captures the essence of the user's message
    - keep it under 60 characters for optimal display
    - use descriptive adjectives that evoke atmosphere and style
    - format as a flowing phrase like "Cozy Rustic Kitchen" or "Minimalist Modern Bedroom"
    - focus on creating visual appeal and emotional connection
    - avoid generic terms, prefer specific and evocative language
    - do not use quotes, colons, or unnecessary punctuation`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesBySceneIdAfterTimestamp({
    sceneId: message.sceneId,
    timestamp: message.createdAt,
  });
}

export async function updateSceneVisibility({
  sceneId,
  visibility,
}: {
  sceneId: string;
  visibility: VisibilityType;
}) {
  await updateSceneVisiblityById({ sceneId, visibility });
}
