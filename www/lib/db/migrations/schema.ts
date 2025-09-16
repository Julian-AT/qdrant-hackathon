import {
  pgTable,
  foreignKey,
  uuid,
  timestamp,
  text,
  varchar,
  json,
  primaryKey,
  boolean,
} from "drizzle-orm/pg-core";

export const scene = pgTable(
  "Scene",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    createdAt: timestamp({ mode: "string" }).notNull(),
    title: text().notNull(),
    userId: uuid().notNull(),
    visibility: varchar().default("private").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "Scene_userId_User_id_fk",
    }),
  ],
);

export const messageV2 = pgTable(
  "Message_v2",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    sceneId: uuid().notNull(),
    role: varchar().notNull(),
    parts: json().notNull(),
    attachments: json().notNull(),
    createdAt: timestamp({ mode: "string" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.sceneId],
      foreignColumns: [scene.id],
      name: "Message_v2_sceneId_Scene_id_fk",
    }),
  ],
);

export const message = pgTable(
  "Message",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    sceneId: uuid().notNull(),
    role: varchar().notNull(),
    content: json().notNull(),
    createdAt: timestamp({ mode: "string" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.sceneId],
      foreignColumns: [scene.id],
      name: "Message_sceneId_Scene_id_fk",
    }),
  ],
);

export const user = pgTable("User", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  email: varchar({ length: 64 }).notNull(),
  password: varchar({ length: 64 }),
});

export const stream = pgTable(
  "Stream",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    sceneId: uuid().notNull(),
    createdAt: timestamp({ mode: "string" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.sceneId],
      foreignColumns: [scene.id],
      name: "Stream_sceneId_Scene_id_fk",
    }),
  ],
);

export const voteV2 = pgTable(
  "Vote_v2",
  {
    sceneId: uuid().notNull(),
    messageId: uuid().notNull(),
    isUpvoted: boolean().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.sceneId],
      foreignColumns: [scene.id],
      name: "Vote_v2_sceneId_Scene_id_fk",
    }),
    foreignKey({
      columns: [table.messageId],
      foreignColumns: [messageV2.id],
      name: "Vote_v2_messageId_Message_v2_id_fk",
    }),
    primaryKey({
      columns: [table.sceneId, table.messageId],
      name: "Vote_v2_sceneId_messageId_pk",
    }),
  ],
);

export const vote = pgTable(
  "Vote",
  {
    sceneId: uuid().notNull(),
    messageId: uuid().notNull(),
    isUpvoted: boolean().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.sceneId],
      foreignColumns: [scene.id],
      name: "Vote_sceneId_Scene_id_fk",
    }),
    foreignKey({
      columns: [table.messageId],
      foreignColumns: [message.id],
      name: "Vote_messageId_Message_id_fk",
    }),
    primaryKey({
      columns: [table.sceneId, table.messageId],
      name: "Vote_sceneId_messageId_pk",
    }),
  ],
);
