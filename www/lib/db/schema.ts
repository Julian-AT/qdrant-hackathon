import type { InferSelectModel } from 'drizzle-orm';
import {
    pgTable,
    varchar,
    timestamp,
    json,
    uuid,
    text,
    primaryKey,
    foreignKey,
    boolean,
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    email: varchar('email', { length: 64 }).notNull(),
    password: varchar('password', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const scene = pgTable('Scene', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    userId: uuid('userId')
        .notNull()
        .references(() => user.id),
    visibility: varchar('visibility', { enum: ['public', 'private'] })
        .notNull()
        .default('private'),
});

export type Scene = InferSelectModel<typeof scene>;


// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable('Message', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    sceneId: uuid('sceneId')
        .notNull()
        .references(() => scene.id),
    role: varchar('role').notNull(),
    content: json('content').notNull(),
    createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    sceneId: uuid('sceneId')
        .notNull()
        .references(() => scene.id),
    role: varchar('role').notNull(),
    parts: json('parts').notNull(),
    attachments: json('attachments').notNull(),
    createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
    'Vote',
    {
        sceneId: uuid('sceneId')
            .notNull()
            .references(() => scene.id),
        messageId: uuid('messageId')
            .notNull()
            .references(() => messageDeprecated.id),
        isUpvoted: boolean('isUpvoted').notNull(),
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.sceneId, table.messageId] }),
        };
    },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
    'Vote_v2',
    {
        sceneId: uuid('sceneId')
            .notNull()
            .references(() => scene.id),
        messageId: uuid('messageId')
            .notNull()
            .references(() => message.id),
        isUpvoted: boolean('isUpvoted').notNull(),
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.sceneId, table.messageId] }),
        };
    },
);

export type Vote = InferSelectModel<typeof vote>;

export const stream = pgTable(
    'Stream',
    {
        id: uuid('id').notNull().defaultRandom(),
        sceneId: uuid('sceneId').notNull(),
        createdAt: timestamp('createdAt').notNull(),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.id] }),
        sceneRef: foreignKey({
            columns: [table.sceneId],
            foreignColumns: [scene.id],
        }),
    }),
);

export type Stream = InferSelectModel<typeof stream>;

