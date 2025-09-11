import 'server-only';

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
    max,
    type SQL,
    sql,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
    user,
    scene,
    type User,
    message,
    vote,
    type DBMessage,
    type Scene,
    stream,
} from './schema';
import { generateUUID } from '@/lib/utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '@/lib/errors';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
    try {
        return await db.select().from(user).where(eq(user.email, email));
    } catch (error) {
        throw new ChatSDKError(
            'bad_request:database',
            'Failed to get user by email',
        );
    }
}

export async function createUser(email: string, password: string) {
    const hashedPassword = generateHashedPassword(password);

    try {
        return await db.insert(user).values({ email, password: hashedPassword });
    } catch (error) {
        throw new ChatSDKError('bad_request:database', 'Failed to create user');
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
    } catch (error) {
        throw new ChatSDKError(
            'bad_request:database',
            'Failed to create guest user',
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
    } catch (error) {
        console.log(error);
        throw new ChatSDKError('bad_request:database', 'Failed to save scene');
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
    } catch (error) {
        throw new ChatSDKError(
            'bad_request:database',
            'Failed to delete scene by id',
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

        const query = (whereCondition?: SQL<any>) =>
            db
                .select()
                .from(scene)
                .where(
                    whereCondition
                        ? and(whereCondition, eq(scene.userId, id))
                        : eq(scene.userId, id),
                )
                .orderBy(desc(scene.createdAt))
                .limit(extendedLimit);

        let filteredScenes: Array<Scene> = [];

        if (startingAfter) {
            const [selectedScene] = await db
                .select()
                .from(scene)
                .where(eq(scene.id, startingAfter))
                .limit(1);

            if (!selectedScene) {
                throw new ChatSDKError(
                    'not_found:database',
                    `Scene with id ${startingAfter} not found`,
                );
            }

            filteredScenes = await query(gt(scene.createdAt, selectedScene.createdAt));
        } else if (endingBefore) {
            const [selectedScene] = await db
                .select()
                .from(scene)
                .where(eq(scene.id, endingBefore))
                .limit(1);

            if (!selectedScene) {
                throw new ChatSDKError(
                    'not_found:database',
                    `Scene with id ${endingBefore} not found`,
                );
            }

            filteredScenes = await query(lt(scene.createdAt, selectedScene.createdAt));
        } else {
            filteredScenes = await query();
        }

        const hasMore = filteredScenes.length > limit;

        return {
            scenes: hasMore ? filteredScenes.slice(0, limit) : filteredScenes,
            hasMore,
        };
    } catch (error) {
        throw new ChatSDKError(
            'bad_request:database',
            'Failed to get scenes by user id',
        );
    }
}

export async function getSceneById({ id }: { id: string }) {
    try {
        const [selectedScene] = await db.select().from(scene).where(eq(scene.id, id));
        return selectedScene;
    } catch (error) {
        console.log(error);

        throw new ChatSDKError('bad_request:database', 'Failed to get scene by id');
    }
}

export async function saveMessages({
    messages,
}: {
    messages: Array<DBMessage>;
}) {
    try {
        return await db.insert(message).values(messages);
    } catch (error) {
        throw new ChatSDKError('bad_request:database', 'Failed to save messages');
    }
}

export async function getMessagesBySceneId({ id }: { id: string }) {
    try {
        return await db
            .select()
            .from(message)
            .where(eq(message.sceneId, id))
            .orderBy(asc(message.createdAt));
    } catch (error) {
        throw new ChatSDKError(
            'bad_request:database',
            'Failed to get messages by scene id',
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
    type: 'up' | 'down';
}) {
    try {
        const [existingVote] = await db
            .select()
            .from(vote)
            .where(and(eq(vote.messageId, messageId)));

        if (existingVote) {
            return await db
                .update(vote)
                .set({ isUpvoted: type === 'up' })
                .where(and(eq(vote.messageId, messageId), eq(vote.sceneId, sceneId)));
        }
        return await db.insert(vote).values({
            sceneId,
            messageId,
            isUpvoted: type === 'up',
        });
    } catch (error) {
        throw new ChatSDKError('bad_request:database', 'Failed to vote message');
    }
}

export async function getVotesBySceneId({ id }: { id: string }) {
    try {
        return await db.select().from(vote).where(eq(vote.sceneId, id));
    } catch (error) {
        throw new ChatSDKError(
            'bad_request:database',
            'Failed to get votes by scene id',
        );
    }
}

export async function getMessageById({ id }: { id: string }) {
    try {
        return await db.select().from(message).where(eq(message.id, id));
    } catch (error) {
        throw new ChatSDKError(
            'bad_request:database',
            'Failed to get message by id',
        );
    }
}

export async function getPublicScenes({ page, limit }: { page: number, limit: number }) {
    try {
        const scenes = await db
            .select({
                id: scene.id,
                title: scene.title,
                visibility: scene.visibility,
                createdAt: scene.createdAt,
                userId: scene.userId,
            })
            .from(scene)
            .where(eq(scene.visibility, 'private'))
            .orderBy(desc(scene.createdAt))
            .offset(page * limit)
            .limit(limit);

        const scenesWithMessages = await Promise.all(
            scenes.map(async (sceneData) => {
                const [latestMessage] = await db
                    .select({
                        parts: message.parts
                    })
                    .from(message)
                    .where(eq(message.sceneId, sceneData.id))
                    .orderBy(desc(message.createdAt))
                    .limit(1);

                return {
                    ...sceneData,
                    latestMessagePart: latestMessage?.parts || null
                };
            })
        );

        return scenesWithMessages;
    } catch (error) {
        console.log(error);

        throw new ChatSDKError(
            'bad_request:database',
            'Failed to get public scenes',
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
    } catch (error) {
        throw new ChatSDKError(
            'bad_request:database',
            'Failed to delete messages by scene id after timestamp',
        );
    }
}

export async function updateSceneVisiblityById({
    sceneId,
    visibility,
}: {
    sceneId: string;
    visibility: 'private' | 'public';
}) {
    try {
        return await db.update(scene).set({ visibility }).where(eq(scene.id, sceneId));
    } catch (error) {
        throw new ChatSDKError(
            'bad_request:database',
            'Failed to update scene visibility by id',
        );
    }
}

export async function getMessageCountByUserId({
    id,
    differenceInHours,
}: { id: string; differenceInHours: number }) {
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
                    eq(message.role, 'user'),
                ),
            )
            .execute();

        return stats?.count ?? 0;
    } catch (error) {
        throw new ChatSDKError(
            'bad_request:database',
            'Failed to get message count by user id',
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
    } catch (error) {
        throw new ChatSDKError(
            'bad_request:database',
            'Failed to create stream id',
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
    } catch (error) {
        throw new ChatSDKError(
            'bad_request:database',
            'Failed to get stream ids by scene id',
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
    } catch (error) {
        throw new ChatSDKError(
            'bad_request:database',
            'Failed to get all scenes',
        );
    }
}