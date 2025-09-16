import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  user,
  scene,
  type User,
  message,
  vote,
  type DBMessage,
  stream,
} from "./schema";
import { generateUUID } from "@/lib/utils";
import { generateHashedPassword } from "./utils";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "@/lib/errors";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email",
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create guest user",
    );
  }
}

export async function saveScene({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(scene).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch {
    console.log(error);
    throw new ChatSDKError("bad_request:database", "Failed to save scene");
  }
}

export async function deleteSceneById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.sceneId, id));
    await db.delete(message).where(eq(message.sceneId, id));
    await db.delete(stream).where(eq(stream.sceneId, id));

    const [scenesDeleted] = await db
      .delete(scene)
      .where(eq(scene.id, id))
      .returning();
    return scenesDeleted;
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete scene by id",
    );
  }
}

export async function getScenesByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<unknown>) =>
      db
        .select({
          id: scene.id,
          title: scene.title,
          visibility: scene.visibility,
          createdAt: scene.createdAt,
          userId: scene.userId,
        })
        .from(scene)
        .where(
          whereCondition
            ? and(whereCondition, eq(scene.userId, id))
            : eq(scene.userId, id),
        )
        .orderBy(desc(scene.createdAt))
        .limit(extendedLimit);

    let filteredScenes: Array<{
      id: string;
      title: string;
      visibility: VisibilityType;
      createdAt: Date;
      userId: string;
    }> = [];

    if (startingAfter) {
      const [selectedScene] = await db
        .select()
        .from(scene)
        .where(eq(scene.id, startingAfter))
        .limit(1);

      if (!selectedScene) {
        throw new ChatSDKError(
          "not_found:database",
          `Scene with id ${startingAfter} not found`,
        );
      }

      filteredScenes = await query(
        gt(scene.createdAt, selectedScene.createdAt),
      );
    } else if (endingBefore) {
      const [selectedScene] = await db
        .select()
        .from(scene)
        .where(eq(scene.id, endingBefore))
        .limit(1);

      if (!selectedScene) {
        throw new ChatSDKError(
          "not_found:database",
          `Scene with id ${endingBefore} not found`,
        );
      }

      filteredScenes = await query(
        lt(scene.createdAt, selectedScene.createdAt),
      );
    } else {
      filteredScenes = await query();
    }

    const hasMore = filteredScenes.length > limit;
    const scenesToReturn = hasMore
      ? filteredScenes.slice(0, limit)
      : filteredScenes;

    const scenesWithLatestMessage = await Promise.all(
      scenesToReturn.map(async (sceneData) => {
        const [latestMessage] = await db
          .select({
            parts: message.parts,
          })
          .from(message)
          .where(eq(message.sceneId, sceneData.id))
          .orderBy(desc(message.createdAt))
          .limit(1);

        return {
          ...sceneData,
          latestMessagePart: latestMessage?.parts || null,
        };
      }),
    );

    return {
      scenes: scenesWithLatestMessage,
      hasMore,
    };
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get scenes by user id",
    );
  }
}

export async function getSceneById({ id }: { id: string }) {
  try {
    const [selectedScene] = await db
      .select()
      .from(scene)
      .where(eq(scene.id, id));
    return selectedScene;
  } catch {
    console.log(error);

    throw new ChatSDKError("bad_request:database", "Failed to get scene by id");
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function getMessagesBySceneId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.sceneId, id))
      .orderBy(asc(message.createdAt));
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by scene id",
    );
  }
}

export async function voteMessage({
  sceneId,
  messageId,
  type,
}: {
  sceneId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.sceneId, sceneId)));
    }
    return await db.insert(vote).values({
      sceneId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesBySceneId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.sceneId, id));
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by scene id",
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id",
    );
  }
}

function isValidImageData(imageData: unknown): boolean {
  if (!imageData || typeof imageData !== "string") {
    return false;
  }

  const trimmed = imageData.trim();
  if (trimmed === "" || trimmed === '""' || trimmed === "''") {
    return false;
  }

  if (trimmed.startsWith("data:image/")) {
    const base64Data = trimmed.split(",")[1];
    if (!base64Data || base64Data.trim() === "") {
      return false;
    }
    try {
      atob(base64Data);
      return true;
    } catch {
      return false;
    }
  }

  if (trimmed.startsWith("https://pub-") && trimmed.includes(".r2.dev")) {
    return true;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return true;
  }

  return false;
}

function hasValidImage(parts: unknown[]): boolean {
  if (!Array.isArray(parts) || parts.length === 0) {
    return false;
  }

  const firstPart = parts[0];
  if (!firstPart || typeof firstPart !== "object") {
    return false;
  }

  if (firstPart.type === "data-sceneResult" && firstPart.data?.image) {
    return isValidImageData(firstPart.data.image);
  }

  if (firstPart.type === "file" && firstPart.url) {
    return isValidImageData(firstPart.url);
  }

  return false;
}

export async function getPublicScenes({
  page,
  limit,
}: {
  page: number;
  limit: number;
}) {
  try {
    const offset = page * limit;
    const batchSize = limit * 3;
    const validScenes: Array<{
      id: string;
      title: string;
      visibility: VisibilityType;
      createdAt: Date;
      userId: string;
      latestMessagePart: unknown[];
    }> = [];
    let currentOffset = offset;

    while (validScenes.length < limit) {
      const scenes = await db
        .select({
          id: scene.id,
          title: scene.title,
          visibility: scene.visibility,
          createdAt: scene.createdAt,
          userId: scene.userId,
        })
        .from(scene)
        .where(eq(scene.visibility, "public"))
        .orderBy(desc(scene.createdAt))
        .offset(currentOffset)
        .limit(batchSize);

      if (scenes.length === 0) {
        break;
      }

      for (const sceneData of scenes) {
        if (validScenes.length >= limit) break;

        const [latestMessage] = await db
          .select({
            parts: message.parts,
          })
          .from(message)
          .where(eq(message.sceneId, sceneData.id))
          .orderBy(desc(message.createdAt))
          .limit(1);

        if (
          !latestMessage?.parts ||
          !Array.isArray(latestMessage.parts) ||
          !hasValidImage(latestMessage.parts)
        ) {
          continue;
        }

        validScenes.push({
          ...sceneData,
          latestMessagePart: latestMessage.parts,
        });
      }

      if (scenes.length < batchSize) {
        break;
      }

      currentOffset += batchSize;
    }

    return validScenes;
  } catch {
    console.log(error);

    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get public scenes",
    );
  }
}

export async function deleteMessagesBySceneIdAfterTimestamp({
  sceneId,
  timestamp,
}: {
  sceneId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.sceneId, sceneId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.sceneId, sceneId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.sceneId, sceneId), inArray(message.id, messageIds)),
        );
    }
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by scene id after timestamp",
    );
  }
}

export async function updateSceneVisiblityById({
  sceneId,
  visibility,
}: {
  sceneId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db
      .update(scene)
      .set({ visibility })
      .where(eq(scene.id, sceneId));
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update scene visibility by id",
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(scene, eq(message.sceneId, scene.id))
      .where(
        and(
          eq(scene.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user"),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id",
    );
  }
}

export async function createStreamId({
  streamId,
  sceneId,
}: {
  streamId: string;
  sceneId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, sceneId, createdAt: new Date() });
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id",
    );
  }
}

export async function getStreamIdsBySceneId({ sceneId }: { sceneId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.sceneId, sceneId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by scene id",
    );
  }
}

export async function getAllScenes() {
  try {
    return await db
      .select({
        id: scene.id,
        title: scene.title,
        visibility: scene.visibility,
        createdAt: scene.createdAt,
        userId: scene.userId,
      })
      .from(scene)
      .orderBy(desc(scene.createdAt));
  } catch {
    throw new ChatSDKError("bad_request:database", "Failed to get all scenes");
  }
}
