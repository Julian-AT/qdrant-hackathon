import type {
  CoreAssistantMessage,
  CoreToolMessage,
  UIMessage,
  UIMessagePart,
} from "ai";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError, type ErrorCode } from "@/lib/errors";
import type { ChatMessage, CustomUIDataTypes } from "@/lib/types";
import { formatISO } from "date-fns";
import { friendlyWords } from "friendlier-words";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const { code, cause } = await response.json();
      console.log(code, cause);

      throw new ChatSDKError(code as ErrorCode, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new ChatSDKError("offline:chat");
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
  return [];
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateShortUUID(): string {
  return generateUUID().slice(0, 6);
}

export function generateFriendlyUUID(): string {
  return friendlyWords() + "-" + generateShortUUID();
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === "user");
  return userMessages.at(-1);
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace("<has_function_call>", "");
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as "user" | "assistant" | "system",
    parts: message.parts as UIMessagePart<CustomUIDataTypes, any>[],
    metadata: {
      createdAt: formatISO(message.createdAt),
    },
  }));
}

export function getTextFromMessage(message: ChatMessage): string {
  return message.parts
    .filter((part: any) => part.type === "text")
    .map((part: any) => part.text)
    .join("");
}

/**
 * Utility functions for handling base64 image data
 */

/**
 * Converts a base64 string to a blob URL that can be used by image components
 * @param base64String - The base64 string (with or without data URL prefix)
 * @param mimeType - The MIME type of the image (defaults to 'image/png')
 * @returns A blob URL that can be used as an image source
 */
export const base64ToBlobUrl = (
  base64String: string,
  mimeType: string = "image/png",
): string => {
  if (typeof base64String !== "string" || !base64String) {
    throw new Error("Base64 string is required and must be a non-empty string");
  }

  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, "");

  try {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Error converting base64 to blob URL:", error);
    throw new Error("Invalid base64 string");
  }
};

/**
 * Checks if a string is a valid base64 image
 * @param str - The string to check
 * @returns True if the string is a valid base64 image
 */
export const isValidBase64Image = (str: unknown): boolean => {
  // Check if str is a string and not empty
  if (typeof str !== "string" || !str) return false;

  // Check if it's a data URL
  if (str.startsWith("data:image/")) {
    return true;
  }

  // Check if it's a valid base64 string
  try {
    const base64Data = str.replace(/^data:image\/[a-z]+;base64,/, "");
    atob(base64Data);
    return true;
  } catch {
    return false;
  }
};

/**
 * Extracts the MIME type from a base64 data URL
 * @param base64String - The base64 string with data URL prefix
 * @returns The MIME type or 'image/png' as default
 */
export const getMimeTypeFromBase64 = (base64String: string): string => {
  const match = base64String.match(/^data:([^;]+);base64,/);
  return match ? match[1] : "image/png";
};
